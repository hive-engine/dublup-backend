const mongoose = require('mongoose');
const config = require('../config');
const { generateUlid } = require('../utils');

const MarketSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: generateUlid,
  },
  creator: {
    type: String,
    required: true,
    index: true,
  },
  question: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  sub_category: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['binary', 'categorical'],
  },
  template: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
  status: {
    type: Number,
    // 0 = inactive, 1 = open, 2 = closed 3 = reporting, 4 = reported, 5 = finalized
    enum: [0, 1, 2, 3, 4, 5],
    default: 1,
  },
  outcome: String,
  possible_outcomes: Object,
  creation_fee: {
    amount: Number,
    symbol: {
      type: String,
      uppercase: true,
      default: config.CURRENCY,
    },
  },
  share_price: {
    amount: Number,
    symbol: {
      type: String,
      uppercase: true,
      default: config.CURRENCY,
    },
  },
  liquidity: {
    amount: Number,
    symbol: {
      type: String,
      uppercase: true,
      default: config.CURRENCY,
    },
  },
  rules: {
    type: Array,
  },
  oracles: [{
    type: String,
  }],
  reported_outcomes: Object,
  closes_at: {
    type: Date,
    required: true,
  },
  expires_at: {
    type: Date,
    required: true,
  },
  __v: { type: Number, select: false },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

MarketSchema.index({
  question: 'text', category: 'text', sub_category: 'text', type: 'text', creator: 'text',
}, { background: true });

module.exports = mongoose.model('Market', MarketSchema);
