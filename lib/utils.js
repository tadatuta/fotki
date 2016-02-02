// TODO: get rid of request?

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
                statusMessage : HTTP.STATUS_CODES[res.statusCode]
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

function parallelApply(data, method, parallelNumber) {
    var index = 0;

    return (new Iterator(function() {
        var defer = VOW.defer();

        VOW.all(data.slice(index, index + parallelNumber).map(function(value) {
            return method(value);
        })).then(function(res) {
            defer.resolve([res, (index += parallelNumber) < data.length]);
        }, function() {
            defer.reject.apply(defer, arguments);
        });

        return defer.promise();
    })).all();
}

module.exports = {
    request : request,
    parallelApply : parallelApply
};
