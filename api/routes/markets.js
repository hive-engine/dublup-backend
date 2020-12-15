const Joi = require('joi');
const crypto = require('crypto');
const { Market } = require('../../common/models');

module.exports = [
  {
    method: 'GET',
    path: '/markets',
    options: {
      auth: {
        strategies: ['jwt'],
        mode: 'try',
        payload: false,
      },
      validate: {
        query: Joi.object({
          creator: Joi.string().min(3).max(16),
          category: Joi.string().when(Joi.ref('sub_category'), { is: Joi.exist(), then: Joi.required() }),
          sub_category: Joi.string(),
          page: Joi.number().min(1).default(1),
          limit: Joi.number().min(1).max(1000).default(50),
          status: Joi.number().min(0).max(5).default(1),
          sort_by: Joi.string().valid('liquidity', 'newest', 'oldest', 'ending_soon').default('liquidity'),
          oracle: Joi.string().min(3).max(16),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const {
        creator, category, sub_category: subCategory, limit, page, status, sort_by: sortBy, oracle,
      } = request.query;

      const skip = (page - 1) * limit;

      let match = {};
      match.status = status;

      if (oracle && request.auth
        && request.auth.credentials
        && request.auth.credentials.sub === oracle) {
        match = { ...match, oracles: oracle, $expr: { $lte: [`$reported_outcomes.${oracle}`, null] } };
      }

      const sort = {};

      if (sortBy === 'liquidity') sort['liquidity.amount'] = -1;
      if (sortBy === 'newest') sort.created_at = -1;
      if (sortBy === 'oldest') sort.created_at = 1;
      if (sortBy === 'ending_soon') sort.expires_at = 1;

      if (creator) match.creator = creator;
      if (category) match.category = category;
      if (subCategory) match.sub_category = subCategory;

      const query = [{
        $match: match,
      },
      {
        $sort: sort,
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          results: [{ $skip: skip }, { $limit: limit }, {
            $project: {
              _id: 0,
              id: '$_id',
              creator: 1,
              status: 1,
              outcome: 1,
              possible_outcomes: 1,
              question: 1,
              category: 1,
              sub_category: 1,
              type: 1,
              expires_at: 1,
              created_at: 1,
              share_price: 1,
              liquidity: 1,
              rules: 1,
            },
          }],
        },
      },
      {
        $project: {
          results: 1,
          total: { $arrayElemAt: ['$metadata.total', 0] },
        },
      }];

      const [aggregate] = await Market.aggregate(query);

      const response = {
        ...aggregate, limit, page, pages: Math.ceil(aggregate.total / limit) || 0,
      };

      const hash = crypto.createHash('sha1');
      hash.update(JSON.stringify(response));

      const etag = hash.digest('base64');

      return h.response(response).etag(etag);
    },
  },

  {
    method: 'GET',
    path: '/markets/info',
    options: {
      validate: {
        query: Joi.object({
          id: Joi.string().length(26).required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { id } = request.query;

      const market = await Market.findOne({ _id: id }).select({
        _id: 0,
        id: '$_id',
        creator: 1,
        status: 1,
        outcome: 1,
        possible_outcomes: 1,
        question: 1,
        category: 1,
        sub_category: 1,
        type: 1,
        expires_at: 1,
        created_at: 1,
        share_price: 1,
        liquidity: 1,
        template: 1,
        rules: 1,
      });

      const hash = crypto.createHash('sha1');
      hash.update(JSON.stringify(market));

      const etag = hash.digest('base64');

      return h.response(market).etag(etag);
    },
  },

  {
    method: 'GET',
    path: '/markets/search',
    options: {
      validate: {
        query: Joi.object({
          q: Joi.string().required(),
          page: Joi.number().min(1).default(1),
          limit: Joi.number().min(1).max(1000).default(50),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      const { q, page, limit } = request.query;

      const skip = (page - 1) * limit;

      const query = [
        { $match: { $text: { $search: q } } },
        { $addFields: { relevance: { $meta: 'textScore' } } },
        { $sort: { relevance: -1 } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            results: [{ $skip: skip }, { $limit: limit }, {
              $project: {
                _id: 0,
                id: '$_id',
                creator: 1,
                status: 1,
                outcome: 1,
                possible_outcomes: 1,
                question: 1,
                category: 1,
                sub_category: 1,
                type: 1,
                expires_at: 1,
                created_at: 1,
                share_price: 1,
                liquidity: 1,
                relevance: 1,
              },
            }],
          },
        },
        {
          $project: {
            results: 1,
            total: { $arrayElemAt: ['$metadata.total', 0] },
          },
        },
      ];

      const [aggregate] = await Market.aggregate(query);

      const response = {
        ...aggregate, limit, page, pages: Math.ceil(aggregate.total / limit) || 0,
      };

      const hash = crypto.createHash('sha1');
      hash.update(JSON.stringify(response));

      const etag = hash.digest('base64');

      return h.response(response).etag(etag);
    },
  },
];
