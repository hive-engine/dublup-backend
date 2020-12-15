const logger = require('../../../common/logger');
const { Transaction } = require('../../../common/models');

module.exports = async (trx) => {
  const {
    trx_id: trxId,
    chain_block: chainBock,
    sidechain_block: scBlock,
    timestamp,
    payload: {
      quantity, to, symbol, memo,
    },
  } = trx;

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
};
