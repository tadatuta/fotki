#Fotki
*NodeJs api для работы с сервисом [Яндекс.Фотки](https://tech.yandex.ru/fotki/).* 
##Api
*Подробное описание методов см. в jsDoc*
###Авторизация
````fotki.auth('username', 'OAuth token');````

[Отладочный токен можно получить вручную](https://tech.yandex.ru/oauth/doc/dg/tasks/get-oauth-token-docpage/)
###Получение сервисного документа 
````fotki.getServiceDocument()````
###Операции с альбомами
````fotki.albums.xxx````
###Операции с изображениями
````fotki.photos.xxx````
###Хелперы/сниппеты
````fotki.helpers.xxx````
##Примеры
###Создание альбома
````
fotki
    .auth('username', 'OAuth token')
    create({ title : 'Example album', summary : 'Album description', password : '' });
````
###Загрузка изображений в альбом
````````
