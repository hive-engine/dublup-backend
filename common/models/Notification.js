/* eslint-disable no-param-reassign */
const mongoose = require('mongoose');
const { addDays } = require('date-fns');

const NotificationSchema = new mongoose.Schema({
  account: {
    type: String,
    index: true,
  },
  type: {
    type: String,
    index: true,
  },
  data: String,
  read: {
    type: Boolean,
    default: false,
  },
  timestamp: { type: Date, default: Date.now },
  expires_at: {
    type: Date,
    default: addDays(Date.now(), 30),
    select: false,
  },
  __v: { type: Number, select: false },
}, {
  timestamps: false,
});

NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

NotificationSchema.set('toObject', {
  virtuals: true,
  transform(doc, ret) { delete ret._id; },
});

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) { delete ret._id; },
});

module.exports = mongoose.model('notification', NotificationSchema);
