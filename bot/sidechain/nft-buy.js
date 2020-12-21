const config = require('../../common/config');
const logger = require('../../common/logger');
const { Transaction } = require('../../common/models');

module.exports = async (trx, scClient) => {
  const {
    sender: username,
    trx_id: trxId,
    chain_block: chainBock,
    sidechain_block: scBlock,
    timestamp,
    logs,
  } = trx;

  try {
    const [hitSellOrder] = logs.events.filter((e) => e.contract === 'nftmarket'
      && e.event === 'hitSellOrder'
      && e.data.symbol === config.NFT_SYMBOL);

    const nftIds = hitSellOrder.data.sellers.map((o) => o.nftIds)
      .flat(Infinity)
      .map((n) => Number(n));

    let nftData = await scClient.getNFTInstances(config.NFT_SYMBOL, { _id: { $in: nftIds } });

    nftData = nftData.map((nft) => {
      delete nft.properties.uid;

      return {
        nft_id: nft._id,
        ...nft.properties,
      };
    })
      .reduce((acc, cur) => {
        acc[cur.nft_id] = cur;

        return acc;
      }, {});

    const transactions = [];

    try {
      for (let i = 0; i < hitSellOrder.data.sellers.length; i += 1) {
        const seller = hitSellOrder.data.sellers[i];

        const groupedByMarket = seller.nftIds.reduce((acc, cur) => {
          const nft = nftData[cur];

          if (!acc[nft.market]) acc[nft.market] = [];

          acc[nft.market].push(nft);

          return acc;
        }, {});

        Object.keys(groupedByMarket).forEach((market) => {
          transactions.push({
            account: username,
            counterparty: seller.account,
            type: 'market-buy',
            chain_block: chainBock,
            sidechain_block: scBlock,
            trx_id: trxId,
            market_id: market,
            data: JSON.stringify({
              nfts: groupedByMarket[market],
              payment: seller.paymentTotal,
              symbol: hitSellOrder.data.priceSymbol,
            }),
            timestamp,
          });
        });
      }

      await Transaction.insertMany(transactions);
    } catch (e) {
      logger.error(`Error: Inserting buy order transactions. User: ${username} TX: ${trxId} Message: ${e.message}`, { transactions });
    }
  } catch (e) {
    logger.error(`Error: Updating buy order record. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
