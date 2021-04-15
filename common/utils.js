const { monotonicFactory } = require('ulid');
const Sidechain = require('./Sidechain');
const config = require('./config');

const ulid = monotonicFactory();

const generateUlid = () => ulid();

const SidechainClient = new Sidechain({
  chain: config.CHAIN_NAME,
  blockchain: `${config.SIDECHAIN_RPC}/blockchain`,
  contract: `${config.SIDECHAIN_RPC}/contracts`,
  blockProcessor: () => { },
});

const sortObject = (object) => Object.fromEntries(Object.entries(object).sort());

const sortObjects = (objects) => objects.map((o) => sortObject(o));

module.exports = {
  generateUlid,
  SidechainClient,
  sortObjects,
};
