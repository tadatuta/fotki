module.exports = {
    options : {
        boss : true,
        eqeqeq : true,
        evil : true,
        expr : true,
        forin : true,
        immed : true,
        loopfunc : true,
        maxdepth : 4,
        maxlen : 120,
        newcap : true,
        noarg : true,
        noempty : true,
        nonew : true,
        onecase : true,
        quotmark : 'single',
        sub : true,
        supernew : true,
        trailing : true,
        undef : true,
        unused : true
    },

    groups : {
        nodejs : {
            options : {
                node : true
            },
            includes : ['lib/**/*.js']
        },

        tests : {
            options : {
                node : true,
                predef : ['after', 'afterEach', 'before', 'beforeEach', 'describe', 'it']
            },
            includes : ['tests/**/*.js']
        }
    }
};
