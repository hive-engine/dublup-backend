const { Config } = require('../../common/models');
const config = require('../../common/config');

module.exports = [{
  method: 'GET',
  path: '/settings',
  handler: async () => {
    const { creation_fee: CREATION_FEE, share_price: SHARE_PRICE } = await Config.findOne({});

    return {
      app_id: config.APP_ID,
      account: config.ACCOUNT,
      currency: config.CURRENCY,
      symbol: config.NFT_SYMBOL,
      market_fee: config.MARKET_FEE,
      creation_fee: CREATION_FEE,
      creation_fee_account: config.CREATION_FEE_ACCOUNT,
      share_price: SHARE_PRICE,
      sidechain_id: config.SIDECHAIN_ID,
      sidechain_rpc: config.SIDECHAIN_RPC,
      chain: config.CHAIN_NAME,
      oracle_stake_requirement: config.ORACLE_STAKE_REQUIREMENT,
      reporting_account: config.DECRYPTION_ACCOUNT,
      public_key: config.PUBLIC_DECRYPTION_KEY,
      correct_reporting_reward: config.CORRECT_REPORTING_REP_REWARD,
      incorrect_reporting_penalty: config.INCORRECT_REPORTING_REP_REWARD,
      max_consecutive_misses: config.MAX_CONSECUTIVE_MISSES,
      creator_reward_share: config.MARKET_CREATOR_SHARE,
      oracle_reward_share: config.ORACLES_SHARE,
      participants_reward_share: 1 - (config.MARKET_CREATOR_SHARE + config.ORACLES_SHARE),
    };
  },
}];
