const mongoose = require('mongoose');
const config = require('../config');

const ConfigSchema = new mongoose.Schema({
  creation_fee: {
    type: Number,
    default: config.CREATION_FEE,
  },
  share_price: {
    type: Number,
    default: config.SHARE_PRICE,
  },
  __v: { type: Number, select: false },
}, {
  collection: 'config',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = mongoose.model('Config', ConfigSchema);
