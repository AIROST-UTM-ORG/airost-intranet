/**
 * Provides reusable input-normalization and MongoDB identifier validators.
 */
const mongoose = require('mongoose');

const isValidObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) &&
  String(new mongoose.Types.ObjectId(value)) === value.toLowerCase();

const escapeRegex = (value = '') =>
  (typeof value === 'string' ? value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

const normalizeWhitespace = (value = '') =>
  (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

const SOCIAL_URL_REGEX = Object.freeze({
  instagram: /^(?:https:\/\/(?:www\.)?instagram\.com\/|@?)[a-zA-Z0-9._-]+\/?$/i,
  linkedin: /^(?:https:\/\/(?:www\.)?linkedin\.com\/in\/|@?)[a-zA-Z0-9._-]+\/?$/i,
  github: /^(?:https:\/\/(?:www\.)?github\.com\/|@?)[a-zA-Z0-9._-]+\/?$/i,
});

module.exports = { isValidObjectId, escapeRegex, normalizeWhitespace, SOCIAL_URL_REGEX };
                                              