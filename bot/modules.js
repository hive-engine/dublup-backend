/* eslint-disable no-bitwise */
const axios = require('axios').default;
const { differenceInDays } = require('date-fns');
const {
  arrayChunk,
  countOccurances,
  msToMidnight,
  SidechainClient,
  toFixedWithoutRounding,
} = require('./helpers');
const { Market, Notification, User } = require('../common/models');
const { activeKey, getClient } = require('../common/chain');
const config = require('../common/config');
const logger = require('../common/logger');

const hiveClient = getClient();

const insertNotification = async (account, type, data) => {
  try {
    await Notification.create({
      account,
      type,
      data: JSON.stringify(data),
    });
  } catch (e) {
    logger.error(`Failed to insert notification. Message: ${e.message} User: ${account} Type: ${type}`, { data });
  }
};

const sendToDiscord = async (title, marketId, oracles) => {
  const message = {
    username: 'dublup.io',
    avatar_url: 'https://i.imgur.com/ZemODmj.png',
    content: '',
    embeds: [
      {
        title,
        color: 0,
        description: `Selected oracles are: ${oracles.join(', ')}`,
        timestamp: new Date().toISOString(),
        url: `https://dublup.io/market/${marketId}`,
        author: {
          name: 'A new market is available for oracle reporting.',
        },
        image: {},
        thumbnail: {},
        footer: {
          text: 'dublup.io',
          icon_url: 'https://i.imgur.com/ZemODmj.png',
        },
        fields: [],
      },
    ],
  };

  try {
    await axios.post(config.WEBHOOK_URL, message);
  } catch (e) {
    logger.error(`Failed to send Discord notification. Message: ${e.message}`);
  }
};

// Adapted from https://gist.github.com/mumbleskates/75aa2a799eb536f7227d/

const newNode = (value, weight, totalWeight) => ({
  value,
  weight,
  totalWeight,
});

const rwsHeap = (items) => {
  // Leave h[0] vacant
  const h = [undefined];
  let weight;

  Object.keys(items).forEach((value) => {
    weight = items[value];
    h.push(newNode(value, weight, weight));
  });

  // Total up the total weights (add h[i]'s total to the parent)
  for (let i = h.length - 1; i > 1; i -= 1) {
    h[i >> 1].totalWeight += h[i].totalWeight;
  }
  return h;
};

const rwsHeapPopSpecific = (h, gas) => {
  let i = 1;
  // Start driving at the root
  // While we have enough gas to go past node i
  while (gas >= h[i].weight) {
    gas -= h[i].weight;
    i <<= 1;
    // Move to the first child
    // If we have enough gas, drive past first child and descendents
    // And to the next child
    if (gas >= h[i].totalWeight) {
      gas -= h[i].totalWeight;
      i += 1;
    }
  }
  // h[1] is the selected node
  const w = h[i].weight;
  const v = h[i].value;
  // Make sure h[i] is not chosen again
  h[i].weight = 0;
  // And clean up the total weights to re-distribute
  while (i !== 0) {
    h[i].totalWeight -= w;
    i >>= 1;
  }
  // Return the selected element
  return v;
};

const rwsHeapPop = (h) => rwsHeapPopSpecific(h, h[1].totalWeight * Math.random());

const randomWeightedSelection = (items, n) => {
  const h = rwsHeap(items);
  const sel = [];
  const totalItems = Object.keys(items).length;
  for (let i = 0; i < n && i < totalItems; i += 1) {
    sel.push(rwsHeapPop(h));
  }
  return sel;
};

const selectRandomOracles = async () => {
  const oracleUsers = await User.find({
    'oracle.registered': true,
    'oracle.active': true,
    'oracle.consecutive_misses': { $lt: 3 },
    banned: false,
    weight: { $gt: 0 },
    reputation: { $gte: 0 },
  });

  const oracleWeights = oracleUsers.reduce((acc, cur) => {
    acc[cur.username] = cur.weight;

    return acc;
  }, {});

  return randomWeightedSelection(oracleWeights, config.NUMBER_OF_ORACLES);
};

const updateMarketsStatus = async () => {
  try {
    const markets = await Market.find({ $and: [{ status: { $gte: 0 } }, { status: { $lt: 5 } }] });

    for (let i = 0; i < markets.length; i += 1) {
      const market = markets[i];

      if (market.status === 1 && Date.now() >= new Date(market.closes_at).getTime()) {
        market.status = 2; // market closed

        await insertNotification(market.creator, 'market-close', { market: market._id });
      } else if (
        (market.status === 0 || market.status === 2)
        && Date.now() >= new Date(market.expires_at).getTime()) {
        market.oracles = await selectRandomOracles();
        market.status = 3; // market reporting

        const notifications = [];

        market.oracles.forEach((o) => notifications.push(insertNotification(o, 'oracle', { market: market._id })));

        await Promise.all(notifications);

        await sendToDiscord(market.question, market._id, market.oracles);
      } else if (market.status === 3
        && market.reported_outcomes
        && Object.keys(market.reported_outcomes).length >= config.ORACLE_REQUIRED
        && differenceInDays(new Date(), new Date(market.expires_at)) >= config.REPORTING_DURATION) {
        market.status = 4; // market reported
      }

      await market.save();
    }
  } catch (e) {
    console.log(e);
  }

  setTimeout(updateMarketsStatus, 1 * 60 * 1000);
};

const fetchNFTInstances = async (marketId) => {
  let instances = [];
  let newData = 0;
  let offset = 0;

  do {
    const data = await SidechainClient.getNFTInstances(config.NFT_SYMBOL, { 'properties.market': marketId }, offset);
    newData = data.length;

    if (data.length > 0) {
      instances.push(...data);
    }
    offset += 1000;
  } while (newData > 0);

  instances = instances.map((c) => {
    const forSale = !!(c.account === 'nftmarket' && c.ownedBy === 'c');

    return {
      nft_id: c._id,
      account: forSale ? c.previousAccount : c.account,
      market: c.properties.market,
      outcome: c.properties.outcome,
    };
  });

  return instances;
};

const distributeOracleRewards = async (reportedOutcomes, payable, marketId, winningOutcome) => {
  const oracles = Object.entries(reportedOutcomes)
    .filter((o) => o[1] === winningOutcome).map((o) => o[0]);

  const rewardPerOracle = toFixedWithoutRounding(payable / oracles.length, 3);

  if (rewardPerOracle >= 0.001) {
    const transferOps = oracles.reduce((acc, cur) => {
      acc.push({
        contractName: 'tokens',
        contractAction: 'transfer',
        contractPayload: {
          symbol: config.CURRENCY,
          to: cur,
          quantity: rewardPerOracle.toString(),
          memo: JSON.stringify({
            type: 'oracle-reward',
            market: marketId,
          }),
        },
      });

      return acc;
    }, []);

    try {
      await hiveClient.broadcast.json({
        required_posting_auths: [],
        required_auths: [config.ACCOUNT],
        id: config.SIDECHAIN_ID,
        json: JSON.stringify(transferOps),
      }, activeKey);

      logger.info(`Distributed Oracle rewards for market id: ${marketId}`, transferOps);
    } catch (e) {
      logger.error(`Failed to distibute Oracle rewards for market id: ${marketId}`, { oracles, reward: rewardPerOracle });
    }
  }
};

const distributeParticipantRewards = async (
  participants,
  payablePerShare,
  marketId,
  winingOutcome,
  totalWinningShares,
  totalShares,
) => {
  const transferOps = Object.keys(participants).reduce((acc, cur) => {
    acc.push({
      contractName: 'tokens',
      contractAction: 'transfer',
      contractPayload: {
        symbol: config.CURRENCY,
        to: cur,
        quantity: toFixedWithoutRounding(participants[cur] * payablePerShare, 3).toString(),
        memo: JSON.stringify({
          type: 'reward',
          market: marketId,
          outcome: winingOutcome,
          shares: participants[cur],
          total_winning_shares: totalWinningShares,
          total_shares: totalShares,
          reward_per_share: payablePerShare,
        }),
      },
    });

    return acc;
  }, []);

  const transferChunks = arrayChunk(transferOps);

  for (let chunk = 0; chunk < transferChunks.length; chunk += 1) {
    try {
      await hiveClient.broadcast.json({
        required_posting_auths: [],
        required_auths: [config.ACCOUNT],
        id: config.SIDECHAIN_ID,
        json: JSON.stringify(transferChunks[chunk]),
      }, activeKey);

      logger.info(`Distributed participation rewards for market id: ${marketId}. Chunk: ${chunk}`);
    } catch (e) {
      logger.error(`Failed to distibute participation rewards for market id: ${marketId}. Chunk: ${chunk}`, transferChunks[chunk]);
    }
  }
};

const distributeCreatorReward = async (creator, payable, marketId) => {
  const json = {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: {
      symbol: config.CURRENCY,
      to: creator,
      quantity: toFixedWithoutRounding(payable, 3).toString(),
      memo: JSON.stringify({
        type: 'creator-reward',
        market: marketId,
      }),
    },
  };

  try {
    await hiveClient.broadcast.json({
      required_posting_auths: [],
      required_auths: [config.ACCOUNT],
      id: config.SIDECHAIN_ID,
      json: JSON.stringify(json),
    }, activeKey);

    logger.info(`Distributed creator reward for market id: ${marketId}.`);
  } catch (e) {
    logger.error(`Failed to distibute creator reward for market id: ${marketId}`, json);
  }
};

const updateOracleReputation = async (market, winningOutcome) => {
  try {
    const submittedOutcomes = new Map(Object.entries(market.reported_outcomes));

    const updateOps = market.oracles.reduce((acc, cur) => {
      const outcome = submittedOutcomes.get(cur);

      let updateQuery = {};

      if (outcome) {
        updateQuery.$inc = {
          reputation: (outcome === winningOutcome)
            ? config.CORRECT_REPORTING_REP_REWARD
            : config.INCORRECT_REPORTING_REP_REWARD,
        };
      } else {
        updateQuery = [{
          $set: {
            'oracle.consecutive_misses': { $add: ['$oracle.consecutive_misses', 1] },
            'oracle.active': {
              $cond: [
                { $eq: ['$oracle.active', true] },
                { $not: [{ $gte: ['$oracle.consecutive_misses', config.MAX_CONSECUTIVE_MISSES - 1] }] },
                '$oracle.active',
              ],
            },
          },
        }];
      }

      acc.push({
        updateOne: {
          filter: { username: cur },
          update: updateQuery,
        },
      });

      return acc;
    }, []);

    await User.bulkWrite(updateOps);

    logger.info('Updated oracle reputation.', submittedOutcomes);
  } catch (e) {
    logger.error(`Failed to update oracle reputation. Message: ${e.message}`);
  }
};

const settleReportedMarkets = async () => {
  try {
    const markets = await Market.find({ status: 4 });

    for (let i = 0; i < markets.length; i += 1) {
      const market = markets[i];

      if (market.reported_outcomes
        && Object.values(market.reported_outcomes).length >= config.ORACLE_REQUIRED) {
        let outcomes = countOccurances(Object.values(market.reported_outcomes));

        const sortedOutcomes = Object.entries(outcomes).sort((a, b) => b[1] - a[1]);

        if (sortedOutcomes.filter((v, idx, a) => a[0][1] === v[1]).length > 1) {
          logger.info(`There is a tie. Market: ${market._id}`);

          const oracles = Object.keys(market.reported_outcomes);
          const oracleStake = await User.find({ username: { $in: oracles } }, '-_id username stake');

          const outcomeWithStakes = sortedOutcomes.reduce((acc, cur) => {
            const [outcome] = cur;

            const voters = oracles.filter((o) => market.reported_outcomes[o] === outcome);
            const stakes = oracleStake.filter((o) => voters.includes(o.username))
              .reduce((a, c) => a + c.stake, 0);

            acc.push([outcome, stakes]);

            return acc;
          }, []);

          outcomes = Object.fromEntries(outcomeWithStakes);
        }

        const winningOutcome = Object.keys(outcomes)
          .reduce((a, b) => (outcomes[a] > outcomes[b] ? a : b));

        const shares = await fetchNFTInstances(market._id);

        const totalLiquidity = shares.length * market.share_price.amount;

        if (totalLiquidity > 0) {
          if (winningOutcome === 'Invalid') {
            const winningSharesGroupedByUsers = countOccurances(shares.map((n) => n.account));
            const totalWinningShares = Object.values(winningSharesGroupedByUsers)
              .reduce((acc, cur) => acc + cur, 0);

            const rewardPerShare = toFixedWithoutRounding(totalLiquidity / totalWinningShares, 3);

            await distributeParticipantRewards(
              winningSharesGroupedByUsers,
              rewardPerShare,
              market._id,
              winningOutcome,
              totalWinningShares,
            );
          } else {
            const winningShares = shares.filter((s) => s.outcome === winningOutcome);

            const winningSharesGroupedByUsers = countOccurances(
              winningShares.map((n) => n.account),
            );

            const totalWinningShares = Object.values(winningSharesGroupedByUsers)
              .reduce((acc, cur) => acc + cur, 0);

            const creatorShare = totalLiquidity * config.MARKET_CREATOR_SHARE;
            const oraclesShare = totalLiquidity * config.ORACLES_SHARE;
            const participantsShare = totalLiquidity - (creatorShare + oraclesShare);

            const rewardPerShare = toFixedWithoutRounding(
              participantsShare / totalWinningShares,
              3,
            );

            await distributeParticipantRewards(
              winningSharesGroupedByUsers,
              rewardPerShare,
              market._id,
              winningOutcome,
              totalWinningShares,
              shares.length,
            );

            await distributeOracleRewards(
              market.reported_outcomes,
              oraclesShare,
              market._id,
              winningOutcome,
            );

            await distributeCreatorReward(market.creator, creatorShare, market._id);
          }
        }

        market.outcome = winningOutcome;
        market.status = 5;

        await market.save();

        await updateOracleReputation(market, winningOutcome);
      }
    }
  } catch (e) {
    logger.error(`Failed to settle markets. Message: ${e.message}`);
  }

  setTimeout(settleReportedMarkets, 5 * 60 * 1000);
};

const updateOracleStakes = async () => {
  const timeout = msToMidnight();

  try {
    let oracles = await User.find({ 'oracle.registered': true }).lean();

    oracles = oracles.map((o) => o.username);

    let balances = await SidechainClient.getBalances({
      account: { $in: oracles },
      symbol: config.CURRENCY,
    });

    balances = balances.map((b) => ({
      account: b.account,
      stake: Number(b.stake),
    }));

    const totalStake = balances.reduce((acc, cur) => acc + cur.stake, 0);

    const updateOps = balances.reduce((acc, cur) => {
      acc.push({
        updateOne: {
          filter: { username: cur.account },
          update: {
            stake: cur.stake,
            'oracle.registered': (cur.stake >= config.ORACLE_STAKE_REQUIREMENT),
            weight: cur.stake / totalStake,
          },
        },
      });

      return acc;
    }, []);

    await User.bulkWrite(updateOps);
  } catch (e) {
    logger.error(`Failed to update oracle stakes and status. Message: ${e.message}`);
  }

  setTimeout(updateOracleStakes, timeout);
};

module.exports = {
  insertNotification,
  settleReportedMarkets,
  updateMarketsStatus,
  updateOracleStakes,
};
