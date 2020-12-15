const config = require('../../common/config');
const tokensTransfer = require('./tokens-transfer');

const blockProcessor = async (data, scClient, state) => {
  if (data.length <= 0) return;

  for (let i = 0; i < data.length; i += 1) {
    const trx = data[i];

    if (trx.contract === 'tokens'
      && trx.action === 'transfer'
      && (trx.payload.to === config.ACCOUNT || trx.sender === config.ACCOUNT)) {
      await tokensTransfer(trx, scClient);
    }

    state.saveState({ chain: 'hive-engine', block: trx.sidechain_block });
  }
};

module.exports = {
  blockProcessor,
};
