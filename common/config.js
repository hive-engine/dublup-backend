require('dotenv').config();

module.exports = {
  ACCOUNT: process.env.ACCOUNT,
  ACTIVE_KEY: process.env.ACTIVE_KEY,
  DECRYPTION_ACCOUNT: process.env.DECRYPTION_ACCOUNT,
  DECRYPTION_KEY: process.env.DECRYPTION_KEY,
  PUBLIC_DECRYPTION_KEY: process.env.PUBLIC_DECRYPTION_KEY,
  MONGODB: process.env.MONGODB,
  PORT: process.env.PORT || 3000,
  WS_PORT: process.env.WS_PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  CHAIN_NAME: 'hive',
  APP_ID: 'predict-land',
  SIDECHAIN_ID: 'ssc-testnet-reaz',
  SIDECHAIN_RPC: 'https://packmanager.dtools.dev/rpc', // 'https://api.hive-engine.com/rpc',
  NFT_ISSUE_FEE_SYMBOL: 'BEE',
  NFT_SYMBOL: 'PREDICT',
  CURRENCY: 'PAL',
  MARKET_FEE: 300, // 3%
  CREATION_FEE: 100,
  SHARE_PRICE: 10,
  MARKET_CREATOR_SHARE: 0.01, // percentage
  ORACLES_SHARE: 0.04, // percentage
  ORACLE_REQUIRED: 3,
  NUMBER_OF_ORACLES: 20,
  ORACLE_STAKE_REQUIREMENT: 10000,
  ACCESS_TOKEN_EXPIRATION: '1d', // 1 day
  REFRESH_TOKEN_EXPIRATION: '90d', // 90 days
  NODES: ['https://api.hive.blog', 'https://api.pharesim.me', 'https://api.hivekings.com', 'https://rpc.ecency.com', 'https://rpc.ausbit.dev'],
  ADMINS: ['reazuliqbal', 'aggroed', 'clayboyn'],
  REPORTING_DURATION: 1, // in days
  CORRECT_REPORTING_REP_REWARD: 1,
  INCORRECT_REPORTING_REP_REWARD: -10,
};
