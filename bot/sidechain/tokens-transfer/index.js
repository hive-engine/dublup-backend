const logger = require('../../../common/logger');
const createMarket = require('./create-market');
const buyShares = require('./buy-shares');
const creatorReward = require('./creator-reward');
const oracleReward = require('./oracle-reward');
const reward = require('./reward');
const { parseJSON } = require('../../helpers');

const handlers = {
  create: createMarket,
  buy: buyShares,
  'creator-reward': creatorReward,
  'oracle-reward': oracleReward,
  reward,
};

const fallback = () => { };

module.exports = async (trx, scClient) => {
  const { sender, trx_id: trxId, payload } = trx;

  try {
    const jsonMemo = parseJSON(payload.memo);

    if (!jsonMemo) {
      return;
    }

    let handler = fallback;

    if (jsonMemo.action) {
      handler = handlers[jsonMemo.action];
    } else if (jsonMemo.type) {
      handler = handlers[jsonMemo.type];
    }

    handler({ ...trx, payload: { ...payload, memo: jsonMemo } }, scClient);
  } catch (e) {
    logger.error('Error in processing sidechain payment.', {
      error: e.message, sender, trx_id: trxId, payload,
    });
  }
};
