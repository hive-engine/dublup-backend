const Sidechain = require('../common/Sidechain');
const logger = require('../common/logger');
const config = require('../common/config');
const Stream = require('./Stream');
const operations = require('./operations');
const { getClient, BlockchainMode } = require('../common/chain');
const { blockProcessor } = require('./sidechain');
const { settleReportedMarkets, updateMarketsStatus, updateOracleStakes } = require('./modules');

require('../common/db');

const client = getClient();

const streamOptions = {
  // from: 48819202,
  // to: 48819202,
  mode: BlockchainMode.Latest,
};

const stream = new Stream(client, streamOptions);

stream.start();

stream.on('custom_json', (data) => operations.customJson(client, data));

stream.on('error', async (error) => {
  logger.error(error.message);
});

const SidechainClient = new Sidechain({
  chain: config.CHAIN_NAME,
  blockchain: `${config.SIDECHAIN_RPC}/blockchain`,
  contract: `${config.SIDECHAIN_RPC}/contracts`,
  blockProcessor,
});

const main = async () => {
  let blockNumber = 0;

  const blockInfo = await SidechainClient.getLatestBlockInfo();
  blockNumber = blockInfo.blockNumber;

  SidechainClient.streamBlocks(blockNumber);

  await updateMarketsStatus();

  await settleReportedMarkets();

  await updateOracleStakes();
};

main();
