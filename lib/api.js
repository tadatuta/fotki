var FS = require('fs'),
    PATH = require('path'),
    VOW = require('vow'),
    Iterator = require('./iterator'),
    utils = require('./utils');

// TODO: caching?
// TODO: streams (run few requests in parallel)?

var api;

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
     * @param {String} [params.contentType="application/json;type=entry"] Request content-type
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
        var match = uri.match(/(^.+?\/?)(?:(\w+);([^,]+Z)(?:,(\d*?))?(?:,(\d*?))?\/?)?(?:\?limit=(\d+))?$/);

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
        var parsed = this._parseCollectionUri(uri),
            mergedOpts = Object.keys(parsed)
                .concat(Object.keys(params))
                .filter(function(value, index, array) { return array.indexOf(value) === index; })
                .reduce(function(prev, key) {
                    prev[key] = params[key] !== undefined ? params[key] : parsed[key];
                    return prev;
                }, {});

        return this._buildCollectionUri(mergedOpts);
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

    uploadBinary : function() {},
    uploadMultipartForm : function() {},

    /**
     * Provides iterator by collection
     * @param {String} uri Collection uri
     * @param {Object} params Pagination and sorting params
     * @returns {Iterator} Iterator by collection
     * @method getCollection
     */
    getCollection : function(uri, params) {
        if(!uri || typeof uri !== 'string') throw new Error('Uri not defined or invalid)');

        var _this = this,
            nextLink;

        return new Iterator(function(index) {
            return _this.get(index > 0 ? nextLink : _this._mergeCollectionUri(uri, params)).then(function(data) {
                nextLink = data.links.next;
                return VOW.fulfill([data, !!nextLink]);
            });
        });
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

        return this.getServiceDocument().then(function(res) {
            return _this._request({
                body : JSON.stringify({
                    title : String(params.title),
                    summary : String(params.summary) || undefined,
                    password : String(params.password) || undefined,
                    links : params.link ? { album : String(params.link) } : undefined
                }),
                method : 'POST',
                uri : res.collections['album-list']
            });
        });
    },

    /**
     * Uploads image
     * @param {String} path Path to image
     * @param {Object} params
     * @param {Object} [params.link] Album 'photos' link
     * @returns {Promise} Resolves with created entry
     * @method uploadPhoto
     */
    uploadImage : function(path, params) {
        var extname = PATH.extname(path).slice(1).toLowerCase(),
            request = function(uri) {
                return this._request({
                    body : FS.readFileSync(path),
                    contentType : 'image/' + extname,
                    method : 'POST',
                    uri : uri
                });
            }.bind(this);

        if(['png', 'jpg', 'jpeg', 'gif', 'bmp'].indexOf(extname) === -1) {
            throw new Error('Invalid file extension');
        }

        if(params.link) return request(params.link);

        return this.getServiceDocument().then(function(res) {
            return request(res.collections['photo-list']);
        });
    }
};

module.exports = api;
