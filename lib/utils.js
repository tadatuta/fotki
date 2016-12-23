var HTTP = require('http'),
    CRYPTO = require('crypto'),
    REQUEST = require('request'),
    VOW = require('vow'),
    Iterator = require('./iterator');

var request = function(params) {
    var defer = VOW.defer();

    REQUEST(params, function(err, res, body) {
        if(err) return defer.reject.call(defer, err);
        if(res.statusCode < 200 || res.statusCode >= 300) {
            return defer.reject.call(defer, {
                target : res.request.uri.href,
                statusCode : res.statusCode,
                statusMessage : HTTP.STATUS_CODES[res.statusCode],
                body : body
            });
        }

        defer.resolve(body);
    });

    return defer.promise();
};
request = (function(base) {
    var _cache = {};

    return function(params) {
        var hash = CRYPTO.createHash('sha256').update(JSON.stringify(params)).digest('hex');

        if(!_cache[hash]) {
            _cache[hash] = base.apply(this, arguments);
            _cache[hash].always(function() {
                delete _cache[hash];
            });
        }

        return _cache[hash];
    };
}(request));

function parallelApply(data, method, streamsNumber) {
    var index = 0;

    return (new Iterator(function() {
        var defer = VOW.defer();

        VOW.all(data.slice(index, index + streamsNumber).map(function(value) {
            return method(value);
        })).then(function(res) {
            defer.resolve([res, (index += streamsNumber) < data.length]);
        }, function() {
            defer.reject.apply(defer, arguments);
        });

        return defer.promise();
    })).all();
}

function getFilteredIterator(iterator, filter, size) {
    var stack = [],
        limit = size || 100;

    return new Iterator(function() {
        var defer = VOW.defer();

        (function recursion() {
            // Warning: if stack is empty and nothing else will pass filter, then promise will be resolved with [].
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
}

module.exports = {
    request : request,
    parallelApply : parallelApply,
    getFilteredIterator : getFilteredIterator
};
