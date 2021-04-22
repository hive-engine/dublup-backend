/* eslint-disable no-console */
const EventEmiter = require('events');
const axios = require('axios').default;

class Stream extends EventEmiter {
  constructor(nodes = ['https://api.hive.blog', 'https://api.openhive.network', 'https://rpc.ausbit.dev']) {
    super();

    this.nodes = nodes;

    const [node] = this.nodes;

    this.node = node;
    this.shouldStream = true;
  }

  node() {
    return this.node;
  }

  failover(reason = '') {
    let index = this.nodes.indexOf(this.node) + 1;

    if (index === this.nodes.length) index = 0;

    this.node = this.nodes[index];

    console.log(`Failed over to: ${this.node}. Reason: ${reason}`);
  }

  processResponse(data) {
    const { timestamp, transactions } = data;

    for (let i = 0; i < transactions.length; i += 1) {
      const trx = transactions[i];
      for (let j = 0; j < trx.operations.length; j += 1) {
        const op = trx.operations[j];

        const [opName, opData] = op;

        this.emit(opName, {
          block_num: trx.block_num, trx_id: trx.transaction_id, ...opData, timestamp,
        });
      }
    }

    this.emit('block', Number.parseInt(data.block_id.slice(0, 8), 16));
  }

  async send(request) {
    const postData = {
      jsonrpc: '2.0',
      id: Date.now(),
      ...request,
    };

    let result = null;

    const query = await axios.post(this.node, postData, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

    result = query.data.result;

    return result;
  }

  async getLatestBlockNumber() {
    const request = {
      method: 'condenser_api.get_dynamic_global_properties',
      params: [],
    };

    const data = await this.send(request);

    return data.head_block_number;
  }

  async getBlock(blockNumber) {
    const request = {
      method: 'condenser_api.get_block',
      params: [blockNumber],
    };

    return this.send(request);
  }

  async start(start, end = null, ts = 1000) {
    if (!this.shouldStream) return;

    let startBlock = start;
    const endBlock = end;

    try {
      if (!startBlock) {
        startBlock = await this.getLatestBlockNumber();
      }

      const res = await this.getBlock(startBlock);
      let nextBlock = startBlock;

      if (res) {
        this.processResponse(res);
        nextBlock += 1;
      }

      if (endBlock === null || (endBlock && nextBlock <= endBlock)) {
        setTimeout(() => {
          this.start(nextBlock, endBlock, ts);
        }, ts);
      }
    } catch (err) {
      this.failover(err.message);

      setTimeout(() => {
        this.start(startBlock, endBlock, ts);
      }, ts);
    }
  }

  stop() {
    this.shouldStream = false;
  }
}

module.exports = Stream;
