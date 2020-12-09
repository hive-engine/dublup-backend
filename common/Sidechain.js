const axios = require('axios').default;
const http = require('http');
const https = require('https');

const STEEM_ENGINE_BASE = 'https://api.steem-engine.com/rpc';
const HIVE_ENGINE_BASE = 'https://api.hive-engine.com/rpc';

class Sidechain {
  constructor({
    chain, blockchain, contract, blockProcessor,
  }) {
    this.BLOCKCHAIN_RPC = blockchain || `${HIVE_ENGINE_BASE}/blockchain`;
    this.CONTRACT_RPC = contract || `${HIVE_ENGINE_BASE}/contracts`;

    if (chain && chain === 'steem') {
      this.BLOCKCHAIN_RPC = `${STEEM_ENGINE_BASE}/blockchain`;
      this.CONTRACT_RPC = `${STEEM_ENGINE_BASE}/contracts`;
    }

    this.PROCESSOR = blockProcessor;
  }

  static async send(rpc, request) {
    const postData = {
      jsonrpc: '2.0',
      id: Date.now(),
      ...request,
    };

    let result = null;

    const query = await axios.post(rpc, postData, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
    });

    result = query.data.result;

    return result;
  }

  blockchain(request) {
    return this.constructor.send(this.BLOCKCHAIN_RPC, request);
  }

  contract(request) {
    return this.constructor.send(this.CONTRACT_RPC, request);
  }

  getLatestBlockInfo() {
    const request = {
      method: 'getLatestBlockInfo',
    };

    return this.blockchain(request);
  }

  getBlockInfo(blockNumber) {
    const request = {
      method: 'getBlockInfo',
      params: {
        blockNumber,
      },
    };

    return this.blockchain(request);
  }

  static processResponse(response) {
    const logs = JSON.parse(response.logs);

    if (!logs.errors && logs.events) {
      return {
        chain_block: response.refHiveBlockNumber || response.refSteemBlockNumber,
        sidechain_block: response.blockNumber,
        trx_id: response.transactionId,
        sender: response.sender,
        contract: response.contract,
        action: response.action,
        timestamp: new Date(`${response.timestamp}Z`).getTime(),
        payload: JSON.parse(response.payload),
        logs: JSON.parse(response.logs),
        isVirtualTransaction: response.virtualTransaction || false,
      };
    }

    return null;
  }

  processResponses(response) {
    const processedTransactions = [];

    const {
      blockNumber, timestamp, transactions, virtualTransactions,
    } = response;

    transactions.forEach((t) => {
      const trx = this.constructor.processResponse({ ...t, timestamp, blockNumber });

      if (trx) processedTransactions.push(trx);
    });

    virtualTransactions.forEach((t) => {
      const trx = this.constructor.processResponse({
        ...t,
        payload: (t.payload === '') ? '{}' : t.payload,
        timestamp,
        blockNumber,
        virtualTransaction: true,
      });

      if (trx) processedTransactions.push(trx);
    });

    return processedTransactions;
  }

  async streamBlocks(startBlock, endBlock = null, ts = 1000) {
    try {
      const res = await this.getBlockInfo(startBlock);
      let nextBlock = startBlock;

      if (res !== null) {
        const response = this.processResponses(res);
        this.PROCESSOR(response, this);
        nextBlock += 1;
      }

      if (endBlock === null || (endBlock && nextBlock <= endBlock)) {
        setTimeout(() => {
          this.streamBlocks(nextBlock, endBlock, ts);
        }, ts);
      }
    } catch (err) {
      setTimeout(() => {
        this.streamBlocks(startBlock, endBlock, ts);
      }, ts);
    }
  }

  getTransactionInfo(txid) {
    const request = {
      method: 'getTransactionInfo',
      params: {
        txid,
      },
    };

    return this.blockchain(request);
  }

  // CONTRACTS

  getBalance(account, symbol) {
    const query = { account };
    if (symbol) query.symbol = symbol;

    const request = {
      method: 'find',
      params: {
        contract: 'tokens',
        table: 'balances',
        query,
      },
    };

    return this.contract(request);
  }

  getBalances(query, offset = 0, limit = 1000) {
    const request = {
      method: 'find',
      params: {
        contract: 'tokens',
        table: 'balances',
        query,
        offset,
        limit,
      },
    };

    return this.contract(request);
  }

  getMetrics(symbols) {
    const request = {
      method: 'find',
      params: {
        contract: 'market',
        table: 'metrics',
        query: { symbol: { $in: symbols } },
      },
    };

    return this.contract(request);
  }

  getSellBook(symbol, limit = 5) {
    const request = {
      method: 'find',
      params: {
        contract: 'market',
        table: 'sellBook',
        query: { symbol },
        indexes: [{ index: 'priceDec', descending: false }],
        limit,
      },
    };

    return this.contract(request);
  }

  getOrders(account, symbol, type = 'buy', limit = 100, descending = true) {
    const query = {};
    if (symbol !== null) query.symbol = symbol;
    if (account !== null) query.account = account;

    const request = {
      method: 'find',
      params: {
        contract: 'market',
        query,
        indexes: [{ index: 'priceDec', descending }],
        limit,
        offset: 0,
      },
    };

    request.params.table = (type === 'buy') ? 'buyBook' : 'sellBook';

    return this.contract(request);
  }

  getNFTSellBook(symbol, query = {}, offset = 0, limit = 1000) {
    const request = {
      method: 'find',
      params: {
        contract: 'nftmarket',
        table: `${symbol}sellBook`,
        query,
        offset,
        limit,
      },
    };

    return this.contract(request);
  }

  getNFTInstances(symbol, query = {}, offset = 0, limit = 1000) {
    const request = {
      method: 'find',
      params: {
        contract: 'nft',
        table: `${symbol}instances`,
        query,
        offset,
        limit,
      },
    };

    return this.contract(request);
  }

  getNFTInstance(symbol, id) {
    const query = { _id: id };

    const request = {
      method: 'findOne',
      params: {
        contract: 'nft',
        table: `${symbol}instances`,
        query,
      },
    };

    return this.contract(request);
  }
}

module.exports = Sidechain;
