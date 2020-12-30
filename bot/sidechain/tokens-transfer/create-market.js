const config = require('../../../common/config');
const schemas = require('../../schemas');
const logger = require('../../../common/logger');
const { Market, Transaction } = require('../../../common/models');
const { broadcastToUser } = require('../../../common/websocket');
const { generateQuestion, generatePossibleOutcomes, refundToken } = require('../../helpers');

module.exports = async (trx) => {
  const {
    sender: username,
    trx_id: trxId,
    chain_block: chainBock,
    sidechain_block: scBlock,
    timestamp,
    payload: { quantity, symbol, memo },
  } = trx;

  try {
    const receivedAmount = Number(quantity);

    if (receivedAmount < config.CREATION_FEE || symbol !== config.CURRENCY) {
      const message = `Insufficient market creation fee. Required fee is ${config.CREATION_FEE} ${config.CURRENCY}.`;

      broadcastToUser(username, 'create-market', JSON.stringify({ success: false, message }));

      return refundToken(username, quantity, symbol, message);
    }

    if (!memo || !memo.payload.template) {
      const message = 'Market question template not found.';

      broadcastToUser(username, 'create-market', JSON.stringify({ success: false, message }));

      return refundToken(username, quantity, symbol, message);
    }

    const schema = schemas[memo.payload.template];

    if (!schema) {
      const message = 'Request contains unprocessable entities.';

      broadcastToUser(username, 'create-market', JSON.stringify({ success: false, message }));

      return refundToken(username, quantity, symbol, message);
    }

    const { error, value } = schema.validate(memo.payload, {
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      const message = `Error: ${error.details[0].message}`;

      broadcastToUser(username, 'create-market', JSON.stringify({ success: false, message }));

      return refundToken(username, quantity, symbol, message);
    }

    let question = generateQuestion(value);

    if (value.template === 'custom') {
      question = value.question;
    }

    if (!question) {
      const message = 'Error in generating market question.';

      broadcastToUser(username, 'create-market', JSON.stringify({ success: false, message }));

      return refundToken(username, quantity, symbol, message);
    }

    let possibelOutcomes = {};

    if (value.type === 'binary') {
      possibelOutcomes = generatePossibleOutcomes(['Yes', 'No']);
    } else if (value.type === 'categorical') {
      possibelOutcomes = generatePossibleOutcomes(value.outcomes);
    }

    const marketCreateOp = {
      creator: username,
      question,
      category: value.category,
      sub_category: value.sub_category,
      type: value.type,
      template: value.template,
      data: value,
      creation_fee: {
        amount: receivedAmount,
        symbol: config.CURRENCY,
      },
      share_price: {
        amount: config.SHARE_PRICE,
        symbol: config.CURRENCY,
      },
      liquidity: {
        amount: 0,
        symbol: config.CURRENCY,
      },
      possible_outcomes: possibelOutcomes,
      closes_at: value.closeDate,
      expires_at: value.expiryDate,
    };

    if (value.template === 'custom' && value.rules) marketCreateOp.rules = value.rules;

    const market = await Market.create(marketCreateOp);

    logger.info(`Market creation has been successful. User: ${username} TX: ${trxId}`, value);

    broadcastToUser(username, 'create-market', JSON.stringify({ success: true, message: 'Market creation has been successful.' }));

    try {
      const transaction = {
        account: username,
        counterparty: null,
        type: 'create-market',
        chain_block: chainBock,
        sidechain_block: scBlock,
        trx_id: trxId,
        market_id: market._id,
        data: JSON.stringify({
          market_id: market._id,
          question,
        }),
        timestamp,
      };

      await Transaction.create(transaction);
    } catch (e) {
      logger.log(`Error: Inserting market creation transaction. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }
  } catch (e) {
    logger.error(`Error: Creating market. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
