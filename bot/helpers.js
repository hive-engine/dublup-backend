const { format } = require('date-fns');
const { utils, activeKey, getClient } = require('../common/chain');
const Sidechain = require('../common/Sidechain');
const config = require('../common/config');
const logger = require('../common/logger');
const questionsData = require('../data/questions.json');

const questions = Object.values(questionsData).flat(Infinity);
const hiveClient = getClient();

const SidechainClient = new Sidechain({
  chain: config.CHAIN_NAME,
  blockchain: `${config.SIDECHAIN_RPC}/blockchain`,
  contract: `${config.SIDECHAIN_RPC}/contracts`,
  blockProcessor: () => { },
});

const arrayChunk = (array, size = 10) => {
  const chunkedArray = [];
  let index = 0;

  while (index < array.length) {
    chunkedArray.push(array.slice(index, size + index));
    index += size;
  }

  return chunkedArray;
};

// https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array#6274398
const arrayShuffle = (array) => {
  const source = array;
  let counter = source.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    const index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter -= 1;

    // And swap the last element with it
    const temp = source[counter];
    source[counter] = source[index];
    source[index] = temp;
  }

  return source;
};

const countOccurances = (array) => array.reduce((acc, cur) => {
  if (!acc[cur]) acc[cur] = 0;

  acc[cur] += 1;
  return acc;
}, {});

const generateQuestion = (data) => {
  const question = questions.find((q) => q.id === data.template);

  if (!question) {
    return null;
  }

  return question.replaceable.replace(/\[(\w+)\]/g, (_, p) => {
    if (['startDate', 'endDate', 'date'].includes(p)) {
      return format(new Date(data[p]), 'MMMM dd, yyyy');
    }

    return data[p];
  });
};

const generatePossibleOutcomes = (array) => array.reduce((a, b) => {
  a[b] = 0;

  return a;
}, {});

const getRandomValues = (array, count) => {
  const result = [];
  const _tmp = array.slice();

  for (let i = 0; i < count; i += 1) {
    if (result.length === array.length) break;

    const index = Math.ceil(Math.random() * 10) % _tmp.length;
    result.push(_tmp.splice(index, 1)[0]);
  }

  return result;
};

const issueMultiple = async (instances) => {
  const issueOp = {
    contractName: 'nft',
    contractAction: 'issueMultiple',
    contractPayload: {
      instances,
    },
  };

  await hiveClient.broadcast.json({
    required_auths: [config.ACCOUNT],
    required_posting_auths: [],
    id: config.SIDECHAIN_ID,
    json: JSON.stringify(issueOp),
  }, activeKey);
};

const msToMidnight = () => {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0,
  );

  return night.getTime() - now.getTime();
};

const parseJSON = (json) => {
  try {
    return JSON.parse(json);
  } catch {
    //
  }

  return null;
};

const refundToken = async (to, quantity, symbol, memo = '', sender) => {
  const account = sender || config.ACCOUNT;

  const json = {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: {
      symbol,
      to,
      quantity: quantity.toString(),
      memo,
    },
  };

  await hiveClient.broadcast.json({
    required_auths: [account],
    required_posting_auths: [],
    id: config.SIDECHAIN_ID,
    json: JSON.stringify(json),
  }, activeKey);

  logger.info(`Refunded ${quantity} ${symbol} to ${to}. Reason: ${memo}`);
};

const toFixedWithoutRounding = (t, l = 3) => {
  const a = 10 ** l;
  const s = t * a;
  return Math.trunc(s) / a;
};

module.exports = {
  ...utils,
  arrayChunk,
  arrayShuffle,
  countOccurances,
  generateQuestion,
  generatePossibleOutcomes,
  getRandomValues,
  issueMultiple,
  msToMidnight,
  parseJSON,
  refundToken,
  SidechainClient,
  toFixedWithoutRounding,
};
