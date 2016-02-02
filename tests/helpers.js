//var SHOULD = require('should'),
//    api = require('..');
//
//describe('Helpers', function() {
//    // getServiceDocument -> getCollection
//    it('getAlbumsCollection');
//    it('getPhotosCollection');
//    it('getTagsCollection');
//
//    // getCollection(uri)
//    it('getRecentPhotosCollection');
//    it('getPopularPhotosCollection');
//    it('getPODCollection');
//
//    // check params for each type of entity
//    it('updateAlbum');
//    it('updatePhoto');
//    it('updateTag');
//
//    it('uploadAlbum'); // create album and upload multiple photos
//    it('clearAlbum');
//    it('getAlbumsCollectionByName');
//    it('deleteAlbumsByName');
//
//
//    describe('album method', function() {
//        var albumLink,
//            albumId;
//
//        describe('addAlbum', function() {
//            authDescribe(api.addAlbum.bind(api));
//
//            it('should require title', function() {
//                api.addAlbum.bind(api).should.throw();
//                api.addAlbum.bind(api, {}).should.throw();
//                [0, '', undefined, null, NaN].forEach(function(value) {
//                    api.addAlbum.bind(api, { title : value }).should.throw();
//                });
//            });
//
//            it('should return promise which resolves by album entry', function(done) {
//                var promise = api.addAlbum({
//                    title : 'test',
//                    summary : 'test',
//                    password : '123'
//                });
//
//                promise.should.be.a.Promise();
//                testPromiseResolve(promise, function(res) {
//                    res.title.should.be.equal('test');
//                    res.summary.should.be.equal('test');
//                    res.protected.should.be.true();
//                    albumLink = res.links.self;
//                    albumId = albumLink.match(/^.+\/(\d+)\/?$/)[1];
//                }, done);
//            });
//
//            it('should be nested in other album'/*, function(done) {
//             api.addAlbum({ title : 'parent' }).then(function(res) {
//             return api.addAlbum({ title : 'child', link : res.links.self });
//             }).then(function(res) {
//             api.get
//             })
//             done();
//             }*/);
//        });
//
//        describe('getAlbum', function() {
//            authDescribe(api.getAlbum.bind(api));
//
//            it('should require id', function() {
//                api.getAlbum.bind(api).should.throw();
//            });
//
//            it('should return promise which resolves by album entry', function(done) {
//                var promise = api.getAlbum(albumId);
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    res.links.self.should.be.equal(albumLink);
//                }, done);
//            });
//        });
//
//        describe('updateAlbum', function() {
//            authDescribe(api.updateAlbum.bind(api));
//
//            it('should require id', function() {
//                api.updateAlbum.bind(api).should.throw();
//            });
//
//            it('should require params', function() {
//                api.updateAlbum.bind(api, albumId).should.throw();
//                api.updateAlbum.bind(api, albumId, { title : '' }).should.throw();
//                api.updateAlbum.bind(api, albumId, { bla : '' }).should.throw();
//            });
//
//            it('should return promise which resolves by album entry', function(done) {
//                var promise = api.updateAlbum(albumId, {
//                    title : 'updated',
//                    summary : 'updated',
//                    password : ''
//                    // TODO: link?
//                });
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    res.links.self.should.be.equal(albumLink);
//                    res.title.should.be.equal('updated');
//                    res.summary.should.be.equal('updated');
//                    SHOULD.equal(res.protected, undefined);
//                }, done);
//            });
//        });
//
//        describe('deleteAlbum', function() {
//            authDescribe(api.deleteAlbum.bind(api));
//
//            it('should require id', function() {
//                api.deleteAlbum.bind(api).should.throw();
//            });
//
//            it('should return promise which resolves by ""', function(done) {
//                var promise = api.deleteAlbum(albumId);
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    console.log(res);
//                    SHOULD.equal(res, '');
//                }, done);
//            });
//        });
//
//        describe('getAlbumsCollectionByName', function() {
//            authDescribe(api.getAlbumsCollectionByName.bind(api));
//
//            it('should require name', function() {
//                api.deleteAlbum.bind(api).should.throw();
//            });
//
//            it('should return iterator by album\'s entries', function(done) {
//                var iterator = api.getAlbumsCollectionByName('test', { limit : 100 });
//
//                iterator.should.be.instanceOf(Iterator);
//                iterator.current().then(function(data) {
//                    data.should.be.an.Array();
//                    // TODO: entry check?
//                    done();
//                }, function(err) {
//                    done(err);
//                });
//            });
//        });
//    });
//    describe('photo method', function() {
//        var photoLink,
//            photoId;
//
//        describe('uploadPhoto', function() {
//            it('should check file extension', function() {
//                api.uploadPhoto.should.throw();
//            });
//
//            it('should return promise which resolves by photo entry', function(done) {
//                var promise = api.uploadPhoto(imgPath);
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    photoLink = res.links.self;
//                    photoId = photoLink.match(/^.+\/(\d+)\/?$/)[1];
//                }, done);
//            });
//        });
//
//        describe('getPhoto', function() {
//            authDescribe(api.getPhoto.bind(api));
//
//            it('should require id', function() {
//                api.getPhoto.bind(api).should.throw();
//            });
//
//            it('should return promise which resolves by photo entry', function(done) {
//                var promise = api.getPhoto(photoId);
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    res.links.self.should.be.equal(photoLink);
//                }, done);
//            });
//        });
//
//        describe('updatePhoto', function() {
//            authDescribe(api.updatePhoto.bind(api));
//
//            it('should require id', function() {
//                api.updatePhoto.bind(api).should.throw();
//            });
//
//            it('should require params', function() {
//                api.updatePhoto.bind(api, photoId).should.throw();
//                api.updatePhoto.bind(api, photoId, { title : '' }).should.throw();
//                api.updatePhoto.bind(api, photoId, { bla : '' }).should.throw();
//            });
//
//            it('should return promise which resolves by photo entry', function(done) {
//                var promise = api.updatePhoto(photoId, {
//                    title : 'updated',
//                    summary : 'updated'
//                });
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    res.links.self.should.be.equal(photoLink);
//                    res.title.should.be.equal('updated');
//                    res.summary.should.be.equal('updated');
//                }, done);
//            });
//        });
//
//        describe('deletePhoto', function() {
//            authDescribe(api.deletePhoto.bind(api));
//
//            it('should require id', function() {
//                api.deletePhoto.bind(api).should.throw();
//            });
//
//            it('should return promise which resolves by ""', function(done) {
//                var promise = api.deletePhoto(photoId);
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    SHOULD.equal(res, '');
//                }, done);
//            });
//        });
//    });
//    describe('tag method', function() {
//        var photoLink,
//            photoId,
//            tag = 'test';
//
//        before(function(done) {
//            api.getServiceDocument().then(function(res) {
//                var tagsCollectionUrl = res.collections['tag-list'];
//
//                return api.uploadPhoto(imgPath).then(function(res) {
//                    var tags = {};
//
//                    tags[tag] = tagsCollectionUrl;
//                    photoLink = res.links.self;
//                    photoId = photoLink.match(/^.+\/(\d+)\/?$/)[1];
//
//                    return api.updatePhoto(photoId, { tags : tags });
//                }).then(function() {
//                    done();
//                });
//            });
//        });
//
//        after(function(done) {
//            api.deletePhoto(photoId).then(function() {
//                done();
//            });
//        });
//
//        describe('getTag', function() {
//            authDescribe(api.getTag.bind(api));
//
//            it('should require id', function() {
//                api.getTag.bind(api).should.throw();
//            });
//
//            it('should return promise which resolves by tag entry', function(done) {
//                var promise = api.getTag(tag);
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    res.title.should.be.equal(tag);
//                }, done);
//            });
//        });
//
//        describe('updateTag', function() {
//            authDescribe(api.updateTag.bind(api));
//
//            it('should require id', function() {
//                api.updateTag.bind(api).should.throw();
//            });
//
//            it('should require params', function() {
//                api.updateTag.bind(api, tag).should.throw();
//                api.updateTag.bind(api, tag, { title : '' }).should.throw();
//                api.updateTag.bind(api, tag, { bla : '' }).should.throw();
//            });
//
//            it('should return promise which resolves by tag entry', function(done) {
//                var newTag = 'updated',
//                    promise = api.updateTag(tag, {
//                        title : newTag
//                    });
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    res.title.should.be.equal(newTag);
//                    tag = newTag;
//                }, done);
//            });
//        });
//
//        describe('deleteTag', function() {
//            authDescribe(api.deleteTag.bind(api));
//
//            it('should require id', function() {
//                api.deleteTag.bind(api).should.throw();
//            });
//
//            it('should return promise which resolves by ""', function(done) {
//                var promise = api.deleteTag(tag);
//
//                promise.should.be.Promise();
//                testPromiseResolve(promise, function(res) {
//                    SHOULD.equal(res, '');
//                }, done);
//            });
//        });
//    });
//
//    [
//        { method : 'getAlbumsCollection', path : 'albums' },
//        { method : 'getPhotosCollection', path : 'photos' },
//        { method : 'getTagsCollection', path : 'tags' },
//        { method : 'getAlbumPhotosCollection', path : 'test/photos' },
//        { method : 'getTagPhotosCollection', path : 'test/photos' },
//        { method : 'getRecentPhotosCollection', path : 'recent' },
//        { method : 'getPopularPhotosCollection', path : 'top' },
//        { method : 'getPODCollection', path : 'podhistory' }
//    ].forEach(function(value) {
//            describe(value.method, function() {
//                it('should return iterator', function() {
//                    api[value.method]().should.be.instanceOf(Iterator);
//                });
//
//                it('should make request with certain arguments', function() {
//                    var needAuth = ['recent', 'top', 'podhistory'].indexOf(value.path) === -1;
//
//                    api[value.method]({
//                        sort : 'updated',
//                        time : '1970-01-01T00:00:00.000Z',
//                        id : '111',
//                        uid : '222',
//                        limit : 1
//                    }).current();
//
//                    request.calledWith({
//                        uri : 'http://api-fotki.yandex.ru/api/' +
//                        (needAuth ? ['users', credentials.user] : []).concat(value.path).join('/') +
//                        '/updated;1970-01-01T00:00:00.000Z,111,222/?limit=1',
//                        method : 'GET',
//                        body : null,
//                        headers : {
//                            Accept : 'application/json',
//                            'Content-Type' : 'application/json;type=entry',
//                            Authorization :  needAuth ? 'OAuth ' + credentials.token : undefined
//                        }
//                    }).should.be.true();
//                });
//            });
//        });
//});
