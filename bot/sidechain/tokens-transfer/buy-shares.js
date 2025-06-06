const config = require('../../../common/config');
const logger = require('../../../common/logger');
const { Market, Transaction } = require('../../../common/models');
const { broadcastToUser } = require('../../../common/websocket');
const {
  arrayChunk, issueMultiple, refundToken, sleep,
} = require('../../helpers');

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

    let errorMessage = '';

    if (symbol !== config.CURRENCY) {
      errorMessage = `Unsupported symbol. Please send ${config.CURRENCY}.`;

      broadcastToUser(username, 'buy-shares', JSON.stringify({ success: false, message: errorMessage }));

      return refundToken(username, quantity, symbol, errorMessage);
    }

    if (!memo || !memo.payload.market || !memo.payload.quantity || !memo.payload.outcome) {
      errorMessage = 'Invalid buy action payload.';

      broadcastToUser(username, 'buy-shares', JSON.stringify({ success: false, message: errorMessage }));

      return refundToken(username, quantity, symbol, errorMessage);
    }

    const numberOfShares = parseFloat(memo.payload.quantity);

    if (!Number.isInteger(numberOfShares) || numberOfShares < 0) {
      errorMessage = 'Invalid buy action payload. Quantity should be a whole number.';

      broadcastToUser(username, 'buy-shares', JSON.stringify({ success: false, message: errorMessage }));

      return refundToken(username, quantity, symbol, errorMessage);
    }

    const market = await Market.findOne({ _id: memo.payload.market });

    if (!market) {
      errorMessage = 'Market not found.';

      broadcastToUser(username, 'buy-shares', JSON.stringify({ success: false, message: errorMessage }));

      return refundToken(username, quantity, symbol, errorMessage);
    }

    if (market.status !== 1 || Date.now() >= new Date(market.closes_at).getTime()) {
      errorMessage = 'Market is not open.';

      broadcastToUser(username, 'buy-shares', JSON.stringify({ success: false, message: errorMessage }));

      return refundToken(username, quantity, symbol, errorMessage);
    }

    if (!Object.keys(market.possible_outcomes).includes(memo.payload.outcome)) {
      errorMessage = 'Invalid buy action payload. Unknown outcome.';

      broadcastToUser(username, 'buy-shares', JSON.stringify({ success: false, message: errorMessage }));

      return refundToken(username, quantity, symbol, errorMessage);
    }

    const totalPrice = market.share_price.amount * numberOfShares;

    if (totalPrice > receivedAmount) {
      errorMessage = `Insufficient amount sent. Please send at least ${totalPrice} ${market.share_price.symbol}.`;

      broadcastToUser(username, 'buy-shares', JSON.stringify({ success: false, message: errorMessage }));

      return refundToken(username, quantity, symbol, errorMessage);
    }

    const nftInstances = [];

    for (let id = 1; id <= numberOfShares; id += 1) {
      nftInstances.push({
        symbol: config.NFT_SYMBOL,
        to: username,
        feeSymbol: config.NFT_ISSUE_FEE_SYMBOL,
        properties: {
          market: market._id,
          outcome: memo.payload.outcome,
          uid: `${trxId}-${id}`,
        },
      });
    }

    const issueChunks = arrayChunk(nftInstances);

    for (let i = 0; i < issueChunks.length; i += 1) {
      try {
        await issueMultiple(issueChunks[i]);
        await sleep(2 * 1000);
      } catch (e) {
        logger.error(`Failed to broadcast NFT issuance. Message: ${e.message}  User: ${username} MKT: ${market._id} TX: ${trxId}`, issueChunks[i]);
      }
    }

    broadcastToUser(username, 'buy-shares', JSON.stringify({
      success: true,
      message: `You have been issued ${numberOfShares} shares. Outcome: ${memo.payload.outcome} Market: ${market._id}`,
    }));

    logger.info(`${numberOfShares} has been issued successfully. User: ${username} MKT: ${market._id} TX: ${trxId}`, memo.payload);

    try {
      const possibleOutcomes = Object.keys(market.possible_outcomes).reduce((acc, cur) => {
        if (cur === memo.payload.outcome) {
          acc[cur] = market.possible_outcomes[cur] + numberOfShares;
        } else {
          acc[cur] = market.possible_outcomes[cur];
        }

        return acc;
      }, {});

      market.possible_outcomes = possibleOutcomes;

      market.liquidity = {
        amount: market.liquidity.amount + totalPrice,
        symbol: config.CURRENCY,
      };

      await market.save();
    } catch (e) {
      logger.error(`Failed to update market with possible outcomes. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }

    try {
      const transaction = {
        account: username,
        counterparty: null,
        type: 'buy-shares',
        chain_block: chainBock,
        sidechain_block: scBlock,
        trx_id: trxId,
        market_id: market._id,
        data: JSON.stringify({
          market: market._id,
          quantity: memo.payload.quantity,
          outcome: memo.payload.outcome,
        }),
        timestamp,
      };

      await Transaction.create(transaction);
    } catch (e) {
      logger.log(`Error: Inserting market creation transaction. User: ${username} TX: ${trxId} Message: ${e.message}`);
    }
  } catch (e) {
    logger.error(`Error: Buying shares. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
