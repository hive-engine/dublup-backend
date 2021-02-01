const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    index: true,
    required: true,
    unique: true,
  },
  stake: {
    type: Number,
    default: 0,
  },
  weight: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  oracle: {
    type: Boolean,
    default: false,
  },
  reputation: {
    type: Number,
    default: 10,
  },
  banned: {
    type: Boolean,
    default: false,
  },
  __v: { type: Number, select: false },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = mongoose.model('User', UserSchema);
