var api = require('..');
var credentials = { user : 'abc-ua', token : 'dac016e644cc403a9f4342f4216ec93c' };

api.auth(credentials.user, credentials.token);

api.getServiceDocument(credentials.user).then(function(res) {
    return api.getCollectionEntries(res.collections['album-list'].href, {
        title : function() { return arguments[0].match(/_150/); }
    }).all();
}).then(function() {
    console.log(arguments[0]);
}, function() {
    console.log(arguments);
});
