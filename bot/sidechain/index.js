const config = require('../../common/config');
const tokensTransfer = require('./tokens-transfer');

const blockProcessor = async (data, scClient) => {
  if (data.length <= 0) return;

  for (let i = 0; i < data.length; i += 1) {
    const trx = data[i];

    if (trx.contract === 'tokens'
      && trx.action === 'transfer'
      && (trx.payload.to === config.ACCOUNT)) {
      await tokensTransfer(trx, scClient);
    }
  }
};

module.exports = {
  blockProcessor,
};
