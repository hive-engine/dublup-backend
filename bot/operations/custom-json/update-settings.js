const config = require('../../../common/config');
const logger = require('../../../common/logger');
const { Config } = require('../../../common/models');
const { broadcastToAll, broadcastToUser } = require('../../../common/websocket');

module.exports = async (client, data) => {
  const username = (data.required_auths.length > 0) ? data.required_auths[0] : '';

  if (config.ADMINS.includes(username) && (data.json && data.json.payload)) {
    try {
      const { creation_fee: creationFee, share_price: sharePrice } = data.json.payload;

      const update = {};

      if (creationFee && typeof creationFee === 'number') update.creation_fee = Number(creationFee);
      if (sharePrice && typeof sharePrice === 'number') update.share_price = Number(sharePrice);

      if (Object.keys(update).length > 0) {
        await Config.updateOne({}, { $set: update });
      }

      broadcastToAll('update-settings', {});
      broadcastToUser(username, 'settings-updated', JSON.stringify({ success: true }));
    } catch (e) {
      broadcastToUser(username, 'settings-updated', JSON.stringify({ success: false }));
      logger.error(`Failed to update config. User: ${username} TX: ${data.trx_id} Message: ${e.message}`, data);
    }
  }
};
