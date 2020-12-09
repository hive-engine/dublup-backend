const config = require('../common/config');

const plugins = [
  {
    plugin: './plugins/auth',
    options: {
      SECRET: config.JWT_SECRET,
    },
  }, {
    plugin: './plugins/routes',
  },
];

exports.manifest = {
  server: {
    router: {
      stripTrailingSlash: true,
      isCaseSensitive: false,
    },
    routes: {
      security: {
        hsts: false,
        xss: true,
        noOpen: true,
        noSniff: true,
        xframe: false,
      },
      cors: {
        origin: ['*'],
        credentials: true,
      },
    },
    mime: {
      override: {
        'text/event-stream': {
          compressible: false,
        },
      },
    },
    port: config.PORT,
    host: 'localhost',
    debug: process.env.NODE_ENV === 'production' ? false : { request: ['error'] },
  },

  register: {
    plugins,
  },
};
