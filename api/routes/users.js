const JWT = require('jsonwebtoken');
const Joi = require('joi');
const Boom = require('@hapi/boom');
const { cryptoUtils, Signature } = require('@hiveio/dhive');
const { differenceInMinutes } = require('date-fns');
const { User } = require('../../common/models');
const { getClient } = require('../../common/chain');
const config = require('../../common/config');

const hiveClient = getClient();

module.exports = [
  {
    method: 'GET',
    path: '/users/login',
    options: {
      validate: {
        query: Joi.object({
          username: Joi.string().required().min(3).max(16),
          ts: Joi.number().required(),
          sig: Joi.string().required(),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request, h) => {
      let response = Boom.unauthorized('Invalid username or signature');

      try {
        const { username, ts, sig } = request.query;

        if (process.env.NODE_ENV === 'production') {
          const timeDifference = differenceInMinutes(Date.now(), ts);

          if (timeDifference >= 3) return Boom.unauthorized('Provided timestamp is invalid or too old. Please check that your system clock has the correct date and time.');
        }

        const [account] = await hiveClient.database.getAccounts([username]);

        let validSignature = false;

        const publicKey = Signature.fromString(sig)
          .recover(cryptoUtils.sha256(`${username}${ts}`))
          .toString();

        const thresholdPosting = account.posting.weight_threshold;

        for (let i = 0; i < account.posting.key_auths.length; i += 1) {
          const auth = account.posting.key_auths[i];

          if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
            validSignature = true;
            break;
          }
        }

        const thresholdActive = account.active.weight_threshold;

        for (let i = 0; i < account.active.key_auths.length; i += 1) {
          const auth = account.active.key_auths[i];

          if (auth[0] === publicKey && auth[1] >= thresholdActive) {
            validSignature = true;
            break;
          }
        }

        if (validSignature) {
          const user = await User.findOneAndUpdate(
            { username },
            { $setOnInsert: { username } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          ).select('-_id username oracle').lean();

          const admin = config.ADMINS.includes(username);

          const token = JWT.sign({
            sub: username,
            oracle: user.oracle,
            admin,
          }, config.JWT_SECRET, {
            expiresIn: config.ACCESS_TOKEN_EXPIRATION,
          });

          response = {
            ...user, admin, oracle: user.oracle, token,
          };

          return h.response(response);
        }
      } catch (e) {
        console.log(e);
      }

      return response;
    },
  },

  {
    method: 'GET',
    path: '/users/info',
    options: {
      validate: {
        query: Joi.object({
          username: Joi.string().required().min(3).max(16),
        }).options({ stripUnknown: true }),
      },
    },
    handler: async (request) => {
      const { username } = request.query;

      const user = await User.findOne({ username }).select('-_id username oracle reputation banned').lean();

      return user || {};
    },
  },
];
