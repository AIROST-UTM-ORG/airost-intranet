const AppError = require('../../shared/errors/AppError');
const { BAD_REQUEST, NOT_FOUND } = require('../../shared/constants/httpStatus');
const { isValidObjectId, SOCIAL_URL_REGEX } = require('../../shared/utils/validators');

const invalid = (message, details) => { throw new AppError(BAD_REQUEST, 'VALIDATION_ERROR', message, details); };

const validateGetUsers = (req) => {
  const { search, role, year } = req.query;
  const page = req.query.page === undefined ? undefined : Number(req.query.page);
  const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);
  if (search !== undefined && (typeof search !== 'string' || search.trim().length > 100)) invalid('Invalid search parameter.');
  if (role !== undefined && (typeof role !== 'string' || !role.trim() || role.length > 80)) invalid('Invalid role parameter.');
  if (year !== undefined && (typeof year !== 'string' || !year.trim() || year.length > 40)) invalid('Invalid year parameter.');
  if (page !== undefined && (!Number.isInteger(page) || page < 1)) invalid('Invalid page parameter.');
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) invalid('Invalid limit parameter.');
  return { search, role, year, page, limit };
};

const validateUpdateProfile = (req) => {
  if (!isValidObjectId(req.params.id)) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'No such User');
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Request body must be an object.');
  const editable = ['name', 'photoUrl', 'year', 'course', 'origin', 'description', 'instagramUrl', 'linkedinUrl', 'githubUrl', 'featuredProjectIds'];
  const entries = Object.entries(body);
    if (entries.length === 0) {
    invalid('At least one editable field is required.');
  }
  const unsupportedFields = entries.map(([key]) => key).filter((key) => !editable.includes(key));
  if (unsupportedFields.length) invalid('Payload contains unsupported fields.', { unsupportedFields });
  const updates = Object.fromEntries(entries);
  if (updates.featuredProjectIds !== undefined && (!Array.isArray(updates.featuredProjectIds) || updates.featuredProjectIds.some((id) => !isValidObjectId(String(id))))) invalid('featuredProjectIds must be an array of valid project ids.');
  if (updates.featuredProjectIds) updates.featuredProjectIds = [...new Set(updates.featuredProjectIds.map(String))];
  if (updates.origin !== undefined && (updates.origin === null || typeof updates.origin !== 'object' || Array.isArray(updates.origin) || Object.keys(updates.origin).some((key) => !['state', 'country'].includes(key)) || ['state', 'country'].some((key) => updates.origin[key] !== undefined && (typeof updates.origin[key] !== 'string' || updates.origin[key].length > 100)))) invalid('origin must contain state and country fields.');
  if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim() || updates.name.trim().length > 100)) invalid('Name must be a non-empty string.');
  if (updates.year !== undefined && (typeof updates.year !== 'string' || updates.year.length > 50)) invalid('Year must be a string under 50 characters.');
  if (updates.course !== undefined && (typeof updates.course !== 'string' || updates.course.length > 120)) invalid('Course must be a string under 120 characters.');
  if (updates.description !== undefined && (typeof updates.description !== 'string' || updates.description.length > 1000)) invalid('Description must be a string under 1000 characters.');
  if (updates.photoUrl !== undefined) {
    const value = updates.photoUrl;
    let httpUrl = false;
    try { httpUrl = ['http:', 'https:'].includes(new URL(value).protocol) && value.length <= 2048; } catch { /* malformed URL */ }
    const dataUrl = typeof value === 'string' && value.length <= 2 * 1024 * 1024 && /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+={0,2}$/i.test(value);
    if (typeof value !== 'string' || (value.trim() && !httpUrl && !dataUrl)) invalid('photoUrl must be a valid HTTP/HTTPS URL or supported image data URI.');
    updates.photoUrl = value.trim();
  }
  const hosts = { instagram: ['instagram.com', 'www.instagram.com'], linkedin: ['linkedin.com', 'www.linkedin.com'], github: ['github.com', 'www.github.com'] };
  const canonical = { instagram: 'www.instagram.com', linkedin: 'www.linkedin.com', github: 'github.com' };
  for (const network of Object.keys(hosts)) {
    const field = `${network}Url`;
    if (updates[field] === undefined) continue;
    const input = updates[field];
    if (typeof input !== 'string' || input.length > 300 || (input.trim() && !SOCIAL_URL_REGEX[network].test(input.trim()))) invalid(`${field} must be an HTTPS profile URL for the correct platform or a valid handle.`);
    const trimmed = input.trim();
    if (!trimmed) { updates[field] = ''; continue; }
    if (trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      if (!hosts[network].includes(url.hostname.toLowerCase()) || (url.port && url.port !== '443') || url.username || url.password) invalid(`${field} must be an HTTPS profile URL for the correct platform or a valid handle.`);
      url.hostname = canonical[network];
      updates[field] = url.href;
    } else {
      const handle = trimmed.replace(/^@/, '').replace(/\/$/, '');
      const path = network === 'linkedin' ? `/in/${encodeURIComponent(handle)}/` : `/${encodeURIComponent(handle)}${network === 'instagram' ? '/' : ''}`;
      updates[field] = `https://${canonical[network]}${path}`;
    }
  }
  return { sanitizedData: updates };
};

module.exports = { validateGetUsers, validateUpdateProfile };
