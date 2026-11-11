/**
 * Provides reusable input-normalization and MongoDB identifier validators.
 */
const mongoose = require('mongoose');

const isValidObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) &&
  String(new mongoose.Types.ObjectId(value)) === value.toLowerCase();

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeWhitespace = (value = '') => String(value).trim().replace(/\s+/g, ' ');

module.exports = { isValidObjectId, escapeRegex, normalizeWhitespace };
