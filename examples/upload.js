var fotki = require('fotki');

fotki
    // set authorize data
    .auth('login', 'token')
    // get target album
    .albums.getByName('albumName')
    // upload image
    .then(function(albums) {
        return fotki.photos.upload(albums[0].links.photos, 'pathToFile');
    })
    // edit photo: change access level
    .then(function(photo) {
        return fotki.photos.edit(photo, {
            access: 'public'
        });
    });