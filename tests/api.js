var path = require('path'),
    should = require('should'),
    api = require('..'),
    Iterator = require('../lib/iterator');

var credentials = { user : 'abc-ua', token : 'dac016e644cc403a9f4342f4216ec93c' };

describe('Fotki', function() {
    var testPromiseResolve = function(promise, cb, done) {
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
        },
        authDescribe = function(method) {
            describe('should not work without authorization', function() {
                var user,
                    token;

                before(function() {
                    user = api._username;
                    token = api._token;

                    api.auth(undefined, undefined);
                });

                after(function() { api.auth(user, token); });

                it('should require username', function() {
                    method.should.throw();
                });

                it('should require token', function() {
                    api.auth('username');
                    method.should.throw();
                });
            });
        };

    before(function() {
        api.auth(credentials.user, credentials.token);
    });

    describe('_makeRequest', function() {
        it('should return promise which resolves by server response body');
        it('should resolve');
        it('should reject');
        it('should check auth');
        it('should cache');
        it('should ');
        it('should ');
    });

    describe('method auth', function() {
        var returns = api.auth(credentials.user, credentials.token);

        it('should set credentials', function() {
            should.equal(api._username, credentials.user);
            should.equal(api._token, credentials.token);
        });

        it('should return "this"', function() {
            returns.should.equal(api);
        });
    });

    describe('method getServiceDocument', function() {
        authDescribe(api.getServiceDocument.bind(api));

        it('should return promise which resolves by "service document"', function(done) {
            var promise = api.getServiceDocument();

            promise.should.be.Promise();
            testPromiseResolve(promise, function(res) {
                should.exist(res.collections);
            }, done);
        });
    });

    it('addEntry');
    it('getEntry');
    it('updateEntry');
    it('deleteEntry');
    it('getCollection');
    it('getCollectionIterator');
    it('getFilteredIterator');

    describe('album method', function() {
        var albumLink,
            albumId;

        describe('addAlbum', function() {
            authDescribe(api.addAlbum.bind(api));

            it('should require title', function() {
                api.addAlbum.bind(api).should.throw();
                api.addAlbum.bind(api, {}).should.throw();
                [0, '', undefined, null, NaN].forEach(function(value) {
                    api.addAlbum.bind(api, { title : value }).should.throw();
                });
            });

            it('should return promise which resolves by album entry', function(done) {
                var promise = api.addAlbum({
                    title : 'test',
                    summary : 'test',
                    password : '123'
                });

                promise.should.be.a.Promise();
                testPromiseResolve(promise, function(res) {
                    res.title.should.be.equal('test');
                    res.summary.should.be.equal('test');
                    res.protected.should.be.true();
                    albumLink = res.links.self;
                    albumId = albumLink.match(/^.+\/(\d+)\/?$/)[1];
                }, done);
            });

            it('should be nested in other album'/*, function(done) {
             api.addAlbum({ title : 'parent' }).then(function(res) {
             return api.addAlbum({ title : 'child', link : res.links.self });
             }).then(function(res) {
             api.get
             })
             done();
             }*/);
        });

        describe('getAlbum', function() {
            authDescribe(api.getAlbum.bind(api));

            it('should require id', function() {
                api.getAlbum.bind(api).should.throw();
            });

            it('should return promise which resolves by album entry', function(done) {
                var promise = api.getAlbum(albumId);

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    res.links.self.should.be.equal(albumLink);
                }, done);
            });
        });

        describe('updateAlbum', function() {
            authDescribe(api.updateAlbum.bind(api));

            it('should require id', function() {
                api.updateAlbum.bind(api).should.throw();
            });

            it('should require params', function() {
                api.updateAlbum.bind(api, albumId).should.throw();
                api.updateAlbum.bind(api, albumId, { title : '' }).should.throw();
                api.updateAlbum.bind(api, albumId, { bla : '' }).should.throw();
            });

            it('should return promise which resolves by album entry', function(done) {
                var promise = api.updateAlbum(albumId, {
                    title : 'updated',
                    summary : 'updated',
                    password : ''
                    // TODO: link?
                });

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    res.links.self.should.be.equal(albumLink);
                    res.title.should.be.equal('updated');
                    res.summary.should.be.equal('updated');
                    should.equal(res.protected, undefined);
                }, done);
            });
        });

        describe('deleteAlbum', function() {
            authDescribe(api.deleteAlbum.bind(api));

            it('should require id', function() {
                api.deleteAlbum.bind(api).should.throw();
            });

            it('should return promise which resolves by ""', function(done) {
                var promise = api.deleteAlbum(albumId);

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    should.equal(res, '');
                }, done);
            });
        });

        describe('getAlbumsCollectionByName', function() {
            authDescribe(api.getAlbumsCollectionByName.bind(api));

            it('should require name', function() {
                api.deleteAlbum.bind(api).should.throw();
            });

            it('should return iterator by album\'s entries', function(done) {
                var iterator = api.getAlbumsCollectionByName('test', { limit : 100 });

                iterator.should.be.instanceOf(Iterator);
                iterator.current().then(function(data) {
                    data.should.be.an.Array();
                    // TODO: entry check?
                    done();
                }, function(err) {
                    done(err);
                });
            });
        });
    });

    describe('photo method', function() {
        var photoLink,
            photoId;

        describe('uploadPhoto', function() {
            it('should return promise which resolves by photo entry', function(done) {
                var promise = api.uploadPhoto(path.join(__dirname, 'test.png'));

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    photoLink = res.links.self;
                    photoId = photoLink.match(/^.+\/(\d+)\/?$/)[1];
                }, done);
            });
        });

        describe('getPhoto', function() {
            authDescribe(api.getPhoto.bind(api));

            it('should require id', function() {
                api.getPhoto.bind(api).should.throw();
            });

            it('should return promise which resolves by photo entry', function(done) {
                var promise = api.getPhoto(photoId);

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    res.links.self.should.be.equal(photoLink);
                }, done);
            });
        });

        describe('updatePhoto', function() {
            authDescribe(api.updatePhoto.bind(api));

            it('should require id', function() {
                api.updatePhoto.bind(api).should.throw();
            });

            it('should require params', function() {
                api.updatePhoto.bind(api, photoId).should.throw();
                api.updatePhoto.bind(api, photoId, { title : '' }).should.throw();
                api.updatePhoto.bind(api, photoId, { bla : '' }).should.throw();
            });

            it('should return promise which resolves by photo entry', function(done) {
                var promise = api.updatePhoto(photoId, {
                    title : 'updated',
                    summary : 'updated'
                });

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    res.links.self.should.be.equal(photoLink);
                    res.title.should.be.equal('updated');
                    res.summary.should.be.equal('updated');
                }, done);
            });
        });

        describe('deletePhoto', function() {
            authDescribe(api.deletePhoto.bind(api));

            it('should require id', function() {
                api.deletePhoto.bind(api).should.throw();
            });

            it('should return promise which resolves by ""', function(done) {
                var promise = api.deletePhoto(photoId);

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    should.equal(res, '');
                }, done);
            });
        });
    });

    describe('tag method', function() {
        var photoLink,
            photoId,
            tag = 'test';

        before(function(done) {
            api.getServiceDocument().then(function(res) {
                var tagsCollectionUrl = res.collections['tag-list'];

                return api.uploadPhoto(path.join(__dirname, 'test.png')).then(function(res) {
                    var tags = {};

                    tags[tag] = tagsCollectionUrl;
                    photoLink = res.links.self;
                    photoId = photoLink.match(/^.+\/(\d+)\/?$/)[1];

                    return api.updatePhoto(photoId, { tags : tags });
                }).then(function() {
                    done();
                });
            });
        });

        after(function(done) {
            api.deletePhoto(photoId).then(function() {
                done();
            });
        });

        describe('getTag', function() {
            authDescribe(api.getTag.bind(api));

            it('should require id', function() {
                api.getTag.bind(api).should.throw();
            });

            it('should return promise which resolves by tag entry', function(done) {
                var promise = api.getTag(tag);

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    res.title.should.be.equal(tag);
                }, done);
            });
        });

        describe('updateTag', function() {
            authDescribe(api.updateTag.bind(api));

            it('should require id', function() {
                api.updateTag.bind(api).should.throw();
            });

            it('should require params', function() {
                api.updateTag.bind(api, tag).should.throw();
                api.updateTag.bind(api, tag, { title : '' }).should.throw();
                api.updateTag.bind(api, tag, { bla : '' }).should.throw();
            });

            it('should return promise which resolves by tag entry', function(done) {
                var newTag = 'updated',
                    promise = api.updateTag(tag, {
                        title : newTag
                    });

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    res.title.should.be.equal(newTag);
                    tag = newTag;
                }, done);
            });
        });

        describe('deleteTag', function() {
            authDescribe(api.deleteTag.bind(api));

            it('should require id', function() {
                api.deleteTag.bind(api).should.throw();
            });

            it('should return promise which resolves by ""', function(done) {
                var promise = api.deleteTag(tag);

                promise.should.be.Promise();
                testPromiseResolve(promise, function(res) {
                    should.equal(res, '');
                }, done);
            });
        });
    });

    [
        { method : 'getAlbumsCollection', name : 'all albums', id : 'urn:yandex:fotki:abc-ua:albums' },
        { method : 'getPhotosCollection', name : 'all photos', id : 'urn:yandex:fotki:abc-ua:photos' },
        { method : 'getTagsCollection', name : 'all tags', id : 'urn:yandex:fotki:abc-ua:tags' },
        { method : 'getAlbumPhotosCollection', name : 'album photos',
            id : 'urn:yandex:fotki:abc-ua:album:222701:photos', args : [222701] },
        { method : 'getTagPhotosCollection', name : 'tag photos',
            id : 'urn:yandex:fotki:abc-ua:tag:test:photos', args : ['test'] }
    ].forEach(function(value) {
            describe(value.method, function() {
                authDescribe((function(iterator) { return iterator.current.bind(iterator); }(api[value.method]())));

                it('should return iterator by ' + value.name + ' collection', function(done) {
                    var iterator = api[value.method].apply(api, value.args || []);

                    iterator.should.be.instanceOf(Iterator);
                    testPromiseResolve(iterator.current(), function(data) {
                        data.id.should.be.equal(value.id);
                    }, done);
                });
            });
        });

    [
        { method : 'getRecentPhotosCollection', name : 'recent photos', id : 'urn:yandex:fotki:recent' },
        { method : 'getPopularPhotosCollection', name : 'popular photos', id : 'urn:yandex:fotki:top' },
        { method : 'getPODCollection', name : 'photos of the day', id : 'urn:yandex:fotki:pod:history' }
    ].forEach(function(value) {
        describe(value.method, function() {
            var user,
                token;

            before(function() {
                user = api._username;
                token = api._token;

                api.auth(undefined, undefined);
            });

            after(function() { api.auth(user, token); });

            it('should work without authorization', function() {
                var iterator = api[value.method]();

                iterator.current.bind(iterator).should.not.throw();
            });

            it('should return iterator by ' + value.name + ' collection', function(done) {
                var iterator = api[value.method]();

                iterator.should.be.instanceOf(Iterator);
                testPromiseResolve(iterator.current(), function(data) {
                    data.id.should.be.equal(value.id);
                }, done);
            });
        });
    });
});
