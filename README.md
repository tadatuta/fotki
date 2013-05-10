fotki
=====

USAGE
-----

```javascript
fotki.auth('username', 'OAuth token');

fotki.getServiceDocument().then(function(doc) {
    console.log(doc);
});

fotki.getAlbums().then(function(albums) {
    albums.entries.forEach(function(album) {
        console.log('album', album);
    });
});

fotki.createAlbum('testAlb', 'test album summary').then(function(album) {
    console.log(album);
});

fotki.getAlbum({ title: 'testAlb' }).then(function(album) {
    console.log('album', album);
});

fotki.getPhotosByAlbumTitle('testAlb').then(function(photos) {
    photos.entries.forEach(function(photo) {
        console.log(photo.img.orig.href);
    });
});

fotki.getPhotosByAlbumId('urn:yandex:fotki:tadatuta:album:197961').then(function(photos) {
    photos.entries.forEach(function(photo) {
        console.log(photo.img.orig.href);
    });
});

fotki.uploadPhotoToAlbum({ title: 'testAlb' }, 'img.png').then(function(photo) {
    console.log('photo', photo);
});
```