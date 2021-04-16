const config = require('../../../common/config');
const activateOracle = require('./activate-oracle');
const hideMarket = require('./hide-market');
const registerOracle = require('./register-oracle');
const reportOutcome = require('./report-outcome');
const updateSettings = require('./update-settings');

const handlers = {
  'activate-oracle': activateOracle,
  'hide-market': hideMarket,
  'register-oracle': registerOracle,
  'report-outcome': reportOutcome,
  'update-settings': updateSettings,
};

const fallback = () => { };

const runner = (client, data) => {
  if (data.id !== config.APP_ID) return;

  const json = JSON.parse(data.json);

  const handler = handlers[json.action] || fallback;

  handler(client, { ...data, json });
};

module.exports = (client, data) => runner(client, data);
