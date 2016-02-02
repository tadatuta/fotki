var should = require('should'),
    sinon = require('sinon'),
    vow = require('vow'),
    Iterator = require('../lib/iterator');

describe('Iterator', function() {
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

    it('should be constructor', function() {
        Iterator.should.be.Function();
    });

    describe('method _get', function() {
        var method = sinon.spy(getMethod),
            iterator = new Iterator(method),
            request;

        it('should throw error if no arguments', function() {
            iterator._get.should.throw();
        });

        it('should return promise', function() {
            iterator._get(0).should.be.a.Promise();
        });

        it('should execute method', function() {
            request = iterator._get(0);

            return request.then(function() {
                method.called.should.be.true();
            });
        });

        it('should cache promise', function() {
            iterator._cache[0].should.be.equal(request);
        });

        it('should use cache', function() {
            iterator._get(0).should.be.equal(iterator._cache[0]);
        });

        it('should modify _done flag', function() {
            return iterator._get(2).then(function() {
                return iterator._done.should.be.equal(true);
            });
        });
    });

    describe('method current', function() {
        it('should return promise', function() {
            var iterator = new Iterator(getMethod);
            iterator._get(0).should.be.a.Promise();
        });

        it('should set index on promise done', function() {
            var iterator = new Iterator(getMethod);

            should.equal(iterator._index, undefined);

            return iterator.current().then(function() {
                iterator._index.should.be.equal(0);
            });
        });
    });

    describe('method hasNext', function() {
        var iterator = new Iterator(getMethod);

        it('should be true on init', function() {
            iterator.hasNext().should.be.true();
        });

        it('should be true when next() will not return undefined', function() {
            return iterator.next().then(function() {
                return iterator.next();
            }).then(function() {
                iterator.hasNext().should.be.true();
            });
        });

        it('should be false when next() will return undefined', function() {
            return iterator.next().then(function() {
                iterator.hasNext().should.be.false();
            });
        });

        it('should be true after rewind', function() {
            iterator.rewind().hasNext().should.be.true();
        });
    });

    describe('method next', function() {
        var iterator = new Iterator(getMethod);

        it('should return first if current() not executed', function() {
            var promise = iterator.next();

            promise.then(function() {
                promise.should.be.equal(iterator._get(0));
            });
        });

        it('should return next', function() {
            var promise = iterator.next();

            return promise.then(function() {
                promise.should.be.equal(iterator._get(1));
            });
        });

        it('should return undefined when hasNext() is false', function() {
            return iterator.next().then(function() {
                should.equal(iterator.next(), undefined);
            });
        });

        it('should increase index on promise done', function() {
            return iterator.rewind().current().then(function() {
                return iterator.next();
            }).then(function() {
                iterator._index.should.equal(1);
            });
        });
    });

    describe('method all', function() {
        var iterator;

        beforeEach(function() {
            iterator = new Iterator(getMethod);
        });

        it('should return promise', function() {
            iterator.all().should.be.a.Promise();
        });

        it('should return promise which resolved by array with all data', function() {
            return iterator.all().then(function(data) {
                data.should.be.an.Array();
            });
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

    describe('method rewind', function() {
        var iterator = new Iterator(getMethod);

        it('should set initial index', function() {
            var initialIndex = iterator._index;

            return iterator.next().then(function() {
                return iterator.next();
            }).then(function() {
                should.equal(iterator._index, 1);
                iterator.rewind();
                should.equal(iterator._index, initialIndex);
            });
        });

        it('should return "this"', function(done) {
            iterator.rewind().should.be.equal(iterator);
            done();
        });
    });
});
