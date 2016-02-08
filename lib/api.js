var FS = require('fs'),
    PATH = require('path'),
    URL = require('url'),
    VOW = require('vow'),
    Iterator = require('./iterator'),
    utils = require('./utils'),
    api;

/**
 * Yandex.fotki NodeJs API
 * @module Fotki
 */
api = {
    /**
     * HTTP request
     * @param {Object} params
     * @param {String} params.uri Resource uri
     * @param {String} [params.method="GET"] Request method
     * @param {String} [params.body] Request body
     * @param {String} [params.contentType="application/json"] Request content-type
     * @returns {Promise} Resolves with parsed JSON or text
     * @private
     * @method _request
     */
    _request : function(params)  {
        if(!params || !params.uri || typeof params.uri !== 'string') {
            throw new Error('Params.uri not defined or invalid');
        }

        return utils.request({
            body : params.body,
            formData : params.formData,
            headers : {
                Accept : 'application/json',
                'Content-Type' : params.contentType || 'application/json',
                Authorization : this._token ? 'OAuth ' + this._token : undefined
            },
            method : params.method,
            uri : params.uri
        }).then(function(res) {
            try {
                return JSON.parse(res);
            } catch(e) {
                return res;
            }
        });
    },

    /**
     * Parses uri to find pagination, sorting and limit params.
     * @param {String} uri Target uri
     * @returns {object}
     * @private
     * @see https://tech.yandex.ru/fotki/doc/operations-ref/collection-partial-lists-docpage/
     * @method _parseCollectionUri
     */
    _parseCollectionUri : function(uri) {
        var match = uri.match(/(^.+?\/?)(?:(\w+);([^,]+Z)(?:,(\d*?))?(?:,(\d*?))?\/?)?(?:\?.*?limit=(\d+).*?)?$/);

        return ['base', 'sort', 'time', 'id', 'uid', 'limit'].reduce(function(prev, key, index) {
            if(match[index + 1]) prev[key] = match[index + 1];
            return prev;
        }, {});
    },

    /**
     * Creates uri with pagination, sort and limit params from object
     * @param {Object} opts
     * @param {String} opts.base
     * @param {String} [opts.sort]
     * @param {String} [opts.time]
     * @param {String} [opts.id]
     * @param {String} [opts.uid]
     * @param {Number} [opts.limit]
     * @returns {String}
     * @private
     * @see https://tech.yandex.ru/fotki/doc/operations-ref/collection-partial-lists-docpage/
     * @method _buildCollectionUri
     */
    _buildCollectionUri : function(opts) {
        // TODO: валидировать время? все параметры?
        if(!opts.base || typeof opts.base !== 'string') throw Error('Param "base" invalid or not defined');

        var uri = opts.base,
            // [,,1,,] => [,,1]
            trimLast = function(arr) {
                for(var i = arr.length - 1; i >= 0; i -= 1) {
                    if(arr[i]) return arr.slice(0, i + 1);
                }
                return [];
            };

        if(opts.sort && opts.time) {
            uri += (uri[uri.length - 1] === '/' ? '' : '/') +
                opts.sort + ';' + opts.time + trimLast(['', opts.id, opts.uid]).join(',') + '/';
        }

        if(opts.limit) uri += '?limit=' + opts.limit;

        return uri;
    },

    /**
     * Creates uri for pagination and sorting
     * @param {String} uri Collection uri
     * @param {Object} params
     * @param {String} [params.sort] Sort type
     * @param {String} [params.time] Creation entry time(UTC format, precision - seconds)
     * @param {Number} [params.id] Entry id
     * @param {Number} [params.uid] User id
     * @param {Number} [params.limit] Maximum entities number
     * @returns {String} Merged uri with params
     * @private
     * @see https://tech.yandex.ru/fotki/doc/operations-ref/collection-partial-lists-docpage/
     * @method _mergeCollectionUri
     */
    _mergeCollectionUri : function(uri, params) {
        var parsedUri = URL.parse(uri, true),
            opts = this._parseCollectionUri(parsedUri.protocol + '//' + parsedUri.host + parsedUri.pathname),
            mergedOpts = Object.keys(opts)
                .concat(Object.keys(params))
                .filter(function(value, index, array) { return array.indexOf(value) === index; })
                .reduce(function(prev, key) {
                    prev[key] = params[key] !== undefined ? params[key] : opts[key];
                    return prev;
                }, {}),
            rez = URL.parse(this._buildCollectionUri(mergedOpts), true);

        rez.search = '';
        rez.query = parsedUri.query;
        if(mergedOpts.limit) rez.query.limit = mergedOpts.limit;
        rez.hash = parsedUri.hash;

        return URL.format(rez);
    },

    _matchObject : function(query, object) {
        return Object.keys(query).every(function(key) {
            return typeof query[key] === 'function' ? query[key](object[key]) :
                query[key] instanceof RegExp ? query[key].test(object[key]) : query[key] === object[key];
        });
    },

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
     * Deletes entry
     * @param {String} uri Entry's 'self' link
     * @returns {Promise} Resolves with empty string
     * @method delete
     */
    delete : function(uri) {
        return this._request({
            method : 'DELETE',
            uri : uri
        });
    },

    /**
     * Provides entry data
     * @param {String} uri Entry's 'self' link
     * @returns {Promise} Resolves with entry
     * @method get
     */
    get : function(uri) {
        return this._request({
            method : 'GET',
            uri : uri
        });
    },

    /**
     * Updates entry data
     * @param {String} uri Entry's 'self' link
     * @param {Object} data Changes
     * @returns {Promise} Resolves with updated entry
     * @method update
     */
    update : function(uri, data) {
        return this._request({
            body : JSON.stringify(data),
            method : 'PUT',
            uri : uri
        });

        //var _this = this;
        //
        //return this.get(uri).then(function(entry) {
        //    Object.keys(data).forEach(function(key) { entry[key] = data[key]; });
        //});
    },

    post : function(uri, data, contentType) {
        return this._request({
            body : data,
            contentType : contentType,
            method : 'POST',
            uri : uri
        });
    },

    uploadMultipartFormData : function(uri, formData) {
        return this._request({
            formData : formData,
            contentType : 'multipart/form-data',
            method : 'POST',
            uri : uri
        });
    },

    /**
     * Provides iterator by collection
     * @param {String} uri Collection uri
     * @param {Object} params Pagination and sorting params
     * @param {String} [params.sort] 'Sort by' param
     * @param {String} [params.time] creation time
     * @param {Number} [params.id] id of entry
     * @param {Number} [params.uid] id of author
     * @param {Number} [params.limit] Number of elements per page
     * @returns {Iterator} Iterator by collection
     * @method getCollection
     * @see https://tech.yandex.ru/fotki/doc/operations-ref/collection-partial-lists-docpage/
     */
    getCollection : function(uri, params) {
        if(!uri || typeof uri !== 'string') throw new Error('Uri not defined or invalid)');

        var _this = this,
            nextLink;

        return new Iterator(function(index) {
            return _this.get(index > 0 ? nextLink : _this._mergeCollectionUri(uri, params || {})).then(function(data) {
                nextLink = data.links.next;
                return VOW.fulfill([data, !!nextLink]);
            });
        });
    },

    getCollectionEntries : function(uri, query, params) {
        var match = this._matchObject.bind(this, query);

        return utils.getFilteredIterator(this.getCollection(uri, params), function(collection) {
            return collection.entries.filter(match);
        }, params && params.limit);
    },

    /**
     * Provides links on user collections(photos, albums, tags)
     * @param {String} username Name of target user
     * @returns {Promise} Resolves with 'service document'
     * @method getServiceDocument
     */
    getServiceDocument : function(username) {
        if(!username || typeof username !== 'string') throw new Error('Username invalid or not defined');

        return this.get('http://api-fotki.yandex.ru/api/users/' + username + '/');
    },

    /**
     * Creates new album
     * @param {Object} params
     * @param {String} params.title Title(can't be empty string)
     * @param {String} [params.summary] Description
     * @param {String} [params.password] Password(empty string for deleting password)
     * @param {String} [params.link] link on parent album
     * @returns {Promise} Resolves with created entry
     * @method createAlbum
     */
    createAlbum : function(params) {
        if(!params || !params.title) throw new Error('Params.title invalid or not defined');

        var _this = this;

        return this.getServiceDocument(this._username).then(function(res) {
            return _this.post(res.collections['album-list'].href, JSON.stringify({
                title : params.title,
                summary : params.summary,
                password : params.password,
                links : { album : params.link }
            }));
        });
    },

    /**
     * Uploads image
     * @param {String} path Path to image
     * @param {Object} params
     * @param {String} [uri] Album 'photos' link
     * @returns {Promise} Resolves with created entry
     * @method uploadPhoto
     */
    upload : function(path, params, uri) {
        var _this = this,
            collectionUri = typeof params === 'string' ? params : uri,
            extname = PATH.extname(path).slice(1).toLowerCase(),
            upload = function(uri) {
                var formData = {
                    image : {
                        value : FS.createReadStream(path),
                        options : {
                            filename : PATH.basename(path),
                            contentType : 'image/' + extname
                        }
                    }
                };

                if(typeof params === 'object') {
                    Object.keys(params).forEach(function(key) { formData[key] = params[key]; });
                    return _this.uploadMultipartFormData(uri, formData);
                } else {
                    return _this.post(uri, FS.readFileSync(path), 'image/' + extname);
                }
            };

        if(['png', 'jpg', 'jpeg', 'gif', 'bmp'].indexOf(extname) === -1) {
            throw new Error('Invalid file extension');
        }

        if(collectionUri) return upload(collectionUri);

        return this.getServiceDocument(this._username).then(function(res) {
            return upload(res.collections['photo-list'].href);
        });
    },

    /**
     * Provides collection of new interesting photos.
     * Auth is not required.
     * @returns {Promise} Resolves with response
     */
    getRecentPhotosCollection : function(params) {
        return this.getCollection('http://api-fotki.yandex.ru/api/recent', params);
    },

    /**
     * Provides collection of popular photos(50 photos, which are selected by a vote of the users).
     * Auth is not required.
     * @returns {Promise} Resolves with response
     */
    getPopularPhotosCollection : function(params) {
        return this.getCollection('http://api-fotki.yandex.ru/api/top', params);
    },

    /**
     * Provides collection of 'photo of the day'.
     * Auth is not required.
     * @returns {Promise} Resolves with response
     */
    getPODCollection : function(params) {
        return this.getCollection('http://api-fotki.yandex.ru/api/podhistory', params);
    }
};

module.exports = api;
