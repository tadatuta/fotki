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

        return _cache[this._user].getServiceDocument = this._makeRequest({ user: this._user });
    },
    getAlbums: function() {
        if (_cache[this._user].albums) return _cache[this._user].albums;

        var _this = this;

        return _cache[this._user].albums = this.getServiceDocument(this._user)
            .then(function(serviceDocument) {
                return _this._makeRequest({ uri: serviceDocument.collections['album-list'].href });
            });
    },
    // gets album by param { paramName: 'value' }
    // E.g. { id: 'urn:yandex:fotki:tadatuta:album:197961' }
    // or { title: 'Some title' }
    getAlbum: function(query) {
        _cache[this._user].getAlbum = _cache[this._user].getAlbum || {};

        var strQuery = JSON.stringify(query),
            key = Object.keys(query)[0];

        if (_cache[this._user].getAlbum[strQuery]) return _cache[this._user].getAlbum[strQuery];

        return _cache[this._user].getAlbum[strQuery] = this.getAlbums().then(function(albums) {
            for (var i = 0, entries = albums.entries, len = entries.length; i < len; i++) {
                var album = entries[i];
                if (album[key] == query[key]) return album;
            }

            return 'album not found'; // TODO: it's better to reject promise here
        });
    },
    createAlbum: function(title, summary) {
        var _this = this;

        return this.getServiceDocument().then(function(serviceDocument) {
            var options = {
                uri: serviceDocument.collections['album-list'].href,
                method: 'POST',
                body: JSON.stringify({ title: title, summary: summary })
            };

            return _this._makeRequest(options).then(function(album) {
                // TODO: add album to cache instead of drop
                delete _cache[_this._user].albums;
                return album;
            });
        });
    },

    getPhotos: function () {
        var _this = this;

        return this.getServiceDocument(this._user).then(function(serviceDocument) {
            return _this._makeRequest({ uri: serviceDocument.collections['photo-list'].href });
        });
    },

    getPhotosByAlbumId: function(albumId) {
        var _this = this;

        return fotki.getAlbum({ id: albumId }).then(function(album) {
            return _this._makeRequest({ uri: album.links.photos });
        });
    },
    getPhotosByAlbumTitle: function(albumTitle) {
        var _this = this;

        return fotki.getAlbum({ title: albumTitle }).then(function(album) {
            return _this._makeRequest({ uri: album.links.photos });
        });
    },
    uploadPhotoToAlbum: function(albumQuery, pathToFile) {
        var _this = this;

        return this.getAlbum(albumQuery).then(function(album) {
            return _this._makeRequest({
                uri: album.links.photos,
                method: 'POST',
                contentType: 'image/png',
                body: FS.readFileSync(pathToFile)
            });
        });
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
            if (err) return deferred.reject('Error: ' + err);

            if (body === 'Not an image or unsupported image format') {
                return deferred.reject(body);
            }

            try {
                deferred.resolve(JSON.parse(body));
            } catch(err) {
                deferred.reject('Fotki: ' + err + ' ' + body);
            }
        });

        return deferred.promise();
    }
});

module.exports = fotki;
