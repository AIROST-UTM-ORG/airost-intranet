const repository = require('./member.repository');
const { formatUser, formatUsers } = require('./member.formatter');
const { PLATFORM_ROLES } = require('../../shared/constants/roles');
const { escapeRegex } = require('../../shared/utils/validators');
const AppError = require('../../shared/errors/AppError');
const { FORBIDDEN, NOT_FOUND } = require('../../shared/constants/httpStatus');

const buildFilter = ({ search, role, year }) => {
  const filter = { isActive: true };
  if (search?.trim()) {
    const term = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: term }, { email: term }, { course: term }, { description: term }];
  }
  if (role !== undefined) 
    filter.positions = role.trim();
  if (year !== undefined) 
    filter.year = year.trim();
  return filter;
};

const getUsers = async ({ search, role, year, page, limit } = {}) => {
  const filter = buildFilter({ search, role, year });
  const currentPage = page ?? 1;
  const pageSize = limit ?? 20;
  const [users, total] = await Promise.all([
    repository.findDirectoryUsers(filter, { skip: (currentPage - 1) * pageSize, limit: pageSize }),
    repository.countDirectoryUsers(filter),
  ]);
  return { data: formatUsers(users), meta: { page: currentPage, limit: pageSize, total } };
};

const isAdmin = (user) => {
  const positions = user?.positions ?? user?.position;
  const roles = Array.isArray(positions) ? positions : [positions];
  return roles.some((role) => typeof role === 'string' && role.trim().toLowerCase() === PLATFORM_ROLES.ADMIN);
};

const updateProfile = async (id, updates, caller) => {
  if (caller?._id?.toString().toLowerCase() !== id.toLowerCase() && !isAdmin(caller)) 
    throw new AppError(FORBIDDEN, 'FORBIDDEN', 'You do not have permission to modify this profile');
  const user = await repository.findByIdAndUpdate(id, updates);
  if (!user) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Not found');
  return formatUser(user);
};

const getMergedUserList = async () => {
  const [users, verifiedUsers] = await Promise.all([
    repository.findAllUsers(),
    repository.findAllVerifiedUsers(),
  ]);

  const verifiedEmails = new Set(
    (verifiedUsers || [])
      .map((v) => (v && v.email ? v.email.toLowerCase().trim() : ''))
      .filter(Boolean)
  );

  const seenEmails = new Set();
  const result = [];

  for (const user of users || []) {
    const rawEmail = user?.email;
    const emailKey = rawEmail ? rawEmail.toLowerCase().trim() : '';

    if (emailKey) {
      if (seenEmails.has(emailKey)) continue;
      seenEmails.add(emailKey);
    }

    const positions = user?.positions || (user?.position ? (Array.isArray(user.position) ? user.position : [user.position]) : []);

    result.push({
      _id: user?._id,
      email: user?.email,
      name: user?.name,
      photo: user?.photoUrl || user?.photo || '',
      position: positions,
      loggedIn: true,
      verified: Boolean(emailKey && verifiedEmails.has(emailKey)),
    });
  }

  for (const verUser of verifiedUsers || []) {
    const rawEmail = verUser?.email;
    const emailKey = rawEmail ? rawEmail.toLowerCase().trim() : '';

    if (emailKey) {
      if (seenEmails.has(emailKey)) continue;
      seenEmails.add(emailKey);
    }

    const rawPos = verUser?.position || verUser?.positions;
    const position = Array.isArray(rawPos) ? rawPos : (rawPos ? [rawPos] : []);

    result.push({
      _id: verUser?._id,
      email: verUser?.email,
      name: verUser?.name,
      photo: '',
      position,
      loggedIn: false,
      verified: true,
    });
  }

  return result;
};

const createVerifiedUser = async ({ name, email, position }) => {
  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : email;
  const existingUser = await repository.findUserByEmail(normalizedEmail);

  if (existingUser) {
    const result = await repository.addPositionToUser(existingUser._id, position);
    if (result && result.matchedCount === 0) {
      throw new AppError(NOT_FOUND, 'NOT_FOUND', 'User not found during position update');
    }
    return { status: 200, data: { createStatus: 'success' } };
  }

  await repository.createUser({ name, email: normalizedEmail, positions: [position] });
  return { status: 201, data: { createStatus: 'success' } };
};

module.exports = { getUsers, updateProfile, isAdmin, getMergedUserList, createVerifiedUser };
