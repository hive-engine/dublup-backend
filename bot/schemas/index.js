const Joi = require('joi');
const {
  addDays, addHours, addMonths, lastDayOfMonth,
} = require('date-fns');
const questionCategories = require('../../data/categories.json');

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const common = {
  category: Joi.string().valid(...Object.keys(questionCategories)).required(),
  sub_category: Joi.alternatives().conditional('category', {
    switch: Object.keys(questionCategories).reduce((acc, cur) => {
      acc.push({
        is: cur, then: Joi.string().valid(...Object.keys(questionCategories[cur].sub_category)),
      });

      return acc;
    }, []),
  }).required(),
  type: Joi.string().valid('binary', 'categorical').required(),
  template: Joi.string().required(),
};

module.exports = {
  custom: Joi.object().keys({
    ...common,
    question: Joi.string().required(),
    rules: Joi.array().items(Joi.string()).min(1).required(),
    outcomes: Joi.array().items(Joi.string()).unique().min(2)
      .when('type', {
        is: 'categorical',
        then: Joi.required(),
      }),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }),

  'trading-crypto-binary-1': Joi.object().keys({
    ...common,
    pair: Joi.string().valid('BTC-USD', 'BTC-EUR', 'BTC-USDT', 'ETH-USD', 'ETH-EUR', 'ETH-USDT', 'HIVE-USD', 'HIVE-USDT').required(),
    price: Joi.number().min(0.001).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addDays(new Date(v), 1) })).required().messages({ 'any.only': '"expiryDate" must be 1 day after the "startDate"' }),
    source: Joi.alternatives().conditional('pair', {
      switch: [
        { is: 'HIVE-USD', then: Joi.string().valid('HIVEUSD (crypto - Bittrex)') },
        { is: 'HIVE-USDT', then: Joi.string().valid('HIVEUSDT (crypto - Binance)', 'HIVEUSDT (crypto - Bittrex)') },

        { is: 'BTC-USD', then: Joi.string().valid('BTCUSD (crypto - Bitfinex)', 'BTCUSD (crypto - Bittrex)', 'BTCUSD (crypto - Coinbase)') },
        { is: 'BTC-EUR', then: Joi.string().valid('BTCEUR (crypto - Bitfinex)', 'BTCEUR (crypto - Coinbase)') },
        { is: 'BTC-USDT', then: Joi.string().valid('BTCUSDT (crypto - Binance)', 'BTCUSDT (crypto - Bittrex)') },

        { is: 'ETH-USD', then: Joi.string().valid('ETHUSD (crypto - Bitfinex)', 'ETHUSD (crypto - Bittrex)', 'ETHUSD (crypto - Coinbase)') },
        { is: 'ETH-EUR', then: Joi.string().valid('ETHEUR (crypto - Bitfinex)', 'ETHEUR (crypto - Coinbase)') },
        { is: 'ETH-USDT', then: Joi.string().valid('ETHUSDT (crypto - Binance)', 'ETHUSDT (crypto - Bittrex)') },
      ],
    }).required(),
  }),

  'trading-crypto-binary-2': Joi.object().keys({
    ...common,
    pair: Joi.string().valid('BTC-USD', 'BTC-EUR', 'BTC-USDT', 'ETH-USD', 'ETH-EUR', 'ETH-USDT', 'HIVE-USD', 'HIVE-USDT').required(),
    price: Joi.number().min(0.001).required(),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('endDate', { adjust: (v) => addDays(new Date(v), 1) })).required().messages({ 'any.only': '"expiryDate" must be 1 day after the "endDate"' }),
    source: Joi.alternatives().conditional('pair', {
      switch: [
        { is: 'HIVE-USD', then: Joi.string().valid('HIVEUSD (crypto - Bittrex)') },
        { is: 'HIVE-USDT', then: Joi.string().valid('HIVEUSDT (crypto - Binance)', 'HIVEUSDT (crypto - Bittrex)') },

        { is: 'BTC-USD', then: Joi.string().valid('BTCUSD (crypto - Bitfinex)', 'BTCUSD (crypto - Bittrex)', 'BTCUSD (crypto - Coinbase)') },
        { is: 'BTC-EUR', then: Joi.string().valid('BTCEUR (crypto - Bitfinex)', 'BTCEUR (crypto - Coinbase)') },
        { is: 'BTC-USDT', then: Joi.string().valid('BTCUSDT (crypto - Binance)', 'BTCUSDT (crypto - Bittrex)') },

        { is: 'ETH-USD', then: Joi.string().valid('ETHUSD (crypto - Bitfinex)', 'ETHUSD (crypto - Bittrex)', 'ETHUSD (crypto - Coinbase)') },
        { is: 'ETH-EUR', then: Joi.string().valid('ETHEUR (crypto - Bitfinex)', 'ETHEUR (crypto - Coinbase)') },
        { is: 'ETH-USDT', then: Joi.string().valid('ETHUSDT (crypto - Binance)', 'ETHUSDT (crypto - Bittrex)') },
      ],
    }).required(),
  }),

  'trading-stocks-binary-1': Joi.object().keys({
    ...common,
    pair: Joi.string().valid('NASDAQ-GOOG', 'NASDAQ-AAPL', 'NASDAQ-TSLA').required(),
    price: Joi.number().min(0.001).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addDays(new Date(v), 1) })).required().messages({ 'any.only': '"expiryDate" must be 1 day after the "startDate"' }),
    source: Joi.alternatives().conditional('pair', {
      switch: [
        { is: 'NASDAQ-GOOG', then: Joi.string().valid('GOOG (stock - NASDAQ)') },
        { is: 'NASDAQ-AAPL', then: Joi.string().valid('AAPL (stock - NASDAQ)') },
        { is: 'NASDAQ-TSLA', then: Joi.string().valid('TSLA (stock - NASDAQ)') },
      ],
    }).required(),
  }),

  'trading-stocks-binary-2': Joi.object().keys({
    ...common,
    pair: Joi.string().valid('NASDAQ-GOOG', 'NASDAQ-AAPL', 'NASDAQ-TSLA').required(),
    price: Joi.number().min(0.001).required(),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('endDate', { adjust: (v) => addDays(new Date(v), 1) })).required().messages({ 'any.only': '"expiryDate" must be 1 day after the "endDate"' }),
    source: Joi.alternatives().conditional('pair', {
      switch: [
        { is: 'NASDAQ-GOOG', then: Joi.string().valid('GOOG (stock - NASDAQ)') },
        { is: 'NASDAQ-AAPL', then: Joi.string().valid('AAPL (stock - NASDAQ)') },
        { is: 'NASDAQ-TSLA', then: Joi.string().valid('TSLA (stock - NASDAQ)') },
      ],
    }).required(),
  }),

  'trading-commodities-binary-1': Joi.object().keys({
    ...common,
    pair: Joi.string().valid('XAU-USD', 'XAG-USD').required(),
    price: Joi.number().min(0.001).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addDays(new Date(v), 1) })).required().messages({ 'any.only': '"expiryDate" must be 1 day after the "startDate"' }),
    source: Joi.alternatives().conditional('pair', {
      switch: [
        { is: 'XAU-USD', then: Joi.string().valid('XAUUSD (cfd - OANDA)', 'XAUUSD (cfd - ICE)', 'XAUUSD (cfd - FOREX.com)') },
        { is: 'XAG-USD', then: Joi.string().valid('XAGUSD (cfd - OANDA)', 'XAGUSD (cfd - ICE)', 'XAGUSD (cfd - FOREX.com)') },
      ],
    }).required(),
  }),

  'trading-commodities-binary-2': Joi.object().keys({
    ...common,
    pair: Joi.string().valid('XAU-USD', 'XAG-USD').required(),
    price: Joi.number().min(0.001).required(),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('endDate', { adjust: (v) => addDays(new Date(v), 1) })).required().messages({ 'any.only': '"expiryDate" must be 1 day after the "endDate"' }),
    source: Joi.alternatives().conditional('pair', {
      switch: [
        { is: 'XAU-USD', then: Joi.string().valid('XAUUSD (cfd - OANDA)', 'XAUUSD (cfd - ICE)', 'XAUUSD (cfd - FOREX.com)') },
        { is: 'XAG-USD', then: Joi.string().valid('XAGUSD (cfd - OANDA)', 'XAGUSD (cfd - ICE)', 'XAGUSD (cfd - FOREX.com)') },
      ],
    }).required(),
  }),

  'sports-americanfootball-binary-1': Joi.object().keys({
    ...common,
    teamA: Joi.string().trim().required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).required(),
    week: Joi.string().trim().required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 8) })).required().messages({ 'any.only': '"expiryDate" must be 8 hours after the "startDate"' }),
  }),

  'sports-americanfootball-binary-2': Joi.object().keys({
    ...common,
    teamA: Joi.string().trim().required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).required(),
    week: Joi.string().trim().required(),
    points: Joi.number().min(1).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 8) })).required().messages({ 'any.only': '"expiryDate" must be 8 hours after the "startDate"' }),
  }),

  'sports-americanfootball-binary-3': Joi.object().keys({
    ...common,
    teamA: Joi.string().trim().required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).required(),
    week: Joi.string().trim().required(),
    points: Joi.number().min(1).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 8) })).required().messages({ 'any.only': '"expiryDate" must be 8 hours after the "startDate"' }),
  }),

  'sports-americanfootball-binary-4': Joi.object().keys({
    ...common,
    team: Joi.string().trim().required(),
    wins: Joi.number().min(1).required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }).custom((value) => {
    const isValid = new Date(value.expiryDate).getFullYear() >= value.year;

    if (!isValid) {
      throw new Error('"expiryDate" must be greater than or equal to the "year"');
    }

    return value;
  }).messages({ 'any.custom': '"expiryDate" must be greater than or equal to the "year"' }),

  'sports-americanfootball-binary-5': Joi.object().keys({
    ...common,
    team: Joi.string().trim().required(),
    numeral: Joi.string().trim().required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }),

  'sports-americanfootball-binary-6': Joi.object().keys({
    ...common,
    player: Joi.string().trim().required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    award: Joi.string().trim().valid(
      'AP Most Valuable Player',
      'Defensive Rookie of The Year',
      'Defensive player of The Year',
      'Offensive Player of The Year',
      'Offensive Rookie of The Year',
    ).required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }).custom((value) => {
    const isValid = new Date(value.expiryDate).getFullYear() >= value.year;

    if (!isValid) {
      throw new Error('"expiryDate" must be greater than or equal to the "year"');
    }

    return value;
  }).messages({ 'any.custom': '"expiryDate" must be greater than or equal to the "year"' }),

  'sports-americanfootball-categorical-1': Joi.object().keys({
    ...common,
    teamA: Joi.string().trim().valid(Joi.in('outcomes')).required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).valid(Joi.in('outcomes'))
      .required(),
    week: Joi.string().trim().required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 8) })).required().messages({ 'any.only': '"expiryDate" must be 8 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-americanfootball-categorical-2': Joi.object().keys({
    ...common,
    teamA: Joi.string().trim().required(),
    teamB: Joi.string().trim().required(),
    week: Joi.string().trim().required(),
    points: Joi.number().min(0).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 8) })).required().messages({ 'any.only': '"expiryDate" must be 8 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-baseball-binary-1': Joi.object().keys({
    ...common,
    team: Joi.string().trim().required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().trim().valid(
      'American League Championship Series',
      'National League Championship Series',
      'World Series',
    ).required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }).custom((value) => {
    const isValid = new Date(value.expiryDate).getFullYear() >= value.year;

    if (!isValid) {
      throw new Error('"expiryDate" must be greater than or equal to the "year"');
    }

    return value;
  }).messages({ 'any.custom': '"expiryDate" must be greater than or equal to the "year"' }),

  'sports-mma-categorical-1': Joi.object().keys({
    ...common,
    fighterA: Joi.string().trim().valid(Joi.in('outcomes')).required(),
    fighterB: Joi.string().trim().disallow(Joi.ref('fighterA')).valid(Joi.in('outcomes'))
      .required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 9) })).required().messages({ 'any.only': '"expiryDate" must be 9 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Draw/No Contest').required()).required(),
  }),

  'sports-mma-categorical-2': Joi.object().keys({
    ...common,
    fighterA: Joi.string().trim().required(),
    fighterB: Joi.string().trim().disallow(Joi.ref('fighterA')).required(),
    rounds: Joi.number().valid(1.5, 2.5, 3.5, 4.5).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 9) })).required().messages({ 'any.only': '"expiryDate" must be 9 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().regex(/^(Over|Under) [1-4].5$/).required(), Joi.string().regex(/^(Over|Under) [1-4].5$/).required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-mma-categorical-3': Joi.object().keys({
    ...common,
    fighterA: Joi.string().trim().required(),
    fighterB: Joi.string().trim().disallow(Joi.ref('fighterA')).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 9) })).required().messages({ 'any.only': '"expiryDate" must be 9 hours after the "startDate"' }),
    outcomes: Joi.array().items(
      Joi.string().regex(/by (KO\/TKO|Submission|Points)$/).required(),
      Joi.string().regex(/by (KO\/TKO|Submission|Points)$/).required(),
      Joi.string().regex(/by (KO\/TKO|Submission|Points)$/).required(),
      Joi.string().regex(/by (KO\/TKO|Submission|Points)$/).required(),
      Joi.string().regex(/by (KO\/TKO|Submission|Points)$/).required(),
      Joi.string().regex(/by (KO\/TKO|Submission|Points)$/).required(),
      Joi.string().valid('Draw/No Contest').required(),
    ).unique().required(),
  }),

  'sports-mma-categorical-4': Joi.object().keys({
    ...common,
    fighterA: Joi.string().trim().required(),
    fighterB: Joi.string().trim().disallow(Joi.ref('fighterA')).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 9) })).required().messages({ 'any.only': '"expiryDate" must be 9 hours after the "startDate"' }),
    outcomes: Joi.array().items(
      Joi.string().valid('KO/TKO').required(),
      Joi.string().valid('Submission').required(),
      Joi.string().valid('Points').required(),
      Joi.string().valid('Draw/No Contest').required(),
    ).unique().required(),
  }),

  'sports-mma-categorical-5': Joi.object().keys({
    ...common,
    fighterA: Joi.string().trim().required(),
    fighterB: Joi.string().trim().disallow(Joi.ref('fighterA')).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 9) })).required().messages({ 'any.only': '"expiryDate" must be 9 hours after the "startDate"' }),
    outcomes: Joi.array().items(
      Joi.string().regex(/^(Round [1-5]|Goes the distance)$/).required(),
      Joi.string().regex(/^(Round [1-5]|Goes the distance)$/).required(),
      Joi.string().regex(/^(Round [1-5]|Goes the distance)$/).required(),
      Joi.string().regex(/^(Round [1-5]|Goes the distance)$/).required(),
      Joi.string().regex(/^(Round [1-5]|Goes the distance)$/).required(),
      Joi.string().regex(/^(Round [1-5]|Goes the distance)$/).required(),
      Joi.string().valid('Draw/No Contest').required(),
    ).unique().required(),
  }),

  'sports-basketball-binary-1': Joi.object().keys({
    ...common,
    tournament: Joi.string().valid('NBA', 'WNBA', 'NCAA Men\'s BB', 'NCAA Women\'s BB').required(),
    teamA: Joi.string().trim().required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 6) })).required().messages({ 'any.only': '"expiryDate" must be 6 hours after the "startDate"' }),
  }),

  'sports-basketball-categorical-1': Joi.object().keys({
    ...common,
    tournament: Joi.string().valid('NBA', 'WNBA', 'NCAA Men\'s BB', 'NCAA Women\'s BB').required(),
    teamA: Joi.string().trim().valid(Joi.in('outcomes')).required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).valid(Joi.in('outcomes'))
      .required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 6) })).required().messages({ 'any.only': '"expiryDate" must be 6 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-boxing-categorical-1': Joi.object().keys({
    ...common,
    fighterA: Joi.string().trim().valid(Joi.in('outcomes')).required(),
    fighterB: Joi.string().trim().disallow(Joi.ref('fighterA')).valid(Joi.in('outcomes'))
      .required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 9) })).required().messages({ 'any.only': '"expiryDate" must be 9 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Draw/No Contest').required()).unique().required(),
  }),

  'sports-carracing-categorical-1': Joi.object().keys({
    ...common,
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 24) })).required().messages({ 'any.only': '"expiryDate" must be 24 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Other').required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-footballsoccer-categorical-1': Joi.object().keys({
    ...common,
    eventType: Joi.string().valid('Men\'s', 'Women\'s').required(),
    event: Joi.string().required(),
    teamA: Joi.string().trim().valid(Joi.in('outcomes')).required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).valid(Joi.in('outcomes'))
      .required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 6) })).required().messages({ 'any.only': '"expiryDate" must be 6 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Draw').required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-golf-binary-1': Joi.object().keys({
    ...common,
    tour: Joi.string().valid('PGA', 'LPGA', 'Euro Tour').required(),
    player: Joi.string().min(3).required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }),

  'sports-golf-categorical-1': Joi.object().keys({
    ...common,
    tour: Joi.string().valid('PGA', 'LPGA', 'Euro Tour').required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Other').required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-hockey-binary-1': Joi.object().keys({
    ...common,
    teamA: Joi.string().trim().required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 6) })).required().messages({ 'any.only': '"expiryDate" must be 6 hours after the "startDate"' }),
  }),

  'sports-hockey-categorical-1': Joi.object().keys({
    ...common,
    teamA: Joi.string().trim().valid(Joi.in('outcomes')).required(),
    teamB: Joi.string().trim().disallow(Joi.ref('teamA')).valid(Joi.in('outcomes'))
      .required(),
    startDate: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('startDate')).required(),
    expiryDate: Joi.date().valid(Joi.ref('startDate', { adjust: (v) => addHours(new Date(v), 6) })).required().messages({ 'any.only': '"expiryDate" must be 6 hours after the "startDate"' }),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-horseracing-binary-1': Joi.object().keys({
    ...common,
    horse: Joi.string().min(3).required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }),

  'sports-horseracing-categorical-1': Joi.object().keys({
    ...common,
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Other').required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'sports-olympics-binary-1': Joi.object().keys({
    ...common,
    sport: Joi.string().required(),
    season: Joi.string().valid('Summer', 'Winter').required(),
    year: Joi.alternatives().conditional('season', [
      { is: 'Summer', then: Joi.number().valid(2021, 2024, 2028) },
      { is: 'Winter', then: Joi.number().valid(2022, 2026, 2030) },
    ]).required(),
    event: Joi.string().required(),
    country: Joi.string().required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }),

  'sports-olympics-binary-2': Joi.object().keys({
    ...common,
    sport: Joi.string().required(),
    season: Joi.string().valid('Summer', 'Winter').required(),
    year: Joi.alternatives().conditional('season', [
      { is: 'Summer', then: Joi.number().valid(2021, 2024, 2028) },
      { is: 'Winter', then: Joi.number().valid(2022, 2026, 2030) },
    ]).required(),
    medalType: Joi.string().valid('Bronze', 'Silver', 'Gold', 'Total').required(),
    countryA: Joi.string().required(),
    countryB: Joi.string().disallow(Joi.ref('countryA')).required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }),

  'sports-olympics-categorical-1': Joi.object().keys({
    ...common,
    season: Joi.string().valid('Summer', 'Winter').required(),
    year: Joi.alternatives().conditional('season', [
      { is: 'Summer', then: Joi.number().valid(2021, 2024, 2028) },
      { is: 'Winter', then: Joi.number().valid(2022, 2026, 2030) },
    ]).required(),
    medalType: Joi.string().valid('Bronze', 'Silver', 'Gold', 'Total').required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Other Country').required()).unique().required(),
  }),

  'sports-tennis-binary-1': Joi.object().keys({
    ...common,
    gameFormat: Joi.string().valid('Singles', 'Doubles').required(),
    teamType: Joi.alternatives().conditional('gameFormat', [
      { is: 'Singles', then: Joi.string().valid('Men\'s', 'Women\'s') },
      { is: 'Doubles', then: Joi.string().valid('Men\'s', 'Women\'s', 'Mixed') },
    ]).required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    players: Joi.string().trim().required(),
    event: Joi.string().trim().required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }),

  'sports-tennis-categorical-1': Joi.object().keys({
    ...common,
    gameFormat: Joi.string().valid('Singles', 'Doubles').required(),
    teamType: Joi.alternatives().conditional('gameFormat', [
      { is: 'Singles', then: Joi.string().valid('Men\'s', 'Women\'s') },
      { is: 'Doubles', then: Joi.string().valid('Men\'s', 'Women\'s', 'Mixed') },
    ]).required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().trim().required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Other').required(), Joi.string().valid('No Contest').required()).unique().required(),
  }),

  'economics-statistics-categorical-1': Joi.object().keys({
    ...common,
    month: Joi.string().valid(...months).required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    percentage: Joi.number().min(0.001).required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required())
      .unique().required(),
  }).custom((value, helpers) => {
    if (lastDayOfMonth(new Date(`${value.month} 1, ${value.year}`)).getTime() !== value.closeDate.getTime()) {
      return helpers.error('any.invalid');
    }

    if (addMonths(lastDayOfMonth(new Date(`${value.month} 1, ${value.year}`)), 1).getTime() !== value.expiryDate.getTime()) {
      return helpers.error('any.invalid');
    }

    return value;
  }),

  'entertainment-awards-binary-1': Joi.object().keys({
    ...common,
    person: Joi.string().min(3).required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().required(),
    closeDate: Joi.date().greater('now').required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
  }),

  'entertainment-awards-binary-2': Joi.object().keys({
    ...common,
    person: Joi.string().min(3).required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    award: Joi.string().required(),
    event: Joi.string().required(),
    closeDate: Joi.date().greater('now').required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
  }),

  'entertainment-awards-categorical-1': Joi.object().keys({
    ...common,
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().required(),
    closeDate: Joi.date().greater('now').required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Multiple Hosts').required(), Joi.string().valid('Other').required()).unique().required(),
  }),

  'entertainment-awards-categorical-2': Joi.object().keys({
    ...common,
    award: Joi.string().required(),
    year: Joi.number().valid(
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      new Date().getFullYear() + 2,
    ).required(),
    event: Joi.string().required(),
    closeDate: Joi.date().greater('now').required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Other').required()).unique().required(),
  }),

  'entertainment-socialmedia-binary-1': Joi.object().keys({
    ...common,
    socialmedia: Joi.string().valid('Twitter', 'Instagram').required(),
    username: Joi.string().min(3).required(),
    followers: Joi.number().min(1).required(),
    date: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('date')).required(),
    expiryDate: Joi.date().valid(Joi.ref('date', { adjust: (v) => addDays(new Date(v), 2) })).required().messages({ 'any.only': '"expiryDate" must be 2 days after the "date"' }),
  }),

  'entertainment-tvmovies-binary-1': Joi.object().keys({
    ...common,
    movie: Joi.string().required(),
    sales: Joi.number().required(),
    date: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('date')).required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
  }),

  'medical-general-binary-1': Joi.object().keys({
    ...common,
    amount: Joi.number().min(1).required(),
    amountType: Joi.string().valid('Cases of', 'Deaths from').required(),
    country: Joi.string().required(),
    date: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('date')).required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
  }),

  'politics-uspolitics-binary-1': Joi.object().keys({
    ...common,
    year: Joi.number().valid(2024, 2028, 2032).required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
  }),

  'politics-uspolitics-binary-2': Joi.object().keys({
    ...common,
    candidate: Joi.string().required(),
    office: Joi.string().valid('U.S House of Representatives', 'U.S. President', 'U.S. Senator', 'U.S. Vice-President').required(),
    date: Joi.date().greater('now').required(),
    closeDate: Joi.date().greater('now').valid(Joi.ref('date')).required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
  }),

  'politics-uspolitics-categorical-1': Joi.object().keys({
    ...common,
    year: Joi.number().valid(2024, 2028, 2032).required(),
    closeDate: Joi.date().greater('now').max(Joi.ref('expiryDate')).required(),
    expiryDate: Joi.date().greater('now').required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Other').required()).unique().required(),
  }),

  'politics-world-binary-1': Joi.object().keys({
    ...common,
    person: Joi.string().required(),
    position: Joi.string().valid('Chancellor', 'Chief Executive', 'Crown Prince', 'King', 'President', 'Prime Minister', 'Supreme Leader').required(),
    country: Joi.string().required(),
    date: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('date')).required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
  }),

  'politics-world-categorical-1': Joi.object().keys({
    ...common,
    position: Joi.string().valid('Chancellor', 'Chief Executive', 'Crown Prince', 'King', 'President', 'Prime Minister', 'Supreme Leader').required(),
    country: Joi.string().required(),
    date: Joi.date().greater('now').required(),
    closeDate: Joi.date().valid(Joi.ref('date')).required(),
    expiryDate: Joi.date().min(Joi.ref('closeDate')).required(),
    outcomes: Joi.array().items(Joi.string().required(), Joi.string().required(), Joi.string().valid('Other').required()).unique().required(),
  }),
};
