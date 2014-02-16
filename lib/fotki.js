var INHERIT = require('inherit'),
    REQUEST = require('request'),
    VOW = require('vow'),
    FS = require('fs');

var apiHost = 'api-fotki.yandex.ru';

var fotki = INHERIT({}, {
    /**
     * Create HTTP request to service api
     * @param {Object} options Request options
     * @param {String} [options.uri="http://{apiHost}/api/users/{username}/"] Request uri
     * @param {String} [options.method="GET"] Request method
     * @param {String} [options.json] Request get-params
     * @param {String} [options.body] Request body
     * @param {String} [options.contentType="application/json;type=entry"] Request content-type
     * @returns {Promise}
     * @private
     */
    _makeRequest: function(options) {
        var returnDeferred = VOW.defer();

        REQUEST({
            uri: options.uri || 'http://' + apiHost + '/api/users/' + this._username + '/',
            method: options.method || 'GET',
            json: options.json || null,
            body: options.body || null,
            headers: {
                Accept: 'application/json',
                'Content-Type': options.contentType || 'application/json;type=entry',
                Authorization: 'OAuth ' + this._token
            }
        }, function(err, response, body) {
            if ( err ) return returnDeferred.reject.call(returnDeferred, err);

            try {
                returnDeferred.resolve(JSON.parse(body));
            } catch (e) {
                returnDeferred.resolve(body);
            }
        });

        return returnDeferred.promise();
    },

    /**
     * Set authorize data
     * @param {String} username User's login
     * @param {String} token OAuth token
     * @returns {this}
     */
    auth: function(username, token) {
        this._username = username;
        this._token = token;

        return this;
    },

    /**
     * Get base info about user's account
     * @returns {Promise}
     */
    getServiceDocument: function() {
        return this._makeRequest({ user: this._username });
    },

    /**
     * @static
     */
    albums: {
        /**
         * Returns collection of root albums
         * @returns {Promise}
         */
        getCollection: function() {
            return fotki.getServiceDocument()
                .then(function(data) {
                    return fotki._makeRequest({
                        uri: data.collections['album-list'].href
                    });
                });
        },

        /**
         * Get album info
         * @param {String} uri Album's 'self' link
         * @returns {Promise}
         */
        get: function(uri) {
            return fotki._makeRequest({
                uri: uri
            });
        },

        /**
         * Returns collection of albums with target name
         * @param {String} name Album's name
         * @returns {Promise}
         */
        getByName: function(name) {
            return fotki.albums.getCollection()
                .then(function(albums) {
                    var returnDeferred = VOW.defer(),
                        albumsCollection = [];

                    albums.entries.forEach(function(album, idx) {
                        if (album.title == name) {
                            albumsCollection.push(album);
                        }
                    });

                    if ( albumsCollection.length ) {
                        returnDeferred.resolve(albumsCollection);
                    } else {
                        returnDeferred.reject('There is no albums with such name');
                    }

                    return returnDeferred.promise();
                });
        },

        /**
         * Creates new album
         * @param {Object} options Album creation params
         * @param {String} [options.title="Неразобранное"] Album name
         * @param {String} [options.summary] Album description
         * @param {String} [options.password] Album access password
         * @param {String} [options.link] Link on parent album, by default album creates as root
         * @returns {Promise}
         */
        create: function(options) {
            return fotki.albums.getCollection()
                .then(function(albumCollection) {
                    return fotki._makeRequest({
                        uri: albumCollection.links.self,
                        method: 'POST',
                        body: JSON.stringify(options)
                    });
                });
        },

        /**
         * Edit album data
         * @param {String} uri Target album 'self' link
         * @param {Object} options Target album uri and new data
         * @param {String} [options.title] Album name; can't bee empty string
         * @param {String} [options.summary] Album description
         * @param {String} [options.password] Album access password; empty string to delete
         * @param {String} [options.link] Link on parent album or user's service document album collection
         * @returns {Promise}
         */
        edit: function(uri, options) {
            return fotki.albums.get(uri)
                .then(function(data) {
                    var newData = data;

                    for ( var key in options ) {
                        if ( options.hasOwnProperty(key) ) {
                            newData[key] = options[key];
                        }
                    }

                    return fotki._makeRequest({
                        uri: uri,
                        method: 'PUT',
                        body: newData
                    });
                });
        },

        /**
         * Delete all photos in album
         * @param {String} uri Target album 'self' link
         * @returns {Promise}
         */
        clear: function(uri) {
            return fotki.photos.get(uri)
                .then(function(photos) {
                    var returnDeferred = VOW.defer(),
                        returnDeferredsArray = [];

                    if ( photos.entries ) {
                        photos.entries.forEach(function(value) {
                            returnDeferredsArray.push(fotki.photos.delete(value.links.edit));
                        });

                        return VOW.when.apply(VOW.when, returnDeferredsArray);
                    } else {
                        returnDeferred.resolve();

                        return returnDeferred;
                    }
                });
        },

        /**
         * Delete album
         * @param {String} uri Target album 'self' link
         * @returns {Promise}
         */
        delete: function(uri) {
            return fotki._makeRequest({
                uri: uri,
                method: 'DELETE'
            });
        },

        /**
         * Delete album
         * @param {String} name Target album's name
         * @returns {Promise}
         */
        deleteByName: function(name) {
            return fotki.albums.getByName(name)
                .then(function(albumsArray) {
                    var returnDeferredsArray = [];

                    albumsArray.forEach(function(value, index, array) {
                        returnDeferredsArray.push(fotki.albums.delete(value.links.self));
                    });

                    return VOW.when.apply(VOW.when, returnDeferredsArray);
                });
        }
    },

    photos: {
        /**
         * Get album photo collection
         * @param {String} uri Album "photos" link
         * @returns {Promise}
         */
        getCollection: function(uri) {
            return fotki._makeRequest({ uri: uri });
        },

        /**
         * Get photo data
         * @param {String} uri Target photo 'self' link
         * @returns {Promise}
         */
        get: function(uri) {
            return fotki._makeRequest({
                uri: uri
            });
        },

        uploadBinary: function(uri, file, type) {
            return fotki._makeRequest({
                uri: uri,
                method: 'POST',
                body: file,
                contentType: type
            });
        },

        /**
         * Upload single image
         * @param {String} uri Album's 'photos' link
         * @param {String} filePath Path to target image
         * @returns {Promise}
         */
        upload: function(uri, filePath) {
            var imageType = /\.(png|jpg|gif|bmp)$/i.exec(filePath);

            imageType = imageType && imageType[1];

            return fotki._makeRequest({
                uri: uri,
                method: 'POST',
                body: FS.readFileSync(filePath),
                contentType: 'image/' + imageType.toLowerCase()
            });
        },

        /**
         * Edit photo data
         * @param {String} photoEntry Target photo entity
         * @param {Object} options Data to change
         * @param {String} [options.title] Photo name; can't bee empty string
         * @param {String} [options.summary] Photo description
         * @param {String|Boolean} [options.xxx="false"] Adult flag; write-only
         * @param {String|Boolean} [options.disable_comments="false"] Is commenting disabled flag
         * @param {String|Boolean} [options.hide_original="false"] Is original photo hide for public flag
         * @param {String} [options.access="public"] Photo access level
         * @param {String} [options.link] Photo's parent album 'href' link
         * @param {Object} [options.category] Photo tag
         * @param {String} options.category.term Photo tag name
         * @param {String} options.category.scheme Link on tags collection(find it in user's service document)
         * @returns {Promise}
         */
        edit: function(photoEntry, options) {
            var newPhotoEntry = photoEntry;

            for ( var key in options ) {
                if ( options.hasOwnProperty(key) ) {
                    newPhotoEntry[key] = options[key];
                }
            }

            return fotki._makeRequest({
                uri: photoEntry.links.edit,
                method: 'PUT',
                body: JSON.stringify(newPhotoEntry)
            });
        },

        /**
         * Delete photo
         * @param {String} uri Target photo 'self' link
         * @returns {Promise}
         */
        delete: function(uri) {
            return fotki._makeRequest({
                uri: uri,
                method: 'DELETE'
            });
        }
    }
});

module.exports = fotki;
