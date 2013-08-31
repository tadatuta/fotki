var INHERIT = require('inherit'),
    REQUEST = require('request'),
    VOW = require('vow'),
    FS = require('fs');

var apiHost = 'api-fotki.yandex.ru',
    _cache = {};

var fotki = INHERIT({}, {
    auth: function(user, token) {
        this._user = user;
        this._token = token;

        _cache[this._user] = _cache[this._user] || {};

        return this;
    },
    getServiceDocument: function() {
        if (_cache[this._user].serviceDocument) return _cache[this._user].serviceDocument;

        var promise = VOW.promise();

        this._makeRequest({ user: this._user }).then(function(serviceDocument) {
            promise.fulfill(serviceDocument);
        });

        return _cache[this._user].getServiceDocument = promise;
    },
    getAlbums: function() {
        if (_cache[this._user].albums) return _cache[this._user].albums;

        var _this = this,
            promise = VOW.promise();

        this.getServiceDocument(this._user).then(function(serviceDocument) {
            _this._makeRequest({ uri: serviceDocument.collections['album-list'].href })
                .then(function(album) {
                    promise.fulfill(album);
                });
        });

        return _cache[this._user].albums = promise;
    },
    // gets album by param { paramName: 'value' }
    // E.g. { id: 'urn:yandex:fotki:tadatuta:album:197961' }
    // or { title: 'Some title' }
    getAlbum: function(query) {
        _cache[this._user].getAlbum = _cache[this._user].getAlbum || {};

        if (_cache[this._user].getAlbum[JSON.stringify(query)]) return _cache[this._user].getAlbum[JSON.stringify(query)];

        var _this = this,
            promise = VOW.promise();

        this.getAlbums().then(function(albums) {
            albums.entries.forEach(function(album, idx) {
                if (album[Object.keys(query)[0]] == query[Object.keys(query)[0]]) {
                    return promise.fulfill(album);
                }
            });
        });

        return _cache[this._user].getAlbum[JSON.stringify(query)] = promise;
    },
    createAlbum: function(title, summary) {
        var _this = this,
            promise = VOW.promise();

        this.getServiceDocument().then(function(serviceDocument) {
            var options = {
                uri: serviceDocument.collections['album-list'].href,
                method: 'POST',
                body: JSON.stringify({ title: title, summary: summary })
            };

            _this._makeRequest(options).then(function(album) {
                delete _cache[_this._user].albums;
                promise.fulfill(album);
            });
        });

        return promise;
    },
    
    getPhotos: function () {

        var _this = this,
            promise = VOW.promise();

        this.getServiceDocument(this._user).then(function(serviceDocument) {
            _this._makeRequest({ uri: serviceDocument.collections['photo-list'].href })
                .then(function(photos) {
                    promise.fulfill(photos);
                });
        });

        return promise;
    },
    
    getPhotosByAlbumId: function(albumId) {
        var _this = this,
            promise = VOW.promise();

        fotki.getAlbum({ id: albumId }).then(function(album) {
            _this._makeRequest({ uri: album.links.photos }).then(function(photos) {
                promise.fulfill(photos);
            });
        });

        return promise;
    },
    getPhotosByAlbumTitle: function(albumTitle) {
        var _this = this,
            promise = VOW.promise();

        fotki.getAlbum({ title: albumTitle }).then(function(album) {
            _this._makeRequest({ uri: album.links.photos }).then(function(photos) {
                promise.fulfill(photos);
            });
        });

        return promise;
    },
    uploadPhotoToAlbum: function(albumQuery, pathToFile) {
        var _this = this,
            promise = VOW.promise();

        this.getAlbum(albumQuery).then(function(album) {
            _this._makeRequest({
                uri: album.links.photos,
                method: 'POST',
                contentType: 'image/png',
                body: FS.readFileSync(pathToFile)
            }).then(function(photo) {
                promise.fulfill(photo);
            });
        });

        return promise;
    },
    getTags: function() {

    },
    _makeRequest: function(options) {
        var promise = VOW.promise();

        REQUEST({
            uri: options.uri || 'http://' + apiHost + '/api/users/' + this._user + '/',
            method: options.method || 'GET',
            json: options.json || null,
            body: options.body || null,
            headers: {
                Accept: 'application/json',
                'Content-Type': options.contentType || 'application/json;type=entry',
                Authorization: 'OAuth ' + this._token
            }
        }, function(err, response, body) {
            if (err) return promise.reject('Error: ' + err);

            // console.log(body);

            promise.fulfill(JSON.parse(body));
        });

        return promise;
    }
});

module.exports = fotki;
