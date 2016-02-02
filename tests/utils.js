var HTTP = require('http'),
    VOW = require('vow'),
    SHOULD = require('should'),// jshint unused: false
    UTILS = require('../lib/utils');

describe('request', function() {
    var server;

    before(function() {
        server = HTTP.createServer().listen(8000);
    });

    after(function() {
        server.close();
    });

    afterEach(function() {
        server.removeAllListeners('request');
    });

    it('should return promise which rejects by connection error', function() {
        server.on('request', function(req, res) {
            res.setTimeout(1);
        });

        return UTILS.request({ uri : 'http://127.0.0.1:8000/' }).should.be.rejectedWith({ code : 'ECONNRESET' });
    });

    it('should return promise which rejects by server response with status code < 200', function() {
        server.on('request', function(req, res) {
            res.writeHead(102);
            res.end();
        });

        return UTILS.request({ uri : 'http://127.0.0.1:8000/' }).should.be.rejectedWith({ statusCode : 102 });
    });

    it('should return promise which rejects by server response with status code >= 300', function() {
        server.on('request', function(req, res) {
            res.writeHead(301);
            res.end();
        });

        return UTILS.request({ uri : 'http://127.0.0.1:8000/' }).should.be.rejectedWith({ statusCode : 301 });
    });

    it('should return promise which resolves by server response', function() {
        server.on('request', function(req, res) {
            res.writeHead(200);
            res.end('OK');
        });

        return UTILS.request({ uri : 'http://127.0.0.1:8000/' }).should.be.fulfilledWith('OK');
    });

    it('should return same promise while request pending', function() {
        server.on('request', function(req, res) {
            res.writeHead(200);
            setTimeout(function() { res.end('OK'); }, 50);
        });

        var uris = ['http://127.0.0.1:8000/', 'http://127.0.0.1:8000/test'],
            getPromises = function() {
                return uris.map(function(uri) { return UTILS.request({ uri : uri }); });
            },
            requests = getPromises(),
            secondaryRequests = getPromises();

        // check cache on hash collisions
        for(var i = 0; i < requests.length - 1; i += 1) {
            for(var j = i + 1; j < requests.length; j += 1) {
                requests[j - 1].should.not.be.equal(requests[j]);
            }
        }

        // immediate same requests should use cache
        requests.forEach(function(promise, index) {
            promise.should.be.equal(secondaryRequests[index]);
        });

        // promise should be deleted from cache when it is resolved
        return VOW.all(requests).then(function() {
            getPromises().forEach(function(promise, index) {
                promise.should.not.be.equal(requests[index]);
            });
        }).should.be.fulfilled();
    });
});

describe('parallelApply', function() {
    it('should return promise which resolves by [[res1, res2, res3], [res4, res5, res6], ...]', function() {
        var promise = UTILS.parallelApply([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function(data) {
            return VOW.fulfill(data);
        }, 3);

        return promise.should.be.fulfilledWith([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });

    it('should return promise which rejected', function() {
        var promise = UTILS.parallelApply([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function() {
            return VOW.reject();
        }, 3);

        return promise.should.be.rejected();
    });
});
