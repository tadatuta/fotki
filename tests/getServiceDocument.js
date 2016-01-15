var should = require('should'),
    api = require('..');

describe('API', function() {
    var testPromise = function(promise, cb, done) {
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

    before(function() {
        api.auth(process.env.user, process.env.token);
    });

    it('getServiceDocument', function(done) {
        testPromise(api.getServiceDocument(), function(data) {
            should.exist(data.collections['album-list'], 'Response not correct');
            should.exist(data.collections['photo-list'], 'Response not correct');
            should.exist(data.collections['tag-list'], 'Response not correct');
        }, done);
    });

    describe('Album', function() {
        var id,
            link;

        it('create', function(done) {
            var params = {
                title : 'test album',
                summary : 'description'
            };

            testPromise(api.addAlbum(params), function(data) {
                Object.keys(params).forEach(function(key) {
                    should.equal(data[key], params[key]);
                });

                link = data.links.self;
                id = link.replace(/^\D*(\d+)\D*$/, '$1');
            }, done);
        });

        it('get', function(done) {
            testPromise(api.getAlbum(id), function(data) {
                should.equal(link, data.links.self);
            }, done);
        });

        it('update', function(done) {
            var params = { title : 'updated' };

            testPromise(api.updateAlbum(id, params), function(data) {
                Object.keys(params).forEach(function(key) {
                    should.equal(data[key], params[key]);
                });
            }, done);
        });

        it('delete', function(done) {
            testPromise(api.deleteAlbum(id), function(data) {
            }, done);
        });
    });
});
