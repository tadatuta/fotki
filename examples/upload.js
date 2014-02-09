var fotki = require('fotki');

fotki.auth('username', 'token');

(function() {
    var album;

    var clear = function() {
        fotki.albums.getCollection()
            .then(function(albumCollection) {
                albumCollection.entries.forEach(function(value) {
                    fotki.albums.delete(value);
                });
            });
    };

    var job = function() {
        fotki.albums
            .getByName('Неразобранное')
            .then(function(data) {
                album = data;

                return fotki.albums.clear(data);
            }, function() {
                return fotki.albums
                    .create({
                        title: 'Неразобранное',
                        summary: 'test description'
                    })
                    .then(function() {
                        var returnDeferred = fotki.albums.getByName('Неразобранное');

                        returnDeferred
                            .then(function(data) {
                                album = data;
                                console.log(1, data);
                            }, function() {
                                console.log(3, arguments);
                            });

                        return returnDeferred;
                    });
            })
            .then(function() {
                return fotki.photos.upload(album, __dirname + '/1.png');
            })
            .then(function() {
                return fotki.photos.get(album);
            })
            .then(function(photos) {
                photos.entries.forEach(function(value) {
                    fotki.photos.edit(value, {
                        title: 'test',
                        access: 'public'
                    });
                });
            })
            .fail(function() {
                console.log(9, arguments);
            });
    };

//    clear();
//    job();

    fotki.albums.getByName('inner')
        .then(function(data) {
            return fotki.photos.upload(data[0].links.photos, __dirname + '/1.png');
        })
        .then(function(data) {
            return fotki.photos.edit(data, {
                access: 'public'
            });
        });
}());
