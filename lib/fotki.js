// TODO: use streams, generate notify
// TODO: delete request?

var http = require('http'),
    FS = require('fs'),
    REQUEST = require('request'),
    VOW = require('vow');

var Iterator;

var apiHost = 'api-fotki.yandex.ru',
    fotki = {
        _makeRequest : (function() {
            var _cache = {};

            /**
             * Create HTTP request to service api
             * @param {Object} params Request params
             * @param {String} [params.uri="http://{apiHost}/api/users/{username}/"] Request uri
             * @param {String} [params.method="GET"] Request method
             * @param {String} [params.json] Request get-params
             * @param {String} [params.body] Request body
             * @param {String} [params.contentType="application/json;type=entry"] Request content-type
             * @param {String} [params.cache] Cache response permanently
             * @returns {Promise}
             * @private
             */
            return function(params) {
                var returnDeferred = VOW.defer(),
                    options = params || {},
                    uri = 'http://' + (apiHost + '/api/' + options.path).replace(/\/{2,}/g, '/');

                // TODO: add cache expiring?
                if(_cache[uri]) {
                    returnDeferred.resolve(_cache[uri]);
                } else {
                    REQUEST({
                        uri : uri + (uri.lastIndexOf('?') > -1 && uri.lastIndexOf('?') > uri.lastIndexOf('/') ?
                            '' : '/'),
                        method : options.method || 'GET',
                        json : options.json || null,
                        body : options.body || null,
                        headers : {
                            Accept : 'application/json',
                            'Content-Type' : options.contentType || 'application/json;type=entry',
                            Authorization : 'OAuth ' + this._token
                        }
                    }, function(err, res, body) {
                        var response;

                        if(err) return returnDeferred.reject.call(returnDeferred, err);
                        if(res.statusCode < 200 || res.statusCode >= 300) {
                            return returnDeferred.reject.call(returnDeferred, {
                                target : res.request.uri.href,
                                statusCode : res.statusCode,
                                statusMessage : http.STATUS_CODES[res.statusCode]
                            });
                        }

                        try {
                            response = JSON.parse(body);
                        } catch(e) {
                            response = body;
                        }

                        if(options.cache) _cache[uri] = response;

                        returnDeferred.resolve(response);
                    });
                }

                return returnDeferred.promise();
            };
        }()),

        /**
         * Set authorize data
         * @param {String} username User's login
         * @param {String} token OAuth token
         * @returns {this}
         */
        auth : function(username, token) {
            this._username = username;
            this._token = token;

            return this;
        },

        /**
         * Provides links on user collections(photos, albums, tags)
         * @returns {Promise} Resolves with response
         */
        getServiceDocument : function() {
            return this._makeRequest({
                path : ['users', this._username].join('/'),
                cache : true
            });
        },

        /**
         * Method for adding albums or uploading photos.
         * @param {String} type
         * @param {Object} params
         * @param {String} [parentType]
         * @param {String} [parentId]
         * @returns {*}
         */
        addEntry : function(type, params, parentType, parentId) {
            return this._makeRequest({
                body : JSON.stringify(params),
                method : 'POST',
                path : ['users', this._username]
                    .concat(parentType && parentId ? [parentType, parentId] : [])
                    .concat(type)
                    .join('/')
            });
        },

        getEntry : function(type, id) {
            return this._makeRequest({
                path : ['users', this._username, type, id].join('/')
            });
        },

        updateEntry : function(type, id, entry) {
            return this._makeRequest({
                body : JSON.stringify(entry),
                method : 'PUT',
                path : ['users', this._username, type, id].join('/')
            });
        },

        deleteEntry : function(type, id) {
            return this._makeRequest({
                method : 'DELETE',
                path : ['users', this._username, type, id].join('/')
            });
        },

        getCollection : function(type, parentType, parentId, params) {
            var options = params || (typeof parentType === 'object' ? parentType : {});

            return this._makeRequest({
                path : [].concat(['podhistory', 'resent', 'top'].indexOf(type) === -1 ? ['users', this._username] : [])
                    .concat(parentType && parentId ? [parentType, parentId] : [])
                    .concat(type)
                    .concat(options.sort ?
                        options.sort + ';' + [options.time].concat(options.id || [], options.uid || []).join(',') : [])
                    .concat(options.limit ? '?limit=' + options.limit : [])
                    .join('/')
            });
        },


        /**
         * Creates new album.
         * @param {Object} params
         * @param {String} params.title Title(can't be empty string)
         * @param {String} [params.summary] Description
         * @param {String} [params.password] Password(empty string for deleting password)
         // TODO: id instead of link?
         * @param {String} [params.link] link on parent album
         * @returns {Promise} Resolves with response
         */
        addAlbum : function(params) {
            return this.addEntry('albums', params);
        },

        /**
         * Get album entry
         * @param {String|Number} id album's id
         * @returns {Promise} Resolves with response
         */
        getAlbum : function(id) {
            return this.getEntry('album', id);
        },

        /**
         * Edit album entry
         * @param {String|Number} id album's id
         * @param {Object} params
         * @param {String} [params.title] Title(can't be empty string).
         * @param {String} [params.summary] Description
         * @param {String} [params.password] Password(empty string for deleting password)
         // TODO: id instead of link?
         * @param {String} [params.link] link on parent album
         * @returns {Promise} Resolves with response
         */
        updateAlbum : function(id, params) {
            return this.updateEntry('album', id, params);
        },

        deleteAlbum : function(id) {
            return this.deleteEntry('album', id);
        },

        addPhoto : function(params, parentId) {
            return this.addEntry('photo', {}, 'album', parentId);
        },

        /**
         * Get photo entry
         * @param {String|Number} id photo's id
         * @returns {Promise} Resolves with response
         */
        getPhoto : function(id) {
            return this.getEntry('photo', id);
        },

        /**
         * Edit photo entry
         * @param {String|Number} id photo's id
         * @param {Object} params
         * @param {String} [params.title] Title(can't be empty string).
         * @param {String} [params.summary] Description
         * @param {Boolean} [params.xxx=false] Adult flag(can't be deleted, only set)
         * @param {Boolean} [params.disable_comments=false] Disable commenting
         * @param {Boolean} [params.hide_original=false] Disable access to photo's origin
         * @param {String} [params.access='public'] Access level(can be public|friends|private)
         // TODO: id?
         // TODO: albums not nest
         * @param {String} [params.link] Link on parent album
         // TODO:check
         * @param {Object} [params.tags] Key - tag name, value - tags collection link from service document
         * @returns {Promise} Resolves with response
         */
        updatePhoto : function(id, params) {
            var _this = this;

            // TODO: check, seems like we can send only diff
            return this.getPhoto().then(function(data) {
                // TODO: extend method?
                Object.keys(params).forEach(function(key) { data[key] = params[key]; });

                return _this.updateEntry('photo', id, params);
            });
        },

        deletePhoto : function(id) {
            return this.deleteEntry('photo', id);
        },

        // TODO: movePhoto? change entry href

        /**
         * Get tag entry
         * @param {String|Number} id tag's id
         * @returns {Promise} Resolves with response
         */
        getTag : function(id) {
            return this.getEntry('tag', id);
        },


        updateTag : function(id, params) {
            return this.updateEntry('tag', id, params);
        },

        /**
         * Delete tag entry
         * @param {String|Number} id tag's id
         * @returns {Promise} Resolves with response
         */
        deleteTag : function(id) {
            return this.deleteEntry('tag', id);
        },

        /**
         * Provides collection of all albums.
         * @returns {Promise} Resolves with response
         */
        getAlbumsCollection : function(params) {
            return new Iterator(['albums', params]);
        },

        /**
         * Provides collection of all photos.
         * @returns {Promise} Resolves with response
         */
        getPhotosCollection : function() {
            return new Iterator(['photos']);
        },

        /**
         * Provides collection of all tags.
         * @returns {Promise} Resolves with response
         */
        getTagsCollection : function() {
            return new Iterator(['tags']);
        },

        /**
         * Provides collection of photo, that belongs to this album.
         * @param {String|Number} id Album id
         * @returns {Promise} Resolves with response
         */
        getAlbumPhotosCollection : function(id) {
            return new Iterator(['photos', 'album', id]);
        },

        /**
         * Provides collection of photo, that marked by this tag.
         * @param {String|Number} id Tag id
         * @returns {Promise} Resolves with response
         */
        getTagPhotosCollection : function(id) {
            return new Iterator(['photos', 'tag', id]);
        },

        /**
         * Provides collection of new interesting photos.
         * Auth is not required.
         * @returns {Promise} Resolves with response
         */
        getRecentPhotosCollection : function() {
            return new Iterator(['recent']);
        },

        /**
         * Provides collection of popular photos(50 photos, which are selected by a vote of the users).
         * Auth is not required.
         * @returns {Promise} Resolves with response
         */
        getPopularPhotosCollection : function() {
            return new Iterator(['top']);
        },

        /**
         * Provides collection of 'photo of the day'.
         * Auth is not required.
         * @returns {Promise} Resolves with response
         */
        getPODCollection : function() {
            return new Iterator(['podhistory']);
        },

        /**
         * @static
         */
        albums : {
            /**
             * Returns collection of albums with target name
             * @param {String} name Album's name
             * @returns {Promise}
             */
            getByName : function(name) {
                return fotki.albums.getCollection()
                    .then(function(albums) {
                        var returnDeferred = VOW.defer(),
                            collection = albums.filter(function(album) {
                                return album.title === name;
                            });

                        returnDeferred.resolve(collection);

                        return returnDeferred.promise();
                    });
            },

            /**
             * Delete all photos in album
             * @param {String} uri Target album 'self' link
             * @returns {Promise}
             */
            clear : function(uri) {
                return fotki.photos.get(uri)
                    .then(function(photos) {
                        var returnDeferred = VOW.defer(),
                            returnDeferredsArray = [];

                        if(photos.entries) {
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
             * @param {String} name Target album's name
             * @returns {Promise}
             */
            deleteByName : function(name) {
                return fotki.albums.getByName(name)
                    .then(function(albumsArray) {
                        var returnDeferredsArray = [];

                        albumsArray.forEach(function(value) {
                            returnDeferredsArray.push(fotki.albums.delete(value.links.self));
                        });

                        return VOW.when.apply(VOW.when, returnDeferredsArray);
                    });
            }
        },

        photos : {
            uploadBinary : function(uri, file, type) {
                return fotki._makeRequest({
                    uri : uri,
                    method : 'POST',
                    body : file,
                    contentType : type
                });
            },

            /**
             * Upload single image
             * @param {String} uri Album's 'photos' link
             * @param {String} filePath Path to target image
             * @returns {Promise}
             */
            upload : function(uri, filePath) {
                var imageType = /\.(png|jpg|jpeg|gif|bmp)$/i.exec(filePath),
                    defer = VOW.defer();

                imageType = imageType && imageType[1];
                imageType = imageType && imageType.replace(/jpeg/i, 'jpg').toLowerCase();

                if(!imageType) defer.reject({
                    target : filePath,
                    statusMessage : 'Invalid file extension(expected png/jpg/jpeg/gif/bmp)'
                });

                FS.readFile(filePath, function(err, data) {
                    if(err) defer.reject({
                        target : filePath,
                        statusMessage : 'File not exist'
                    });
                    if(data === 0) defer.reject({
                        target : filePath,
                        statusMessage : 'File is empty'
                    });

                    fotki._makeRequest({
                        uri : uri,
                        method : 'POST',
                        body : data,
                        contentType : 'image/' + imageType
                    }).then(function() { defer.resolve.apply(defer, arguments); },
                        function() { defer.reject.apply(defer, arguments); },
                        function() { defer.notify.apply(defer, arguments); });
                });

                return defer.promise();
            }
        },

        helpers : {
            /**
             * Iterate on array and applying function on each element
             * @param {Array} array Array of data
             * @param {Function} handler Data handler, must return {Promise}
             * @param {Number} streamNumber Number of parallel streams
             * @returns {Promise} Returnable promise resolved by all data processing results
             */
            recursiveArray : function(array, handler, streamNumber) {
                var itemDeferreds = array.map(function() { return VOW.defer(); }),
                    totalDeferred = VOW.defer(),
                    itemsInStream;

                streamNumber = streamNumber ? streamNumber <= array.length ? streamNumber : array.length : 1;
                itemsInStream = array.length / streamNumber;

                VOW.all(itemDeferreds.map(function(defered) { return defered.promise(); })).then(function() {
                    totalDeferred.resolve.apply(totalDeferred, arguments);
                }, function() {
                    totalDeferred.reject.apply(totalDeferred, arguments);
                });

                for(var i = 0; i < streamNumber; i += 1) {
                    (function recursion(startIndex, endIndex) {
                        if(startIndex < endIndex) {
                            handler(array[startIndex]).then(function() {
                                itemDeferreds[startIndex].resolve.apply(itemDeferreds[startIndex], arguments);
                                recursion(startIndex + 1, endIndex);
                            }, function() {
                                itemDeferreds[startIndex].reject.apply(itemDeferreds[startIndex], arguments);
                            }, function() {
                                totalDeferred.notify.apply(totalDeferred, arguments);
                            });
                        }
                    }(Math.ceil(i * itemsInStream), i + 1 === streamNumber ? array.length :
                        Math.ceil(i * itemsInStream + itemsInStream)));
                }

                return totalDeferred.promise();
            },

            /**
             * Upload images to first founded by name album(if album not found - creates it).
             * @param {Object} album
             * @param {String} album.title
             * @param {Array} album.images
             * @param {Object} album.images[...]
             * @param {String} album.images[...].path
             * @param {String} album.images[...].title
             * @returns {*}
             */
            uploadAlbum : function(album) {
                return fotki.albums.getByName(album.title)
                    .then(function(albums) {
                        if(!albums.length) return fotki.albums.create({ title : album.title }).then(function() {
                            return fotki.albums.getByName(album.title);
                        });

                        {
                            return fotki.albums.create({ title : album.title }).then(function() {
                                return fotki.albums.getByName(album.title);
                            }).then(function(albums) {
                                return fotki.helpers.recursiveArray(album.images, function(image) {
                                    return fotki.photos.upload(albums[0].links.photos,
                                        image.path).then(function(photo) {
                                            return fotki.photos.edit(photo, {
                                                access : 'public',
                                                title : image.title
                                            });
                                        });
                                }, 5);
                            });
                        }
                        return fotki.helpers.recursiveArray(album.images, function(image) {
                            return fotki.photos.upload(albums[0].links.photos, image.path).then(function(photo) {
                                return fotki.photos.edit(photo, {
                                    access : 'public',
                                    title : image.title
                                });
                            });
                        }, 5);
                    });
            }
        }
    };

Iterator = function(args) {
    this._args = args.filter(function(v) { return v !== undefined; });
    this._cache = [];
    this._index = 0;
    this._requestedCurrent = false;
};

Iterator.prototype._get = function(index) {
    var _this = this,
        args,
        nextParams,
        defer,
        promise;

    if(!this._cache[index]) {
        if(index === 0) args = this._args;
        else {
            nextParams = this._cache[index - 1].links.next.match(/^.+\/(\w+);([^,]+Z),?(\d*?),?(\d*?)\/\?limit=(\d+)$/);
            args = this._args.filter(function(arg) { return typeof arg !== 'object'; }).concat({
                sort : nextParams[1],
                time : nextParams[2],
                id : nextParams[3],
                uid : nextParams[4],
                limit : nextParams[5]
            });
        }
        promise = fotki.getCollection.apply(fotki, args);
        promise.then(function(res) { _this._cache[index] = res; });
    } else {
        defer = VOW.defer();
        defer.resolve(this._cache[index]);
        promise = defer.promise();
    }

    promise.then(function() { _this._requestedCurrent = true; });

    return promise;
};

Iterator.prototype.current = function() {
    return this._get(this._index);
};

Iterator.prototype.hasNext = function() {
    return !this._cache[this._index] || !!this._cache[this._index].links.next;
};

Iterator.prototype.next = function() {
    var _this = this,
        promise;

    if(!this.hasNext()) return;
    if(this._index === 0 && !this._requestedCurrent) {
        return this.current();
    }

    promise = this._get(this._index + 1);
    promise.then(function() { _this._index += 1; });

    return promise;
};

Iterator.prototype.all = function() {
    var _this = this,
        defer = VOW.defer();

    this.rewind();

    (function recursion(iterator) {
        if(!iterator.hasNext()) {
            defer.resolve(_this._cache);
        }

        iterator.next().then(function() {
            defer.notify.apply(defer, arguments);
            recursion(iterator);
        }).fail(function() {
            defer.reject.apply(defer, arguments);
        });
    }(this));

    return defer.promise();
};

Iterator.prototype.rewind = function() {
    this._index = 0;
    this._requestedCurrent = false;
    return this;
};


//var CollectionIterator = function() {
//
//};


module.exports = fotki;
