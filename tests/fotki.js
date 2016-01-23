var should = require('should'),
    api = require('..'),
    Iterator = require('../lib/iterator');

describe('Fotki', function() {
    var authDescribe = function(method) {
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
        api.auth('abc-ua', 'dac016e644cc403a9f4342f4216ec93c');
    });

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
                promise.then(function(res) {
                    try {
                        res.title.should.be.equal('test');
                        res.summary.should.be.equal('test');
                        res.protected.should.be.true();
                        albumLink = res.links.self;
                        albumId = albumLink.match(/^.+\/(\d+)\/?$/)[1];
                        done();
                    } catch(e) {
                        done(e);
                    }
                });
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
                promise.then(function(res) {
                    try {
                        res.links.self.should.be.equal(albumLink);
                        done();
                    } catch(e) {
                        done(e);
                    }
                });
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
                promise.then(function(res) {
                    try {
                        res.links.self.should.be.equal(albumLink);
                        res.title.should.be.equal('updated');
                        res.summary.should.be.equal('updated');
                        should.equal(res.protected, undefined);
                        done();
                    } catch(e) {
                        done(e);
                    }
                });
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
                promise.then(function(res) {
                    try {
                        should.equal(res, '');
                        done();
                    } catch(e) {
                        done(e);
                    }
                });
            });
        });
    });

    describe('photo method', function() {
        //var photoLink = 'http://api-fotki.yandex.ru/api/users/abc-ua/photo/762631/',
        //    photoId = 762631;

        describe('uploadPhoto', function() {

        });

        describe('getPhoto', function() {
            authDescribe(api.getPhoto.bind(api));

            it('should require id', function() {
                api.getPhoto.bind(api).should.throw();
            });

            it('should return promise which resolves by photo entry'/*, function(done) {
                var promise = api.getAlbum(photoId);

                promise.should.be.Promise();
                promise.then(function(res) {
                    try {
                        res.links.self.should.be.equal(photoLink);
                        done();
                    } catch(e) {
                        done(e);
                    }
                });
            }*/);
        });

        describe('updatePhoto', function() {
            authDescribe(api.updatePhoto.bind(api));

            it('should require id', function() {
                api.updatePhoto.bind(api).should.throw();
            });

            //it('should require params', function() {
            //    api.updateAlbum.bind(api, photoId).should.throw();
            //    api.updateAlbum.bind(api, photoId, { title : '' }).should.throw();
            //    api.updateAlbum.bind(api, photoId, { bla : '' }).should.throw();
            //});
            //
            //it('should return promise which resolves by album entry', function(done) {
            //    var promise = api.updateAlbum(photoId, {
            //        title : 'updated',
            //        summary : 'updated',
            //        password : ''
            //        // TODO: link?
            //    });
            //
            //    promise.should.be.Promise();
            //    promise.then(function(res) {
            //        try {
            //            res.links.self.should.be.equal(photoLink);
            //            res.title.should.be.equal('updated');
            //            res.summary.should.be.equal('updated');
            //            should.equal(res.protected, undefined);
            //            done();
            //        } catch(e) {
            //            done(e);
            //        }
            //    });
            //});
        });

        describe('deletePhoto', function() {
            authDescribe(api.deletePhoto.bind(api));

            it('should require id', function() {
                api.deletePhoto.bind(api).should.throw();
            });

            //it('should return promise which resolves by ""', function(done) {
            //    var promise = api.deleteAlbum(photoId);
            //
            //    promise.should.be.Promise();
            //    promise.then(function(res) {
            //        try {
            //            should.equal(res, '');
            //            done();
            //        } catch(e) {
            //            done(e);
            //        }
            //    });
            //});
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
                    iterator.current().then(function(data) {
                        try {
                            data.id.should.be.equal(value.id);
                            done();
                        } catch(e) {
                            done(e);
                        }
                    });
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
                iterator.current().then(function(data) {
                    try {
                        data.id.should.be.equal(value.id);
                        done();
                    } catch(e) {
                        done(e);
                    }
                });
            });
        });
    });
});
