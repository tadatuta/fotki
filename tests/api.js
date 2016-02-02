var HTTP = require('http'),
    URL = require('url'),
    SHOULD = require('should'),
    SINON = require('sinon'),
    SHOULD_SINON = require('should-sinon'),// jshint unused: false
    VOW = require('vow'),
    api = require('..'),
    Iterator = require('../lib/iterator'),
    credentials = { user : 'user', token : 'token' },

    _requestAbstractionTest = function(params) {
        describe('method ' + params.name, function() {
            var method,
                request;

            before(function() {
                method = SINON.stub(api, params.name, api[params.name]);
                request = SINON.stub(api, '_request', api._request);
            });
            after(function() {
                method.restore();
                request.restore();
            });
            afterEach(function() {
                method.reset();
                request.reset();
            });

            describe('should run "_request" method', function() {
                it('with arguments', function() {
                    api[params.name].apply(api, params.args);
                    request.should.be.calledWith(params.calledWithExpected);
                });
                it('and return result', function() {
                    api[params.name].apply(api, params.args).should.equal(request.returnValues[0]);
                });
            });
        });
    };

describe('Fotki', function() {
    describe('method _request', function() {
        var request,
            server;

        before(function() {
            request = SINON.stub();
            server = HTTP.createServer().listen(8000);
            server.on('request', function(req, res) {
                var response,
                    body = '';

                switch(req.url) {
                    case '/json' :
                        response = JSON.stringify({ collections : {} });
                        break;
                    case '/404' :
                        res.writeHead('404', 'Not found');
                        break;
                    case '/econ' :
                        req.setTimeout(1);
                        break;
                    default :
                        response = 'OK';
                }

                req.on('data', function(chunk) { body += chunk; });
                req.on('end', function() {
                    setTimeout(function() {
                        request.reset();
                        request(req, body);
                        res.end(response);
                    }, 10);
                });
            });
        });
        after(function() { server.close(); });

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

            after(function() {
                api.auth();
            });

            it('on target address', function() {
                req.headers.host.should.be.equal(URL.parse(uri).host);
                req.url.should.be.equal(URL.parse(uri).path);
            });

            it('with target method', function() {
                req.method.should.be.equal('POST');
            });

            it('with JSON content-type', function() {
                req.headers['content-type'].should.be.equal('application/json');
            });

            it('with authorization', function() {
                req.headers.authorization.should.be.equal('OAuth ' + credentials.token);
            });

            it('and ask respond in JSON', function() {
                req.headers.accept.should.be.equal('application/json');
            });

            it('with sending data on server', function() {
                request.args[0][1].should.be.equal('request');
            });
        });
        describe('should return promise', function() {
            it('which resolves with JSON', function() {
                return api._request({
                    uri : 'http://127.0.0.1:8000/json'
                }).should.be.fulfilledWith({ collections : {} });
            });

            it('which resolves with text', function() {
                return api._request({
                    uri : 'http://127.0.0.1:8000/'
                }).should.be.fulfilledWith('OK');
            });

            it('which rejects with server error', function() {
                return api._request({ uri : 'http://127.0.0.1:8000/404' }).should.be.rejectedWith({
                    statusCode : 404,
                    statusMessage : 'Not Found',
                    target : 'http://127.0.0.1:8000/404'
                });
            });

            it('which rejects with connection error', function() {
                return api._request({ uri : 'http://127.0.0.1:8000/econ' }).should.be.rejectedWith({
                    code : 'ECONNRESET'
                });
            });
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

        describe('base uri', function() {
            runTests(tests.base);
        });

        describe('base uri + limit', function() {
            runTests(getLimitTests(tests.base));
        });

        describe('base uri + sort-shift', function() {
            runTests(tests['sort-shift']);
        });

        describe('base uri + sort-shift + limit', function() {
            runTests(getLimitTests(tests['sort-shift']));
        });
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
        { name : 'delete', args : ['http://127.0.0.1:8000/'], calledWithExpected : {
            method : 'DELETE',
            uri : 'http://127.0.0.1:8000/'
        } },
        { name : 'get', args : ['http://127.0.0.1:8000/'], calledWithExpected : {
            method : 'GET',
            uri : 'http://127.0.0.1:8000/'
        } },
        { name : 'update', args : ['http://127.0.0.1:8000/', { title : 'title' }], calledWithExpected : {
            body : JSON.stringify({ title : 'title' }),
            method : 'PUT',
            uri : 'http://127.0.0.1:8000/'
        } }
    ].forEach(function(value) { _requestAbstractionTest(value); });

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
            var request;

            before(function() {
                request = SINON.stub(api, 'get', function() { return VOW.fulfill(); });
            });
            after(function() { request.restore(); });
            afterEach(function() { request.reset(); });

            it('with arguments', function() {
                api.getServiceDocument('user');
                request.should.be.calledWith('http://api-fotki.yandex.ru/api/users/user/');
            });
            it('and return result', function() {
                api.getServiceDocument('user').should.equal(request.returnValues[0]);
            });
        });
    });
    it('method createAlbum');
    it('method uploadBinary');
    it('method uploadMultipartForm');
    it('method uploadPhoto');
});
