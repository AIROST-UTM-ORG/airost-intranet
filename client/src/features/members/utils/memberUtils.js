// Utility functions for MemberDirectory features

/**
 * Normalizes position data to an array.
 * @param {string|string[]|null|undefined} position
 * @returns {string[]} array of non‑empty position strings
 */
export const getPositions = (position) => {
  const positions = Array.isArray(position) ? position : [position];
  return positions.filter((value) => typeof value === 'string' && value.trim());
};
