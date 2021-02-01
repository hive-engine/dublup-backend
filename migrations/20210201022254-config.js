const { CREATION_FEE, SHARE_PRICE } = require('../common/config');

module.exports = {
  async up(db) {
    await db.collection('config').insertOne({
      creation_fee: CREATION_FEE,
      share_price: SHARE_PRICE,
    });
  },

  async down(db) {
    await db.collection('config').deleteOne();
  },
};
