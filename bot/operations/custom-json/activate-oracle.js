const logger = require('../../../common/logger');
const { Transaction, User } = require('../../../common/models');
const { broadcastToUser } = require('../../../common/websocket');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (username !== '') {
    try {
      const { activate } = data.json.payload;

      const user = await User.findOne({ username, 'oracle.registered': true });

      if (user && !user.banned && typeof activate === 'boolean') {
        user.oracle.active = activate;

        await user.save();

        logger.info(`Successfully ${activate ? 'activated' : 'deactivated'} oracle. User: ${username} TX: ${data.trx_id}`, data);

        broadcastToUser(username, 'activate-oracle', JSON.stringify({ success: true, activate: user.oracle.active }));

        try {
          const transaction = {
            account: username,
            counterparty: null,
            type: 'activate-oracle',
            chain_block: data.block_num,
            sidechain_block: null,
            trx_id: data.trx_id,
            market_id: null,
            data: JSON.stringify({
              activate: user.oracle.active,
            }),
            timestamp: new Date(`${data.timestamp}Z`).getTime(),
          };

          await Transaction.create(transaction);
        } catch (e) {
          logger.log(`Error: Inserting oracle activation transaction. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
        }
      }
    } catch (e) {
      logger.error(`Failed to activate/deactivate oracle. User: ${username} TX: ${data.trx_id} Message: ${e.message}`, data);
    }
  }
};
