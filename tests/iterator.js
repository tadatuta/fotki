var sinon = require('sinon'),
    should = require('should'),
    Iterator = require('../lib/iterator'),
    vow = require('vow'),
    testPromise = function(promise, cb, done) {
        promise.then(function() {
            try {
                cb.apply(this, arguments);
                done();
            } catch(e) {
                done(e);
            }
        }, function(err) {
            done(new Error(JSON.stringify(err)));
        });
    };

describe('Iterator\'s method', function() {
    /**
     * Pseudo server api method: returns some data for 0, 1, 2(hasNext = false), and 404 for else.
     * @param {Number} index
     * @returns {Promise}
     */
    var getMethod = function(index) {
        var defer = vow.defer();

        if(index >= 3) defer.reject({ statusCode : '404' });
        else defer.resolve(['response ' + index, index < 2]);

        return defer.promise();
    };

    describe('_get', function() {
        var method = sinon.spy(getMethod),
            iterator = new Iterator(method),
            request;

        describe('should return', function() {
            it('error if no arguments', function() {
                iterator._get.should.throw();
            });

            it('promise if arguments are defined', function() {
                iterator._get(0).should.be.a.Promise();
            });
        });

        it('should execute method', function(done) {
            request = iterator._get(0);

            testPromise(request, function() {
                method.called.should.be.true();
            }, done);
        });

        it('should cache promise', function() {
            iterator._cache[0].should.be.equal(request);
        });

        it('should use cache', function() {
            iterator._get(0).should.be.equal(iterator._cache[0]);
        });

        it('should modify _done flag', function(done) {
            testPromise(iterator._get(2), function() {
                iterator._done.should.be.equal(true);
            }, done);
        });
    });

    describe('current', function() {
        it('should return promise', function() {
            var iterator = new Iterator(getMethod);
            iterator._get(0).should.be.a.Promise();
        });

        it('should set index on promise done', function(done) {
            var iterator = new Iterator(getMethod);

            should.equal(iterator._index, undefined);
            testPromise(iterator.current(), function() {
                iterator._index.should.be.equal(0);
            }, done);
        });
    });

    describe('hasNext', function() {
        var iterator = new Iterator(getMethod);

        it('should be true on init', function() {
            iterator.hasNext().should.be.true();
        });

        it('should be true when next() will not return undefined', function(done) {
            testPromise(iterator.next().then(function() {
                return iterator.next();
            }), function() {
                iterator.hasNext().should.be.true();
            }, done);
        });

        it('should be false when next() will return undefined', function(done) {
            testPromise(iterator.next(), function() {
                iterator.hasNext().should.be.false();
            }, done);
        });

        it('should be true after rewind', function() {
            iterator.rewind().hasNext().should.be.true();
        });
    });

    describe('next', function() {
        var iterator = new Iterator(getMethod);

        it('should return first if current() not executed', function(done) {
            var promise = iterator.next();

            testPromise(promise, function() {
                promise.should.be.equal(iterator._get(0));
            }, done);
        });

        it('should return next', function(done) {
            var promise = iterator.next();

            testPromise(promise, function() {
                promise.should.be.equal(iterator._get(1));
            }, done);
        });

        it('should return undefined when hasNext() is false', function(done) {
            testPromise(iterator.next(), function() {
                should.equal(iterator.next(), undefined);
            }, done);
        });

        it('should increase index on promise done', function(done) {
            testPromise(iterator.rewind().current().then(function() {
                return iterator.next();
            }), function() {
                iterator._index.should.equal(1);
            }, done);
        });
    });

    describe('all', function() {
        var iterator;

        beforeEach(function() {
            iterator = new Iterator(getMethod);
        });

        it('should return promise', function() {
            iterator.all().should.be.a.Promise();
        });

        it('returnable promise should be resolved by array with all data', function(done) {
            testPromise(iterator.all(), function(data) {
                data.should.be.an.Array();
            }, done);
        });

        it('returnable promise should notify', function(done) {
            var spy = sinon.spy();

            iterator.all().progress(spy).done(function() {
                try {
                    spy.calledThrice.should.be.true();
                    done();
                } catch(e) {
                    done(e);
                }
            });
        });

        it('returnable promise should fail if some next() are fail', function(done) {
            var spy = sinon.spy();

            iterator = new Iterator(function() {
                return getMethod(4);
            });

            iterator.all().fail(spy).always(function() {
                try {
                    spy.calledOnce.should.be.true();
                    done();
                } catch(e) {
                    done(e);
                }
            });
        });
    });

    describe('rewind', function() {
        var iterator = new Iterator(getMethod);

        it('should set initial index', function(done) {
            var initialIndex = iterator._index;

            testPromise(iterator.next().then(function() {
                return iterator.next();
            }), function() {
                should.equal(iterator._index, 1);
                iterator.rewind();
                should.equal(iterator._index, initialIndex);
            }, done);
        });

        it('should return "this"', function(done) {
            iterator.rewind().should.be.equal(iterator);
            done();
        });
    });
});
