var should = require('should'),
    sinon = require('sinon'),
    should_sinon = require('should-sinon'),// jshint unused: false
    vow = require('vow'),
    Iterator = require('../lib/iterator');

describe('Iterator', function() {
    var iterator,
        method;

    before(function() {
        /**
         * Pseudo server api method: returns some data for 0, 1, 2(hasNext = false), and 404 for else.
         * @param {Number} index
         * @returns {Promise}
         */
        method = sinon.spy(function(index) {
            var defer = vow.defer();

            if(index >= 3) defer.reject({ statusCode : '404' });
            else {
                setTimeout(function() {
                    defer.notify(index);
                    defer.resolve(['response ' + index, index < 2]);
                });
            }

            return defer.promise();
        });
    });
    beforeEach(function() { iterator = new Iterator(method); });
    afterEach(function() { method.reset(); });

    it('should be constructor', function() {
        Iterator.should.be.Function();
    });
    describe('method _get', function() {
        it('should throw error if no arguments', function() {
            iterator._get.should.throw();
        });
        describe('should execute iterator\'s method', function() {
            it('if it calls with such arguments at first', function() {
                return iterator._get(0).then(function() {
                    method.called.should.be.true();
                });
            });
            it('if method returns rejected promise in previous call', function() {
                var request = iterator._get(3);

                return request.always(function() {
                    request.should.be.rejected();
                    iterator._get(3);
                    method.should.be.calledTwice();
                });
            });
        });
        it('should cache data if promise was fulfilled', function() {
            var promise = iterator._get(0);

            return promise.always(function() {
                method.lastCall.returnValue.should.be.fulfilled();
                promise.should.be.equal(iterator._get(0));
                method.should.be.calledOnce();
            });
        });
        it('should not cache data if promise was rejected', function() {
            var promise = iterator._get(3);

            return promise.always(function() {
                method.lastCall.returnValue.should.be.rejected();
                promise.should.not.be.equal(iterator._get(3));
                method.should.be.calledTwice();
            });
        });
        it('should return not resolved promise from cache', function() {
            iterator._get(0).should.be.equal(iterator._get(0));
        });
        it('should modify _done flag', function() {
            return iterator._get(2).then(function() {
                return iterator._done.should.be.equal(true);
            });
        });
        describe('should return promise', function() {
            it('which fulfilled with data', function() {
                return method(0).then(function(array) {
                    return iterator._get(0).should.be.fulfilledWith(array[0]);
                });
            });
            it('which rejected with arguments', function() {
                return method(3).fail(function(err) {
                    return iterator._get(3).should.be.rejectedWith(err);
                });
            });
            it('which notified with arguments', function(done) {
                return method(0).progress(function(data) {
                    iterator._get(0).progress(function(data2) {
                        try {
                            data2.should.be.equal(data);
                            done();
                        } catch(e) {
                            done(e);
                        }
                    });
                });
            });
        });
    });
    describe('method current', function() {
        it('should set index on promise done', function() {
            should.equal(iterator._index, undefined);

            return iterator.current().then(function() {
                iterator._index.should.be.equal(0);
            });
        });
        it('should return same promise as method "_get"', function() {
            iterator.current().should.be.a.Promise();
            iterator.current().should.be.equal(iterator._get(0));
        });
    });
    describe('method hasNext', function() {
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
            return iterator.all().then(function() {
                iterator.hasNext().should.be.false();
            });
        });
        it('should be true after rewind', function() {
            iterator.rewind().hasNext().should.be.true();
        });
    });
    describe('method next', function() {
        describe('should return first if', function() {
            it('current() not executed', function() {
                iterator.next().should.be.equal(iterator._get(0));
            });
            it('iterator was rewind', function() {
                return iterator.all().then(function() {
                    iterator.rewind().next().should.be.equal(iterator._get(0));
                });
            });
        });
        it('should return next', function() {
            return iterator.next().then(function() {
                iterator.current().should.not.be.equal(iterator.next());
            });
        });
        it('should return undefined when method return falsy hasNext', function() {
            return iterator.all().then(function() {
                method.lastCall.returnValue.should.be.fulfilledWith(['response 2', false]);
                should(iterator.next()).be.undefined();
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
                return method(4);
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
        it('should force iterator to begin from start', function() {
            iterator.next().should.be.equal(iterator.rewind().next());
        });
        it('should return "this"', function() {
            iterator.rewind().should.be.equal(iterator);
        });
    });
});
