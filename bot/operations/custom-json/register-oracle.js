const config = require('../../../common/config');
const logger = require('../../../common/logger');
const { Transaction, User } = require('../../../common/models');
const { broadcastToUser } = require('../../../common/websocket');
const { SidechainClient } = require('../../helpers');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (username !== '') {
    try {
      let stake = 0;

      const [balance] = await SidechainClient.getBalance(username, config.CURRENCY);

      if (balance) {
        stake = Number(balance.stake);
      }

      if (stake >= config.ORACLE_STAKE_REQUIREMENT) {
        const user = await User.findOneAndUpdate(
          { username },
          { $setOnInsert: { username } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        if (user && !user.oracle.registered && !user.banned) {
          user.oracle.registered = true;
          user.stake = stake;

          await user.save();

          logger.info(`Successfully registered oracle. User: ${username} TX: ${data.trx_id}`, data);

          broadcastToUser(username, 'register-oracle', JSON.stringify({ success: true }));

          try {
            const transaction = {
              account: username,
              counterparty: null,
              type: 'register-oracle',
              chain_block: data.block_num,
              sidechain_block: null,
              trx_id: data.trx_id,
              market_id: null,
              data: JSON.stringify({
                stake,
              }),
              timestamp: new Date(`${data.timestamp}Z`).getTime(),
            };

            await Transaction.create(transaction);
          } catch (e) {
            logger.log(`Error: Inserting oracle creation transaction. User: ${username} TX: ${data.trx_id} Message: ${e.message}`);
          }
        }
      }
    } catch (e) {
      logger.error(`Failed to register oracle. User: ${username} TX: ${data.trx_id} Message: ${e.message}`, data);
    }
  }
};
