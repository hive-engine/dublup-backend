const config = require('../../common/config');
const nftBuy = require('./nft-buy');
const tokensTransfer = require('./tokens-transfer');

const blockProcessor = async (data, scClient, state) => {
  if (data.length <= 0) return;

  for (let i = 0; i < data.length; i += 1) {
    const trx = data[i];

    if (trx.contract === 'nftmarket'
      && trx.action === 'buy'
      && trx.payload.symbol === config.NFT_SYMBOL) {
      await nftBuy(trx, scClient);
    }

    if (trx.contract === 'tokens'
      && trx.action === 'transfer'
      && (trx.payload.to === config.ACCOUNT || trx.sender === config.ACCOUNT)) {
      await tokensTransfer(trx, scClient);
    }
  }

  state.saveState({ chain: 'hive-engine', block: data[0].sidechain_block });
};

module.exports = {
  blockProcessor,
};
