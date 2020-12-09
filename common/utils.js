const { monotonicFactory } = require('ulid');

const ulid = monotonicFactory();

const generateUlid = () => ulid();

const sortObject = (object) => Object.fromEntries(Object.entries(object).sort());

const sortObjects = (objects) => objects.map((o) => sortObject(o));

module.exports = {
  generateUlid,
  sortObjects,
};
