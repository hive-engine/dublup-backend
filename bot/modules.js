const { differenceInDays } = require('date-fns');
const {
  arrayChunk,
  arrayShuffle,
  countOccurances,
  msToMidnight,
  SidechainClient,
  toFixedWithoutRounding,
} = require('./helpers');
const { Market, User } = require('../common/models');
const { activeKey, getClient } = require('../common/chain');
const config = require('../common/config');
const logger = require('../common/logger');

const hiveClient = getClient();

const updateMarketsStatus = async () => {
  try {
    const markets = await Market.find({ status: { $lt: 5 }, expires_at: { $lte: new Date() } });

    for (let i = 0; i < markets.length; i += 1) {
      const market = markets[i];

      if (market.status === 1) {
        market.status = 2;
      } else if (market.status === 2
        && market.reported_outcomes && Object.keys(market.reported_outcomes).length > 0
        && differenceInDays(new Date(), new Date(market.expires_at)) >= config.REPORTING_DURATION) {
        market.status = 3;
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

  const shuffled = arrayShuffle(oracles);

  const randomOracles = shuffled.slice(0, config.NUMBER_OF_ORACLES);
  const rewardPerOracle = toFixedWithoutRounding(payable / randomOracles.length, 3);

  if (rewardPerOracle >= 0.001) {
    const transferOps = randomOracles.reduce((acc, cur) => {
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
      logger.error(`Failed to distibute Oracle rewards for market id: ${marketId}`, { oracles: randomOracles, reward: rewardPerOracle });
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

const updateOracleReputation = async (reportedOutcomes, winningOutcome) => {
  try {
    const submittedOutcomes = Object.entries(reportedOutcomes);

    const updateOps = submittedOutcomes.reduce((acc, cur) => {
      acc.push({
        updateOne: {
          filter: { username: cur[0] },
          update: {
            $inc: {
              reputation: (cur[1] === winningOutcome)
                ? config.CORRECT_REPORTING_REP_REWARD
                : config.INCORRECT_REPORTING_REP_REWARD,
            },
          },
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
    const markets = await Market.find({ status: 3 });

    for (let i = 0; i < markets.length; i += 1) {
      const market = markets[i];

      if (market.reported_outcomes && Object.values(market.reported_outcomes).length > 0) {
        const outcomes = countOccurances(Object.values(market.reported_outcomes));

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

        await updateOracleReputation(market.reported_outcomes, winningOutcome);
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
    let oracles = await User.find({ oracle: true }).lean();

    oracles = oracles.map((o) => o.username);

    let balances = await SidechainClient.getBalances({
      account: { $in: oracles },
      symbol: config.CURRENCY,
    });

    balances = balances.map((b) => ({
      account: b.account,
      stake: Number(b.stake),
    }));

    const updateOps = balances.reduce((acc, cur) => {
      acc.push({
        updateOne: {
          filter: { username: cur.account },
          update: {
            stake: cur.stake,
            oracle: (cur.stake >= config.ORACLE_STAKE_REQUIREMENT),
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
  settleReportedMarkets,
  updateMarketsStatus,
  updateOracleStakes,
};
