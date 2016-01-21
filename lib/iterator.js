var vow = require('vow');

/**
 * @param {Function} method Should return promise, that resolves with two arguments(data{*}, hasNext{Boolean})
 * @constructor
 */
var Iterator = function(method) {
    this._method = method;
    this._cache = [];
    this._index = undefined;
    this._done = false;
};

Iterator.prototype._get = function(index) {
    if(index === undefined) throw new Error('index not defined');

    var _this = this,
        promise;

    if(!this._cache[index]) {
        promise = this._method(index);
        promise.then(function(data) {
            if(!data[1]) _this._done = true;
            _this._cache[index] = promise;
        });
    } else {
        promise = this._cache[index];
    }

    return promise;
};

Iterator.prototype.current = function() {
    var _this = this,
        index = this._index || 0,
        promise = this._get(index);

    promise.then(function() { _this._index = index; });

    return promise;
};

Iterator.prototype.hasNext = function() {
    return !this._done || (this._index || 0) < this._cache.length - 1;
};

Iterator.prototype.next = function() {
    if(!this.hasNext()) return;
    if(this._index === undefined) return this.current();

    var _this = this,
        promise = this._get(this._index + 1);

    promise.then(function() { _this._index += 1; });

    return promise;
};

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
            args.push(arguments);
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
