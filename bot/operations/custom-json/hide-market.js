const config = require('../../../common/config');
const logger = require('../../../common/logger');
const { Market, Transaction } = require('../../../common/models');
const { broadcastToUser } = require('../../../common/websocket');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (config.ADMINS.includes(username) && (data.json && data.json.payload)) {
    try {
      const { market_id: marketId } = data.json.payload;

      if (marketId) {
        const market = await Market.findOne({ _id: marketId, status: 1 });

        if (market) {
          market.status = 0;

          await market.save();

          broadcastToUser(username, 'hide-market', JSON.stringify({ success: true }));

          try {
            const transaction = {
              account: username,
              counterparty: null,
              type: 'hide-market',
              chain_block: data.block_num,
              sidechain_block: null,
              trx_id: data.trx_id,
              market_id: marketId,
              data: null,
              timestamp: new Date(`${data.timestamp}Z`).getTime(),
            };

            await Transaction.create(transaction);
          } catch (e) {
            logger.log(`Error: Inserting market hiding transaction. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
          }
        }
      }
    } catch (e) {
      broadcastToUser(username, 'hide-market', JSON.stringify({ success: false }));

      logger.error(`Failed to hide market. User: ${username} TX: ${data.trx_id} Message: ${e.message}`, data);
    }
  }
};
