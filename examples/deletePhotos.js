var api = require('..');
var credentials = { user : 'abc-ua', token : 'dac016e644cc403a9f4342f4216ec93c' };

api.auth(credentials.user, credentials.token);

api.getServiceDocument(credentials.user).then(function(res) {
    return api.getCollectionEntries(res.collections['album-list'].href, {
        title : function() {
            return arguments[0].match(/_150/)
        }
    }, { limit : 1 }).next();
}).then(function(entry) {
    return api.getCollection(entry[0].links.photos, { limit : 1 }).all();
}).progress(function(d) {
    return api.delete(d.entries[0].links.self);
}).fail(function() {
    console.log(arguments[0]);
});
