const { MONGODB } = require('./common/config');

const config = {
  mongodb: {
    url: MONGODB,

    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  migrationsDir: 'migrations',

  changelogCollectionName: 'changelog',

  migrationFileExtension: '.js',
};

module.exports = config;
