//
//({
//    /**
//     * Delete all photos in album
//     * @param {String} uri Target album 'self' link
//     * @returns {Promise}
//     */
//    clearAlbum : function(uri) {
//        return api.photos.get(uri)
//            .then(function(photos) {
//                var returnDeferred = VOW.defer(),
//                    returnDeferredsArray = [];
//
//                if(photos.entries) {
//                    photos.entries.forEach(function(value) {
//                        returnDeferredsArray.push(api.photos.delete(value.links.edit));
//                    });
//
//                    return VOW.when.apply(VOW.when, returnDeferredsArray);
//                } else {
//                    returnDeferred.resolve();
//
//                    return returnDeferred;
//                }
//            });
//    },
//
//    /**
//     * Delete album
//     * @param {String} name Target album's name
//     * @returns {Promise}
//     */
//    deleteAlbumByName : function(name) {
//        return api.albums.getByName(name)
//            .then(function(albumsArray) {
//                var returnDeferredsArray = [];
//
//                albumsArray.forEach(function(value) {
//                    returnDeferredsArray.push(api.albums.delete(value.links.self));
//                });
//
//                return VOW.when.apply(VOW.when, returnDeferredsArray);
//            });
//    },
//
//    /**
//     * Upload images to first founded by name album(if album not found - creates it).
//     * @param {Object} album
//     * @param {String} album.title
//     * @param {Array} album.images
//     * @param {Object} album.images[...]
//     * @param {String} album.images[...].path
//     * @param {String} album.images[...].title
//     * @returns {*}
//     */
//    uploadAlbum : function(album) {
//        return api.albums.getByName(album.title)
//            .then(function(albums) {
//                if(!albums.length) return api.albums.create({ title : album.title }).then(function() {
//                    return api.albums.getByName(album.title);
//                });
//
//                {
//                    return api.albums.create({ title : album.title }).then(function() {
//                        return api.albums.getByName(album.title);
//                    }).then(function(albums) {
//                        return api.helpers.recursiveArray(album.images, function(image) {
//                            return api.photos.upload(albums[0].links.photos,
//                                image.path).then(function(photo) {
//                                    return api.photos.edit(photo, {
//                                        access : 'public',
//                                        title : image.title
//                                    });
//                                });
//                        }, 5);
//                    });
//                }
//                return api.helpers.recursiveArray(album.images, function(image) {
//                    return api.photos.upload(albums[0].links.photos, image.path).then(function(photo) {
//                        return api.photos.edit(photo, {
//                            access : 'public',
//                            title : image.title
//                        });
//                    });
//                }, 5);
//            });
//    },
//
//    /**
//     * Edit album entry
//     * @param {String} uri album's id
//     * @param {Object} params
//     * @param {String} [params.title] Title(can't be empty string).
//     * @param {String} [params.summary] Description
//     * @param {String} [params.password] Password(empty string for deleting password)
//     * @param {String} [params.link] link on parent album
//     * @returns {Promise} Resolves with response
//     * @method updateAlbum
//     */
//    updateAlbum : function(uri, params) {
//        if(!params) throw new Error('Nothing to update');
//        if(params.hasOwnProperty('title') && !params.title) {
//            throw new Error('Empty or invalid title({String} or nothing expected)');
//        }
//
//        var opts = ['title', 'summary', 'password'].reduce(function(prev, key) {
//            if(params.hasOwnProperty(key)) prev[key] = params[key];
//            return prev;
//        }, {});
//
//        if(params.link) opts.links = { album : params.link };
//        if(!Object.keys(opts).length) throw new Error('Nothing to update');
//
//        return updateEntry(uri, opts);
//    },
//
//    /**
//     * Edit photo entry
//     * @param {String} uri photo's id
//     * @param {Object} params
//     * @param {String} [params.title] Title(can't be empty string).
//     * @param {String} [params.summary] Description
//     * @param {Boolean} [params.xxx=false] Adult flag(can't be deleted, only set)
//     * @param {Boolean} [params.disable_comments=false] Disable commenting
//     * @param {Boolean} [params.hide_original=false] Disable access to photo's origin
//     * @param {String} [params.access='public'] Access level(can be public|friends|private)
//     * @param {String} [params.link] Link on parent album
//     * @param {Object} [params.tags] Key - tag name, value - tags collection link from service document
//     * @returns {Promise} Resolves with response
//     * @method updatePhoto
//     */
//    updatePhoto : function(uri, params) {
//        if(!params) throw new Error('Nothing to update');
//        if(params.hasOwnProperty('title') && !params.title) {
//            throw new Error('Empty or invalid title({String} or nothing expected)');
//        }
//
//        var opts = [
//            'title', 'summary', 'xxx', 'disable_comments', 'hide_original', 'access', 'link', 'tags'
//        ].reduce(function(prev, key) {
//                if(params.hasOwnProperty(key)) prev[key] = params[key];
//                return prev;
//            }, {});
//
//        if(!Object.keys(opts).length) throw new Error('Nothing to update');
//
//        var _this = this;
//
//        // TODO: when we send only opts 500 occur
//        return this.getPhoto(uri).then(function(data) {
//            Object.keys(opts).forEach(function(key) { data[key] = params[key]; });
//
//            return updateEntry(uri, data);
//        });
//    },
//
//    updateTag : function(uri, params) {
//        if(!params) throw new Error('Nothing to update');
//        if(params.hasOwnProperty('title') && !params.title) {
//            throw new Error('Empty or invalid title({String} or nothing expected)');
//        }
//
//        var opts = ['title'].reduce(function(prev, key) {
//            if(params.hasOwnProperty(key)) prev[key] = params[key];
//            return prev;
//        }, {});
//
//        if(!Object.keys(opts).length) throw new Error('Nothing to update');
//
//        return updateEntry(uri, opts);
//    },
//
//    /**
//     * Provides collection of all albums.
//     * @returns {Promise} Resolves with response
//     */
//    getAlbumsCollection : function(params) {
//        return this.getServiceDocument().then(function(res) {
//            return getCollectionIterator(res.collections['album-list'], params);
//        });
//    },
//
//    /**
//     * Provides collection of all albums with target name.
//     * @param {String} name Album's name
//     * @param {Object} params
//     * @returns {Iterator}
//     */
//    getAlbumsCollectionByName : function(name, params) {
//        if(!name) throw new Error('Album name not defined or invalid(expected {String})');
//
//        return this.getAlbumsCollection(params).then(function(iterator) {
//            return getFilteredIterator(iterator, function(res) {
//                return res.entries.filter(function(entry) {
//                    return name instanceof RegExp ? name.test(entry.title) : entry.title === name;
//                });
//            }, params && params.limit);
//        });
//    },
//
//    /**
//     * Provides collection of all photos.
//     * @returns {Promise} Resolves with response
//     */
//    getPhotosCollection : function(params) {
//        return this.getServiceDocument().then(function(res) {
//            return getCollectionIterator(res.collections['photo-list'], params);
//        });
//    },
//
//    /**
//     * Provides collection of all tags.
//     * @returns {Promise} Resolves with response
//     */
//    getTagsCollection : function(params) {
//        return getCollectionIterator('tags', params);
//    },
//
//    /**
//     * Provides collection of photo, that belongs to this album.
//     * @param {String|Number} id Album id
//     * @returns {Promise} Resolves with response
//     */
//    getAlbumPhotosCollection : function(id, params) {
//        return getCollectionIterator('photos', 'album', id, params);
//    },
//
//    /**
//     * Provides collection of photo, that marked by this tag.
//     * @param {String|Number} id Tag id
//     * @returns {Promise} Resolves with response
//     */
//    getTagPhotosCollection : function(id, params) {
//        return getCollectionIterator('photos', 'tag', id, params);
//    }
//})
