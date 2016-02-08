var vow = require('vow');

/**
 * Creates async iterators.
 * @param {Function} method Should return promise, that resolves with two arguments(data{*}, hasNext{Boolean})
 * @constructor
 */
var Iterator = function(method) {
    this._method = method;
    this._cache = [];
    this._index = undefined;
    this._done = false;
};

/**
 * Executes initial method for specified index.
 * @param {Number} index Index in all array of data.
 * @returns {Promise} Resolves with method's data.
 * @private
 */
Iterator.prototype._get = function(index) {
    if(index === undefined) throw new Error('index not defined');
    if(this._cache[index]) return this._cache[index];

    var _this = this,
        defer = vow.defer(),
        promise = defer.promise();

    _this._cache[index] = promise;
    this._method(index).then(function(data) {
        if(!data[1]) _this._done = true;
        defer.resolve(data[0]);
    }, function() {
        defer.reject.apply(defer, arguments);
        delete _this._cache[index];
    }, function() {
        defer.notify.apply(defer, arguments);
    });

    return promise;
};

/**
 * Apply initial method for current index.
 * @returns {Promise} Resolves with method's data.
 */
Iterator.prototype.current = function() {
    var _this = this,
        index = this._index || 0,
        promise = this._get(index);

    promise.then(function() { _this._index = index; });

    return promise;
};

/**
 * Checks is there data to be retrieve
 * @returns {boolean}
 */
Iterator.prototype.hasNext = function() {
    return !this._done || (this._index || 0) < this._cache.length - 1;
};

/**
 * Provides next portion of data
 * @returns {Promise} Resolves with method's data.
 */
Iterator.prototype.next = function() {
    if(!this.hasNext()) return;
    if(this._index === undefined) return this.current();

    var _this = this,
        promise = this._get(this._index + 1);

    promise.then(function() { _this._index += 1; });

    return promise;
};

/**
 * Provides all data
 * @returns {Promise} Resolves with array of data; promise.progress resolves with each array item
 */
Iterator.prototype.all = function() {
    var defer = vow.defer(),
        args = [];

    this.rewind();

    (function recursion(iterator) {
        if(!iterator.hasNext()) {
            defer.resolve(args);
        }

        iterator.next().then(function() {
            defer.notify.apply(defer, arguments);
            args.push(arguments[0]);
            recursion(iterator);
        }).fail(function() {
            defer.reject.apply(defer, arguments);
        });
    }(this));

    return defer.promise();
};

Iterator.prototype.rewind = function() {
    this._index = undefined;
    return this;
};

module.exports = Iterator;
