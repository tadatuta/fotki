var HTTP = require('http'),
    PATH = require('path'),
    URL = require('url'),
    SHOULD = require('should'),
    SINON = require('sinon'),
    SHOULD_SINON = require('should-sinon'),// jshint unused: false
    VOW = require('vow'),
    api = require('..'),
    Iterator = require('../lib/iterator'),
    credentials = { user : 'user', token : 'token' },

    shouldReturnPromise = function(method) {
        describe('should return promise', function() {
            it('which resolves with JSON', function() {
                return method('http://127.0.0.1:8000/json').should.be.fulfilledWith({ collections : {} });
            });

            it('which resolves with text', function() {
                return method('http://127.0.0.1:8000/').should.be.fulfilledWith('OK');
            });

            it('which rejects with server error', function() {
                return method('http://127.0.0.1:8000/404').should.be.rejectedWith({
                    statusCode : 404,
                    statusMessage : 'Not Found',
                    target : 'http://127.0.0.1:8000/404'
                });
            });

            it('which rejects with connection error', function() {
                return method('http://127.0.0.1:8000/econ').should.be.rejectedWith({
                    code : 'ECONNRESET'
                });
            });
        });
    },
    _requestAbstractionTest = function(params) {
        describe('method ' + params.name, function() {
            var method,
                returns,
                request;

            before(function() {
                method = SINON.stub(api, params.name, api[params.name]);
                request = SINON.stub(api, '_request', api._request);
                returns = api[params.name].apply(api, params.args);
            });
            after(function() {
                method.restore();
                request.restore();
            });

            describe('should run "_request" method', function() {
                it('with arguments', function() {
                    request.should.be.calledWith(params.calledWithExpected);
                });
                it('and return result', function() {
                    returns.should.equal(request.returnValues[0]);
                });
            });
        });
    };

describe('Fotki', function() {
    var request,
        server,
        socket;

    var checkRequest = function(opts) {
            if(opts.uri) it('on target address', function() {
                request.args[0][0].headers.host.should.be.equal(URL.parse(opts.uri).host);
                request.args[0][0].url.should.be.equal(URL.parse(opts.uri).path);
            });
            if(opts.method) it('with "' + opts.method + '" method', function() {
                request.args[0][0].method.should.be.equal(opts.method);
            });
            if(opts.contentType) it('with "' + opts.contentType + '" content-type', function() {
                request.args[0][0].headers['content-type'].should.match(new RegExp('^' + opts.contentType));
            });
            if(opts.auth) it('with authorization', function() {
                request.args[0][0].headers.authorization.should.be.equal('OAuth ' + credentials.token);
            });
            if(opts.accept) it('ask respond in "' + opts.accept + '"', function() {
                request.args[0][0].headers.accept.should.be.equal(opts.accept);
            });
        };

    before(function() {
        request = SINON.stub();
        server = HTTP.createServer().listen(8000);
        server.on('connection', function(sock) {
            socket = sock;
        });
        server.on('request', function(req, res) {
            var body = '',
                response;

            switch(req.url) {
                case '/json' :
                    response = JSON.stringify({ collections : {} });
                    break;
                case '/404' :
                    res.writeHead('404', 'Not found');
                    break;
                case '/econ' :
                    socket.destroy();
                    break;
                default :
                    response = 'OK';
            }

            req.on('data', function(chunk) { body += chunk; });
            req.on('end', function() {
                request.reset();
                request(req, body);
                res.end(response);
            });
        });
    });
    after(function() { server.close(); });

    describe('method _request', function() {
        describe('should throw error if uri', function() {
            it('not defined', function() { api._request.should.throw(); });
            it('falsy', function() { api._request.bind(api, { uri : '' }).should.throw(); });
            it('invalid', function() { api._request.bind(api, { uri : {} }).should.throw(); });
        });
        describe('should make request', function() {
            var uri = 'http://127.0.0.1:8000/',
                promise,
                req;

            before(function() {
                return promise = api
                    .auth(credentials.user, credentials.token)
                    ._request({ body : 'request', method : 'POST', uri : uri }).then(function() {
                        req = request.args[0][0];
                    });
            });
            after(function() { api.auth(); });

            checkRequest({
                uri : uri,
                method : 'POST',
                contentType : 'application/json',
                auth : true,
                accept : 'application/json'
            });

            it('with sending data on server', function() {
                request.args[0][1].should.be.equal('request');
            });

            it('with sending multipart/form-data on server'/*, function() {
             request.args[0][1].should.be.equal('request');
             }*/);
        });

        shouldReturnPromise(function(uri) {
            return api._request({ uri : uri });
        });
    });
    describe('method _parseCollectionUri should parse', function() {
        var uri = 'http://api-fotki.yandex.ru/api/recent',
            replaceUri = function(tests) {
                return tests.map(function(value) {
                    value[1].base = value[1].base.replace('%uri%', uri);
                    return [value[0].replace('%uri%', uri), value[1]];
                });
            },
            getLimitTests = function(tests) {
                return tests.map(function(value) {
                    var expected = Object.keys(value[1]).reduce(function(prev, key) {
                        prev[key] = value[1][key];
                        return prev;
                    }, {});

                    expected.limit = '100';

                    return [value[0] + '?limit=100', expected];
                });
            },
            runTests = function(tests) {
                tests.forEach(function(value) {
                    it(value[0], function() {
                        api._parseCollectionUri(value[0]).should.be.deepEqual(value[1]);
                    });
                });
            },
            tests = {
                base : replaceUri([
                    ['http://api-fotki.yandex.ru/api/users/user/album/1Z;sda',
                        { base : 'http://api-fotki.yandex.ru/api/users/user/album/1Z;sda' }],
                    ['%uri%', { base : '%uri%' }],
                    ['%uri%/', { base : '%uri%/' }]
                ]),
                'sort-shift' : (function() {
                    var arr = [
                        ['%uri%/updated;1970-01-01T00:00:00Z',
                            { base : '%uri%/', sort : 'updated', time : '1970-01-01T00:00:00Z' }],
                        ['%uri%/updated;1970-01-01T00:00:00Z,1',
                            { base : '%uri%/', sort : 'updated', time : '1970-01-01T00:00:00Z', id : '1' }],
                        ['%uri%/updated;1970-01-01T00:00:00Z,,2',
                            { base : '%uri%/', sort : 'updated', time : '1970-01-01T00:00:00Z', uid : '2' }],
                        ['%uri%/updated;1970-01-01T00:00:00Z,1,2',
                            { base : '%uri%/', sort : 'updated', time : '1970-01-01T00:00:00Z', id : '1', uid : '2' }]
                    ];

                    return replaceUri(arr.concat(arr.map(function(value) {
                        return [value[0] + '/', value[1]];
                    })));
                }())
            };

        describe('base uri', function() { runTests(tests.base); });
        describe('base uri + limit', function() { runTests(getLimitTests(tests.base)); });
        describe('base uri + sort-shift', function() { runTests(tests['sort-shift']); });
        describe('base uri + sort-shift + limit', function() { runTests(getLimitTests(tests['sort-shift'])); });
    });
    describe('method _buildCollectionUri', function() {
        describe('should throw error if opts.base', function() {
            it('not defined', function() { api._buildCollectionUri.should.throw(); });
            it('invalid', function() { api._buildCollectionUri.bind(api, { base : 1 }).should.throw(); });
        });
        describe('should build', function() {
            var all = [];

            ['path', 'path/'].forEach(function(uri) {
                var tests = [
                    [{ base : uri }, uri],
                    [{ base : uri, sort : 'update' }, uri],
                    [{ base : uri, time : '1970-01-01T00:00:00Z' }, uri],
                    [{ base : uri, sort : 'update', time : '1970-01-01T00:00:00Z' },
                        'path/update;1970-01-01T00:00:00Z/'],
                    [{ base : uri, id : '1' }, uri],
                    [{ base : uri, uid : '2' }, uri],
                    [{ base : uri, id : '1', uid : '2' }, uri],
                    [{ base : uri, sort : 'update', time : '1970-01-01T00:00:00Z', id : '1' },
                        'path/update;1970-01-01T00:00:00Z,1/'],
                    [{ base : uri, sort : 'update', time : '1970-01-01T00:00:00Z', uid : '2' },
                        'path/update;1970-01-01T00:00:00Z,,2/'],
                    [{ base : uri, sort : 'update', time : '1970-01-01T00:00:00Z', id : '1', uid : '2' },
                        'path/update;1970-01-01T00:00:00Z,1,2/']
                ];

                tests = tests.concat(tests.map(function(test) {
                    var params = Object.keys(test[0]).reduce(function(prev, key) {
                        prev[key] = test[0][key];
                        return prev;
                    }, {});

                    params.limit = 100;

                    return [params, test[1] + '?limit=100'];
                }));

                all = all.concat(tests);
            });

            all
                .map(function(test) { return test[1]; })
                .filter(function(test, index, array) { return array.indexOf(test) === index; })
                .map(function(name) {
                    describe(name + ' from', function() {
                        all.forEach(function(test) {
                            if(test[1] !== name) return;

                            it(JSON.stringify(test[0]), function() {
                                api._buildCollectionUri(test[0]).should.be.equal(test[1]);
                            });
                        });
                    });
                });
        });
    });
    describe('method _mergeCollectionUri', function() {
        it('should return uri with added sort/shift/limit params', function() {
            api._mergeCollectionUri('http://api-fotki.yandex.ru/api/users/recent/', {
                sort : 'updated',
                time : '1970-01-01T00:00:00Z',
                id : 1,
                uid : 2,
                limit : 1
            }).should.be.equal('http://api-fotki.yandex.ru/api/users/recent/updated;1970-01-01T00:00:00Z,1,2/?limit=1');
        });
        it('should return uri with no changes if params are absent', function() {
            var uri = 'http://api-fotki.yandex.ru/api/users/recent/updated;1970-01-01T00:00:00Z,1,2/?limit=1';
            api._mergeCollectionUri(uri, {}).should.be.equal(uri);
        });
        it('should return uri with replaced sort/shift/limit params', function() {
            var uri = 'http://api-fotki.yandex.ru/api/users/recent/updated;1970-01-01T00:00:00Z,1,2/?limit=100',
                params = {
                    sort : 'published',
                    id : 3,
                    limit : 1
                },
                expected = 'http://api-fotki.yandex.ru/api/users/recent/published;1970-01-01T00:00:00Z,3,2/?limit=1';

            api._mergeCollectionUri(uri, params).should.be.equal(expected);
        });
    });
    describe('method auth', function() {
        var returns;

        before(function() {
            returns = api.auth(credentials.user, credentials.token);
        });

        after(function() {
            api.auth();
        });

        it('should set credentials', function() {
            SHOULD.equal(api._username, credentials.user);
            SHOULD.equal(api._token, credentials.token);
        });

        it('should return "this"', function() {
            returns.should.equal(api);
        });
    });
    [
        {
            name : 'delete', args : ['http://127.0.0.1:8000/'], calledWithExpected : {
            method : 'DELETE',
            uri : 'http://127.0.0.1:8000/'
        }
        },
        {
            name : 'get', args : ['http://127.0.0.1:8000/'], calledWithExpected : {
            method : 'GET',
            uri : 'http://127.0.0.1:8000/'
        }
        },
        {
            name : 'update', args : ['http://127.0.0.1:8000/', { title : 'title' }], calledWithExpected : {
            body : JSON.stringify({ title : 'title' }),
            method : 'PUT',
            uri : 'http://127.0.0.1:8000/'
        }
        }
    ].forEach(function(value) { _requestAbstractionTest(value); });
    // TODO: check arguments or use _requestAbstractionTest
    describe('method uploadBinary', function() {
        describe('should run "_request" method', function() {
            var returns,
                request;

            before(function() {
                request = SINON.stub(api, '_request', function() { return VOW.fulfill(); });
                returns = api.uploadBinary('http://api-fotki.yandex.ru/api/users/user/photos/', 'Buffer', 'image/png');
            });
            after(function() { request.restore(); });

            it('with arguments', function() {
                request.should.be.calledWith({
                    body : 'Buffer',
                    contentType : 'image/png',
                    method : 'POST',
                    uri : 'http://api-fotki.yandex.ru/api/users/user/photos/'
                });
            });
            it('and return result', function() {
                returns.should.equal(request.returnValues[0]);
            });
        });

    });
    describe('method uploadMultipartFormData', function() {
        describe('should run "_request" method', function() {
            var returns,
                request;

            before(function() {
                request = SINON.stub(api, '_request', function() { return VOW.fulfill(); });
                returns = api.uploadMultipartFormData('http://api-fotki.yandex.ru/api/users/user/photos/', {
                    image : {},
                    title : 'title'
                });
            });
            after(function() { request.restore(); });

            it('with arguments', function() {
                request.should.be.calledWith({
                    formData : {
                        image : {},
                        title : 'title'
                    },
                    contentType : 'multipart/form-data',
                    method : 'POST',
                    uri : 'http://api-fotki.yandex.ru/api/users/user/photos/'
                });
            });
            it('and return result', function() {
                returns.should.equal(request.returnValues[0]);
            });
        });
    });

    describe('method getCollection', function() {
        describe('should throw error if uri', function() {
            it('not defined', function() { api.getCollection.should.throw(); });
            it('falsy', function() { api.getCollection.bind(api, '').should.throw(); });
            it('invalid', function() { api.getCollection.bind(api, 1).should.throw(); });
        });
        describe('should return iterator', function() {
            var iterator,
                request;

            before(function() {
                iterator = api.getCollection('http://127.0.0.1:8000/', { limit : 1 });
                request = SINON.stub(api, 'get', function() {
                    return VOW.fulfill({ links : { next : 'http://linkOnNextPageOfCollection' } });
                });
                iterator.should.be.instanceof(Iterator);
            });
            after(function() { request.restore(); });

            it('which make first request on merged uri and params link', function() {
                iterator.current();
                request.should.be.calledWith('http://127.0.0.1:8000/?limit=1');
            });
            it('which make second and following requests on the next-link', function() {
                for(var i = 0; i < 2; i += 1) {
                    iterator.next();
                    request.should.be.calledWith('http://linkOnNextPageOfCollection');
                }
            });
        });
    });
    describe('method getServiceDocument', function() {
        describe('should throw error if username', function() {
            it('not defined', function() { api.getServiceDocument.should.throw(); });
            it('invalid', function() { api.getServiceDocument.bind(api, 1).should.throw(); });
        });
        describe('should run "get" method', function() {
            var returns,
                request;

            before(function() {
                request = SINON.stub(api, 'get', function() { return VOW.fulfill(); });
                returns = api.getServiceDocument('user');
            });
            after(function() { request.restore(); });

            it('with arguments', function() {
                request.should.be.calledWith('http://api-fotki.yandex.ru/api/users/user/');
            });
            it('and return result', function() {
                returns.should.equal(request.returnValues[0]);
            });
        });
    });
    describe('method createAlbum', function() {
        describe('should throw error if params.title', function() {
            it('not defined', function() {
                api.createAlbum.should.throw();
                api.createAlbum.bind(api, {}).should.throw();
            });
            it('invalid', function() { api.createAlbum.bind(api, { title : 0 }).should.throw(); });
        });

        describe('should make request', function() {
            var stubs = [],
                promise;

            before(function() {
                stubs.push(SINON.stub(api, 'getServiceDocument', function() {
                    return VOW.fulfill({
                        collections : {
                            'album-list' : { href : 'http://127.0.0.1:8000/albums/' }
                        }
                    });
                }));

                api.auth(credentials.user, credentials.token);

                return promise = api.createAlbum({
                    title : 'test',
                    summary : 'description',
                    password : '123',
                    link : 'http://127.0.0.1:8000/album/1/'
                });
            });
            after(function() {
                stubs.forEach(function(stub) { stub.restore(); });
                api.auth();
            });

            checkRequest({
                uri : 'http://127.0.0.1:8000/albums/',
                method : 'POST',
                contentType : 'application/json',
                auth : 'true',
                accept : 'application/json'
            });

            it('with body', function() {
                request.args[0][1].should.be.equal(JSON.stringify({
                    title : 'test',
                    summary : 'description',
                    password : '123',
                    links : { album : 'http://127.0.0.1:8000/album/1/' }
                }));
            });
            it('and return promise', function() {
                promise.should.be.Promise();
            });
        });
    });
    describe('method upload', function() {
        var stubs = [];

        before(function() {
            stubs.push(SINON.stub(api, 'getServiceDocument', function() {
                return VOW.fulfill({
                    collections : {
                        'photo-list' : { href : 'http://127.0.0.1:8000/photos/' }
                    }
                });
            }));
            api.auth(credentials.user, credentials.token);
        });
        after(function() {
            stubs.forEach(function(stub) { stub.restore(); });
            api.auth();
        });

        describe('should check extension', function() {
            it('and throw error if it not support', function() {
                api.upload.bind(api, 'test.png2', 'http://127.0.0.1:8000/').should.throw();
            });
            describe('should support extension', function() {
                var exts = ['png', 'jpg', 'jpeg', 'gif', 'bmp'];

                exts = exts.concat(exts.map(function(value) { return value.toUpperCase(); }));

                exts.forEach(function(value) {
                    it(value, function() {
                        api.upload.bind(api, 'test.' + value, {}, 'http://127.0.0.1:8000/').should.not.throw();
                    });
                });
            });
        });
        describe('should make request to', function() {
            var imagePath = PATH.join(__dirname, 'test.png'),
                size = require('fs').statSync(imagePath).size,
                promise;

            describe('photos collection and send', function() {
                var uri = 'http://127.0.0.1:8000/photos/';

                describe('file', function() {
                    before(function() {
                        return promise = api.upload(imagePath);
                    });

                    checkRequest({
                        uri : uri,
                        method : 'POST',
                        contentType : 'image/png',
                        auth : true,
                        accept : 'application/json'
                    });
                    it('with file content in body', function() {
                        Number(request.args[0][0].headers['content-length']).should.be.equal(size);
                    });
                    it('and return promise', function() {
                        promise.should.be.Promise();
                    });
                });
                describe('multipart/form-data', function() {
                    before(function() {
                        return promise =  api.upload(imagePath, { title : 'test' });
                    });

                    checkRequest({
                        uri : uri,
                        method : 'POST',
                        contentType : 'multipart/form-data',
                        auth : true,
                        accept : 'application/json'
                    });
                    it('with form-data in body', function() {
                        Number(request.args[0][0].headers['content-length']).should.be.greaterThan(size);
                    });
                    it('and return promise', function() {
                        promise.should.be.Promise();
                    });
                });
            });
            describe('provided uri and send', function() {
                var uri = 'http://127.0.0.1:8000/album/1/';

                describe('file', function() {
                    before(function() {
                        return promise = api.upload(imagePath, uri);
                    });

                    checkRequest({
                        uri : uri,
                        method : 'POST',
                        contentType : 'image/png',
                        auth : true,
                        accept : 'application/json'
                    });
                    it('with file content in body', function() {
                        Number(request.args[0][0].headers['content-length']).should.be.equal(size);
                    });
                    it('and return promise', function() {
                        promise.should.be.Promise();
                    });
                });
                describe('multipart/form-data', function() {
                    before(function() {
                        return promise = api.upload(imagePath, { title : 'test' }, uri);
                    });

                    checkRequest({
                        uri : uri,
                        method : 'POST',
                        contentType : 'multipart/form-data',
                        auth : true,
                        accept : 'application/json'
                    });
                    it('with form-data in body', function() {
                        Number(request.args[0][0].headers['content-length']).should.be.greaterThan(size);
                    });
                    it('and return promise', function() {
                        promise.should.be.Promise();
                    });
                });
            });
        });
    });
});
