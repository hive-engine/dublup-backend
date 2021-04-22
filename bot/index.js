const nodeCleanup = require('node-cleanup');
const Sidechain = require('../common/Sidechain');
const logger = require('../common/logger');
const config = require('../common/config');
const DB = require('../common/db');
const Stream = require('./Stream');
const State = require('../common/state');
const operations = require('./operations');
const { sleep } = require('./helpers');
const { getClient } = require('../common/chain');
const { blockProcessor } = require('./sidechain');
const { settleReportedMarkets, updateMarketsStatus, updateOracleStakes } = require('./modules');

const state = new State();

state.createTable();

const client = getClient();

let hiveStream;
let SidechainClient;

const main = async () => {
  const lastHiveBlock = await state.loadState('hive');
  const lastHEBlock = await state.loadState('hive-engine');

  hiveStream = new Stream(config.NODES);

  hiveStream.start(lastHiveBlock === 0 ? undefined : lastHiveBlock + 1);

  hiveStream.on('custom_json', (data) => operations.customJson(client, data));

  hiveStream.on('block', (block) => state.saveState({ chain: 'hive', block }));

  hiveStream.on('error', async (error) => {
    logger.error(error.message);
  });

  SidechainClient = new Sidechain({
    chain: config.CHAIN_NAME,
    blockchain: `${config.SIDECHAIN_RPC}/blockchain`,
    contract: `${config.SIDECHAIN_RPC}/contracts`,
    blockProcessor,
  });

  let blockNumber = lastHEBlock + 1;

  if (blockNumber <= 1) {
    const blockInfo = await SidechainClient.getLatestBlockInfo();
    blockNumber = blockInfo.blockNumber;
  }

  SidechainClient.streamBlocks(blockNumber, null, 1000, state);

  await updateMarketsStatus();

  await settleReportedMarkets();

  await updateOracleStakes();
};

main();

const shutDownSequence = async (exitCode, signal) => {
  SidechainClient.stopStream();
  hiveStream.stop();

  await sleep(30 * 1000);

  await state.destroy();
  await DB.close();

  process.kill(process.pid, signal);
};

nodeCleanup((exitCode, signal) => {
  shutDownSequence(exitCode, signal);

  nodeCleanup.uninstall();

  return false;
});
