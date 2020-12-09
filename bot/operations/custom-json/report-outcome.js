const { memo } = require('@hiveio/hive-js');
const config = require('../../../common/config');
const logger = require('../../../common/logger');
const { Market, Transaction, User } = require('../../../common/models');
const { broadcastToUser } = require('../../../common/websocket');
const { parseJSON } = require('../../helpers');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (username !== '' || (data.json && data.json.payload)) {
    try {
      const user = await User.findOne({ username, banned: false }).lean();

      if (user && user.oracle && user.reputation >= 0) { // Checking user is an Oracle
        let decodedPayload = memo.decode(config.DECRYPTION_KEY, data.json.payload).replace(/^#/, '');

        decodedPayload = parseJSON(decodedPayload);

        if (decodedPayload.market && decodedPayload.outcome) { // Payload is in correct format
          const market = await Market.findOne({ _id: decodedPayload.market }).lean();

          if (market && market.status === 2) { // Market is in reporting state
            if (Object.keys(market.possible_outcomes).includes(decodedPayload.outcome) || decodedPayload.outcome === 'Invalid') {
              if (!market.reported_outcomes) {
                market.reported_outcomes = {};
              }

              if (!market.reported_outcomes[username]) {
                market.reported_outcomes[username] = decodedPayload.outcome;

                await Market.updateOne(
                  { _id: decodedPayload.market },
                  { $set: { reported_outcomes: market.reported_outcomes } },
                );

                try {
                  const transaction = {
                    account: username,
                    counterparty: null,
                    type: 'report-outcome',
                    chain_block: data.block_num,
                    sidechain_block: null,
                    trx_id: data.trx_id,
                    market_id: market._id,
                    data: JSON.stringify(decodedPayload),
                    timestamp: new Date(`${data.timestamp}Z`).getTime(),
                  };

                  await Transaction.create(transaction);
                } catch (e) {
                  logger.log(`Error: Inserting reported outcome transaction. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
                }

                broadcastToUser(username, 'report-outcome', JSON.stringify({ success: true }));
              }
            }
          }
        }
      } else {
        broadcastToUser(username, 'report-outcome', JSON.stringify({ success: false }));
      }
    } catch (e) {
      broadcastToUser(username, 'report-outcome', JSON.stringify({ success: false }));

      logger.error(`Failed to process reported outcome. User: ${username} TX: ${data.trx_id} Message: ${e.message}`, data);
    }
  }
};
