var api = require('..');
var utils = require('../lib/utils');
var credentials = { user : 'abc-ua', token : 'dac016e644cc403a9f4342f4216ec93c' };

api.auth(credentials.user, credentials.token);

api.getServiceDocument(credentials.user).then(function(res) {
    return api.getCollectionEntries(res.collections['album-list'].href, {
        title : function() { return arguments[0].match(/_150/); }
    }, { limit : 1 }).next();
}).then(function(entries) {
    console.time('s');
    return utils.parallelApply(Array(20).join('1').split('1').map(function() {
        return require('path').resolve(__dirname, '../tests/test.png')
    }), function(d) {
        return api.upload(d, { title : Math.random() }, entries[0].links.photos);
    }, 3);
}).then(function() {
    console.timeEnd('s');
}).fail(function() {
    console.log(arguments[0]);
});
