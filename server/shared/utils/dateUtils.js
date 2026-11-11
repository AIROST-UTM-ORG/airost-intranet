/**
 * Provides reusable date validation and day-boundary helpers.
 */
const isValidDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime());
};

const toISOString = (value) => {
  if (!isValidDate(value)) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
};

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

module.exports = { isValidDate, toISOString, startOfDay, endOfDay };
