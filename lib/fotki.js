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

        var deferred = VOW.defer();

        this._makeRequest({ user: this._user }).then(function(serviceDocument) {
            deferred.resolve(serviceDocument);
        });

        return _cache[this._user].getServiceDocument = deferred.promise();
    },
    getAlbums: function() {
        if (_cache[this._user].albums) return _cache[this._user].albums;

        var _this = this,
            deferred = VOW.defer();

        this.getServiceDocument(this._user).then(function(serviceDocument) {
            _this._makeRequest({ uri: serviceDocument.collections['album-list'].href })
                .then(function(album) {
                    deferred.resolve(album);
                });
        });

        return _cache[this._user].albums = deferred.promise();
    },
    // gets album by param { paramName: 'value' }
    // E.g. { id: 'urn:yandex:fotki:tadatuta:album:197961' }
    // or { title: 'Some title' }
    getAlbum: function(query) {
        _cache[this._user].getAlbum = _cache[this._user].getAlbum || {};

        if (_cache[this._user].getAlbum[JSON.stringify(query)]) return _cache[this._user].getAlbum[JSON.stringify(query)];

        var _this = this,
            deferred = VOW.defer();

        this.getAlbums().then(function(albums) {

            var foundAlbum = null;

            albums.entries.forEach(function(album, idx) {
                if (album[Object.keys(query)[0]] == query[Object.keys(query)[0]]) {
                    foundAlbum = album;
                }
            });

            if (foundAlbum) deferred.resolve(foundAlbum);
            else deferred.reject({ error: true, errorMessage: 'album not found' });
        });

        return _cache[this._user].getAlbum[JSON.stringify(query)] = deferred.promise();
    },
    createAlbum: function(title, summary) {
        var _this = this,
            deferred = VOW.defer();

        this.getServiceDocument().then(function(serviceDocument) {
            var options = {
                uri: serviceDocument.collections['album-list'].href,
                method: 'POST',
                body: JSON.stringify({ title: title, summary: summary })
            };

            _this._makeRequest(options).then(function(album) {
                delete _cache[_this._user].albums;
                deferred.resolve(album);
            });
        });

        return deferred.promise();
    },
    
    getPhotos: function () {

        var _this = this,
            deferred = VOW.defer();

        this.getServiceDocument(this._user).then(function(serviceDocument) {
            _this._makeRequest({ uri: serviceDocument.collections['photo-list'].href })
                .then(function(photos) {
                    deferred.resolve(photos);
                });
        });

        return deferred.promise();
    },
    
    getPhotosByAlbumId: function(albumId) {
        var _this = this,
            deferred = VOW.defer();

        fotki.getAlbum({ id: albumId }).then(function(album) {
            _this._makeRequest({ uri: album.links.photos }).then(function(photos) {
                deferred.resolve(photos);
            });
        }).fail( function(err) { deferred.reject(err) });;

        return deferred.promise();
    },
    getPhotosByAlbumTitle: function(albumTitle) {
        var _this = this,
            deferred = VOW.defer();

        fotki.getAlbum({ title: albumTitle }).then(function(album) {
            _this._makeRequest({ uri: album.links.photos }).then(function(photos) {
                deferred.resolve(photos);
            });
        }).fail( function(err) { deferred.reject(err) });;

        return deferred.promise();
    },
    uploadPhotoToAlbum: function(albumQuery, pathToFile) {
        var _this = this,
            deferred = VOW.defer();

        this.getAlbum(albumQuery).then(function(album) {
            _this._makeRequest({
                uri: album.links.photos,
                method: 'POST',
                contentType: 'image/png',
                body: FS.readFileSync(pathToFile)
            }).then(function(photo) {
                deferred.resolve(photo);
            });
        });

        return deferred.promise();
    },
    getTags: function() {

    },
    _makeRequest: function(options) {
        var deferred = VOW.defer();

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
            if (err) return deferred.promise().reject('Error: ' + err);

            // console.log(body);

            deferred.resolve(JSON.parse(body));
        });

        return deferred.promise();
    }
});

module.exports = fotki;
