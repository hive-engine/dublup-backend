const config = require('../../../common/config');
const logger = require('../../../common/logger');
const { Transaction } = require('../../../common/models');
const { insertNotification } = require('../../modules');

module.exports = async (trx) => {
  const {
    sender: username,
    trx_id: trxId,
    chain_block: chainBock,
    sidechain_block: scBlock,
    timestamp,
    payload: {
      quantity, to, symbol, memo,
    },
  } = trx;

  if (username === config.ACCOUNT) {
    try {
      const transaction = {
        account: to,
        counterparty: null,
        type: 'oracle-reward',
        chain_block: chainBock,
        sidechain_block: scBlock,
        trx_id: trxId,
        market_id: memo.market,
        data: JSON.stringify({
          market: memo.market,
          quantity,
          symbol,
        }),
        timestamp,
      };

      await Transaction.create(transaction);
    } catch (e) {
      logger.log(`Error: Inserting oracle reward distribution transaction. User: ${to} TX: ${trxId} Message: ${e.message}`);
    }

    await insertNotification(to, 'oracle-reward', {
      market: memo.market,
      quantity,
      symbol,
    });
  }
};
