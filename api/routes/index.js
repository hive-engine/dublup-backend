const marketRoutes = require('./markets');
const settingsRoutes = require('./settings');
const transactionsRoutes = require('./transactions');
const usersRoutes = require('./users');

const { broadcastToUser } = require('../../common/websocket');

module.exports = [
  [
    {
      method: 'GET',
      path: '/',
      handler: () => ({
        success: true,
      }),
    },
  ],
  [
    {
      method: 'GET',
      path: '/ws',
      handler: () => {
        broadcastToUser('reazuliqbal', 'create-market', JSON.stringify({ success: true, message: 'Market creation has been successful' }));
        return {
          success: true,
        };
      },
    },
  ],
  ...marketRoutes,
  ...settingsRoutes,
  ...transactionsRoutes,
  ...usersRoutes,
];
