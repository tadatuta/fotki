var http = require('http'),
    FS = require('fs'),
    PATH = require('path'),
    REQUEST = require('request'),
    VOW = require('vow'),
    Iterator = require('./iterator');

// TODO: refactoring all methods from id to links(entries?) in arguments.
// TODO: caching?
// TODO: streams (run few requests in parallel)?

var apiHost = 'api-fotki.yandex.ru',
    /**
     * Yandex.fotki NodeJs API
     * @module Fotki
     */
    api = {
        /**
         * Create HTTP request to service api
         * @param {Object} params Request params
         * @param {String} params.path Part of request uri(example: '%user%/albums' or 'top')
         * @param {String} [params.method="GET"] Request method
         * @param {String} [params.body] Request body
         * @param {String} [params.contentType="application/json;type=entry"] Request content-type
         * @returns {Promise}
         * @private
         */
        _request : function(params) {
            if(!params || !params.path) throw new Error('Params.path not defined or invalid(expected {String})');

            var needAuth = params.path.indexOf('%user%') > -1;

            if(needAuth) {
                if(!this._username) throw new Error('Require authorization: username not set');
                if(!this._token) throw new Error('Require authorization: access token not set');
            }

            var options = params || {},
                uri = 'http://' + (apiHost + '/api/' + options.path.replace('%user%', 'users/' + this._username))
                        .replace(/\/{2,}/g, '/'),
                defer = VOW.defer();

            uri += uri.lastIndexOf('?') > -1 && uri.lastIndexOf('?') > uri.lastIndexOf('/') ? '' : '/';

            REQUEST({
                uri : uri,
                method : options.method || 'GET',
                body : options.body || null,
                headers : {
                    Accept : 'application/json',
                    'Content-Type' : options.contentType || 'application/json;type=entry',
                    Authorization : needAuth ? 'OAuth ' + this._token : undefined
                }
            }, function(err, res, body) {
                var response;

                if(err) return defer.reject.call(defer, err);
                if(res.statusCode < 200 || res.statusCode >= 300) {
                    return defer.reject.call(defer, {
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

                defer.resolve(response);
            });

            return defer.promise();
        },

        _makeRequest : (function() {
            var _cache = {};

            return function(params) {
                if(!_cache[params.path]) {
                    _cache[params.path] = this._request.apply(this, arguments);
                    _cache[params.path].always(function() {
                        delete _cache[params.path];
                    });
                }

                return _cache[params.path];
            };
        }()),

        /**
         * Set authorize data
         * @param {String} username User's login
         * @param {String} token OAuth token
         * @returns {this}
         * @method auth
         */
        auth : function(username, token) {
            this._username = username;
            this._token = token;

            return this;
        },

        /**
         * Provides links on user collections(photos, albums, tags)
         * @returns {Promise} Resolves with response
         * @method getServiceDocument
         */
        getServiceDocument : function() {
            return this._makeRequest({ path : '%user%' });
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
                path : ['%user%']
                    .concat(parentType && parentId ? [parentType, parentId] : [])
                    .concat(type)
                    .join('/')
            });
        },

        getEntry : function(type, id) {
            if(!type) throw new Error('Type is required');
            if(!id) throw new Error('Id is required');

            return this._makeRequest({
                path : ['%user%', type, id].join('/')
            });
        },

        updateEntry : function(type, id, entry) {
            if(!type) throw new Error('Type is required');
            if(!id) throw new Error('Id is required');

            return this._makeRequest({
                body : JSON.stringify(entry),
                method : 'PUT',
                path : ['%user%', type, id].join('/')
            });
        },

        deleteEntry : function(type, id) {
            if(!type) throw new Error('Type is required');
            if(!id) throw new Error('Id is required');

            return this._makeRequest({
                method : 'DELETE',
                path : ['%user%', type, id].join('/')
            });
        },

        getCollection : function(type, parentType, parentId, params) {
            if(typeof parentType === 'string' && ['number', 'string'].indexOf(typeof parentId) === -1) {
                throw new Error('parent id not set');
            }

            var options = params || (typeof parentType === 'object' ? parentType : {});

            return this._makeRequest({
                path : [].concat(['podhistory', 'recent', 'top'].indexOf(type) === -1 ? ['%user%'] : [])
                    .concat(parentType && parentId ? [parentType, parentId] : [])
                    .concat(type)
                    .concat(options.sort ?
                        options.sort + ';' + [options.time].concat(options.id || [], options.uid || []).join(',') : [])
                    .concat(options.limit ? '?limit=' + options.limit : [])
                    .join('/')
            });
        },

        /**
         * @param {String} type
         * @param {String} parentType
         * @param {Number|String} parentId
         * @returns {Iterator}
         */
        getCollectionIterator : function(type, parentType, parentId, params) {// jshint unused: false
            var args = Array.prototype.filter.call(arguments, function(v) { return v; }),
                nextLink;

            return new Iterator(function(index) {
                var nextParams,
                    defer = VOW.defer();

                if(index > 0) {
                    nextParams = nextLink.match(/^.+\/(\w+);([^,]+Z),?(\d*?),?(\d*?)\/\?limit=(\d+)$/);
                    args = args.filter(function(arg) { return typeof arg !== 'object'; }).concat({
                        sort : nextParams[1],
                        time : nextParams[2],
                        id : nextParams[3],
                        uid : nextParams[4],
                        limit : nextParams[5]
                    });
                }

                api.getCollection.apply(api, args).then(function(data) {
                    nextLink = data.links.next;
                    defer.resolve([data, !!nextLink]);
                }, function() {
                    defer.reject.apply(defer, arguments);
                });

                return defer.promise();
            });
        },

        getFilteredIterator : function(iterator, filter, size) {
            var stack = [],
                limit = size || 100;

            return new Iterator(function() {
                var defer = VOW.defer();

                (function recursion() {
                    // TODO: can be extra hasNext===true
                    if(stack.length >= limit || !iterator.hasNext()) {
                        defer.resolve([stack.splice(0, limit), !!(stack.length || iterator.hasNext())]);
                        return;
                    }

                    iterator.next().then(function(res) {
                        stack = stack.concat(filter(res));

                        recursion(iterator);
                    }, function() {
                        defer.reject.apply(defer, arguments);
                    });
                }());

                return defer.promise();
            });
        },


        /**
         * Creates new album.
         * @param {Object} params
         * @param {String} params.title Title(can't be empty string)
         * @param {String} [params.summary] Description
         * @param {String} [params.password] Password(empty string for deleting password)
         // TODO: id instead of link? change "link" name?
         * @param {String} [params.link] link on parent album
         * @returns {Promise} Resolves with response
         * @method addAlbum
         */
        addAlbum : function(params) {
            if(!params || !params.title) throw new Error('Empty or invalid title({String} expected)');

            return this.addEntry('albums', {
                title : String(params.title),
                summary : String(params.summary),
                password : String(params.password),
                links : params.link ? { album : String(params.link) } : undefined
            });
        },

        /**
         * Get album entry
         * @param {String|Number} id album's id
         * @returns {Promise} Resolves with response
         * @method getAlbum
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
         * @method updateAlbum
         */
        updateAlbum : function(id, params) {
            if(!params) throw new Error('Nothing to update');
            if(params.hasOwnProperty('title') && !params.title) {
                throw new Error('Empty or invalid title({String} or nothing expected)');
            }

            var opts = ['title', 'summary', 'password'].reduce(function(prev, key) {
                if(params.hasOwnProperty(key)) prev[key] = params[key];
                return prev;
            }, {});

            if(params.link) opts.links = { album : params.link };
            if(!Object.keys(opts).length) throw new Error('Nothing to update');

            return this.updateEntry('album', id, opts);
        },

        /**
         *
         * @param {Number|String} id
         * @returns {*}
         * @method deleteAlbum
         */
        deleteAlbum : function(id) {
            return this.deleteEntry('album', id);
        },

        // TODO: clear album
        // TODO: move album?

        uploadBinary : function() {},
        uploadMultipartForm : function() {},

        /**
         *
         * @method uploadPhoto
         */
        uploadPhoto : function(path, parentId) {
            var extname = PATH.extname(path).slice(1).toLowerCase();

            if(['png', 'jpg', 'jpeg', 'gif', 'bmp'].indexOf(extname) === -1) {
                throw new Error('Invalid file extension(expected png/jpg/jpeg/gif/bmp)');
            }

            return this._makeRequest({
                body : FS.readFileSync(path),
                contentType : 'image/' + extname,
                method : 'POST',
                path : ['%user%']
                    .concat(parentId ? ['album', parentId] : [])
                    .concat('photos')
                    .join('/')
            });
        },

        /**
         * Get photo entry
         * @param {String|Number} id photo's id
         * @returns {Promise} Resolves with response
         * @method getPhoto
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
         * @method updatePhoto
         */
        updatePhoto : function(id, params) {
            if(!params) throw new Error('Nothing to update');
            if(params.hasOwnProperty('title') && !params.title) {
                throw new Error('Empty or invalid title({String} or nothing expected)');
            }

            var opts = [
                'title', 'summary', 'xxx', 'disable_comments', 'hide_original', 'access', 'link', 'tags'
            ].reduce(function(prev, key) {
                    if(params.hasOwnProperty(key)) prev[key] = params[key];
                    return prev;
                }, {});

            if(!Object.keys(opts).length) throw new Error('Nothing to update');

            var _this = this;

            // TODO: when we send only opts 500 occur
            return this.getPhoto(id).then(function(data) {
                // TODO: extend method?
                Object.keys(opts).forEach(function(key) { data[key] = params[key]; });

                return _this.updateEntry('photo', id, data);
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
            if(!params) throw new Error('Nothing to update');
            if(params.hasOwnProperty('title') && !params.title) {
                throw new Error('Empty or invalid title({String} or nothing expected)');
            }

            var opts = ['title'].reduce(function(prev, key) {
                if(params.hasOwnProperty(key)) prev[key] = params[key];
                return prev;
            }, {});

            if(!Object.keys(opts).length) throw new Error('Nothing to update');

            return this.updateEntry('tag', id, opts);
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
            return this.getCollectionIterator('albums', params);
        },

        /**
         * Provides collection of all albums with target name.
         * @param {String} name Album's name
         * @param {Object} params
         * @returns {Iterator}
         */
        getAlbumsCollectionByName : function(name, params) {
            if(!name) throw new Error('Album name not defined or invalid(expected {String})');

            return this.getFilteredIterator(this.getAlbumsCollection(params), function(res) {
                return res.entries.filter(function(entry) {
                    return entry.title === name;
                });
            }, params && params.limit);
        },

        /**
         * Provides collection of all photos.
         * @returns {Promise} Resolves with response
         */
        getPhotosCollection : function(params) {
            return this.getCollectionIterator('photos', params);
        },

        /**
         * Provides collection of all tags.
         * @returns {Promise} Resolves with response
         */
        getTagsCollection : function(params) {
            return this.getCollectionIterator('tags', params);
        },

        /**
         * Provides collection of photo, that belongs to this album.
         * @param {String|Number} id Album id
         * @returns {Promise} Resolves with response
         */
        getAlbumPhotosCollection : function(id, params) {
            return this.getCollectionIterator('photos', 'album', id, params);
        },

        /**
         * Provides collection of photo, that marked by this tag.
         * @param {String|Number} id Tag id
         * @returns {Promise} Resolves with response
         */
        getTagPhotosCollection : function(id, params) {
            return this.getCollectionIterator('photos', 'tag', id, params);
        },

        /**
         * Provides collection of new interesting photos.
         * Auth is not required.
         * @returns {Promise} Resolves with response
         */
        getRecentPhotosCollection : function(params) {
            return this.getCollectionIterator('recent', params);
        },

        /**
         * Provides collection of popular photos(50 photos, which are selected by a vote of the users).
         * Auth is not required.
         * @returns {Promise} Resolves with response
         */
        getPopularPhotosCollection : function(params) {
            return this.getCollectionIterator('top', params);
        },

        /**
         * Provides collection of 'photo of the day'.
         * Auth is not required.
         * @returns {Promise} Resolves with response
         */
        getPODCollection : function(params) {
            return this.getCollectionIterator('podhistory', params);
        },

        /**
         * @static
         */
        albums : {
            /**
             * Delete all photos in album
             * @param {String} uri Target album 'self' link
             * @returns {Promise}
             */
            clear : function(uri) {
                return api.photos.get(uri)
                    .then(function(photos) {
                        var returnDeferred = VOW.defer(),
                            returnDeferredsArray = [];

                        if(photos.entries) {
                            photos.entries.forEach(function(value) {
                                returnDeferredsArray.push(api.photos.delete(value.links.edit));
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
                return api.albums.getByName(name)
                    .then(function(albumsArray) {
                        var returnDeferredsArray = [];

                        albumsArray.forEach(function(value) {
                            returnDeferredsArray.push(api.albums.delete(value.links.self));
                        });

                        return VOW.when.apply(VOW.when, returnDeferredsArray);
                    });
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
                return api.albums.getByName(album.title)
                    .then(function(albums) {
                        if(!albums.length) return api.albums.create({ title : album.title }).then(function() {
                            return api.albums.getByName(album.title);
                        });

                        {
                            return api.albums.create({ title : album.title }).then(function() {
                                return api.albums.getByName(album.title);
                            }).then(function(albums) {
                                return api.helpers.recursiveArray(album.images, function(image) {
                                    return api.photos.upload(albums[0].links.photos,
                                        image.path).then(function(photo) {
                                            return api.photos.edit(photo, {
                                                access : 'public',
                                                title : image.title
                                            });
                                        });
                                }, 5);
                            });
                        }
                        return api.helpers.recursiveArray(album.images, function(image) {
                            return api.photos.upload(albums[0].links.photos, image.path).then(function(photo) {
                                return api.photos.edit(photo, {
                                    access : 'public',
                                    title : image.title
                                });
                            });
                        }, 5);
                    });
            }
        }
    };

module.exports = api;
