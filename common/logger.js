const { createLogger, format, transports } = require('winston');
const fs = require('fs');

const {
  combine, splat, timestamp, printf,
} = format;

const logDir = 'logs';

if (!fs.existsSync(logDir)) {
  // Create the directory if it does not exist
  fs.mkdirSync(logDir);
}

const myFormat = printf(({
  level, message, timestamp: ts, ...metadata
}) => {
  let msg = `${ts} [${level}] : ${message} `;

  if (metadata) {
    msg += JSON.stringify(metadata);
  }

  return msg;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    splat(),
    timestamp(),
    myFormat,
  ),
  transports: [
    new transports.File({ filename: `${logDir}/error.log`, level: 'error', maxsize: 1 * 1024 * 10 }),
    new transports.File({ filename: `${logDir}/combined.log`, maxsize: 1 * 1024 * 10 }),
  ],
  exceptionHandlers: [
    new transports.File({
      filename: `${logDir}/exceptions.log`,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.simple(),
  }));
}

module.exports = logger;
