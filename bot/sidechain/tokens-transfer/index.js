const logger = require('../../../common/logger');
const createMarket = require('./create-market');
const buyShares = require('./buy-shares');
const { parseJSON } = require('../../helpers');

const handlers = {
  create: createMarket,
  buy: buyShares,
};

const fallback = () => { };

module.exports = async (trx, scClient) => {
  const { sender, trx_id: trxId, payload } = trx;

  try {
    const jsonMemo = parseJSON(payload.memo);

    if (!jsonMemo || !jsonMemo.action) {
      return;
    }

    const handler = handlers[jsonMemo.action] || fallback;

    handler({ ...trx, payload: { ...payload, memo: jsonMemo } }, scClient);
  } catch (e) {
    logger.error('Error in processing sidechain payment.', {
      error: e.message, sender, trx_id: trxId, payload,
    });
  }
};
