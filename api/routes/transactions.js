const Joi = require('joi');
const crypto = require('crypto');
const { Transaction } = require('../../common/models');

module.exports = [
  {
    method: 'GET',
    path: '/transactions/history',

    options: {
      validate: {
        query: Joi.object({
          username: Joi.string().min(3).max(16),
          types: Joi.string(),
          limit: Joi.number().min(1).max(1000).default(1000),
          page: Joi.number().min(1).default(1),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const {
        username, types, limit, page,
      } = request.query;

      const skip = (page - 1) * limit;

      const query = {};

      const transactionTypes = (types) ? types.split(',') : '';

      let tTypes = { $ne: 'report-outcome' };
      if (transactionTypes) tTypes = { ...tTypes, $in: transactionTypes };

      query.type = tTypes;

      if (username) query.$or = [{ account: username }, { counterparty: username }];

      const allTransactions = await Transaction.find(query)
        .select('-_id')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      const hash = crypto.createHash('sha1');
      hash.update(JSON.stringify(allTransactions));

      const etag = hash.digest('base64');

      return h.response(allTransactions).etag(etag);
    },
  },

  {
    method: 'GET',
    path: '/transactions/find',
    options: {
      validate: {
        query: Joi.object({
          trx_id: Joi.string().required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { trx_id: trxId } = request.query;

      const transaction = await Transaction.findOne({ trx_id: trxId, type: { $ne: 'report-outcome' } }).select('-_id').lean();

      const hash = crypto.createHash('sha1');
      hash.update(JSON.stringify(transaction));

      const etag = hash.digest('base64');

      return h.response(transaction).etag(etag);
    },
  },
];
