const repository = require('./member.repository');
const { isAdmin } = require('./admin/admin.service');
const { formatUser, formatUsers } = require('./member.formatter');
const { escapeRegex } = require('../../shared/utils/validators');
const AppError = require('../../shared/errors/AppError');
const { FORBIDDEN, NOT_FOUND } = require('../../shared/constants/httpStatus');

const buildFilter = ({ search, role, year }) => {
  const filter = { isActive: true };
  if (search?.trim()) {
    const term = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: term }, { email: term }, { course: term }, { description: term }];
  }
  if (role !== undefined) filter.positions = role.trim();
  if (year !== undefined) filter.year = year.trim();
  return filter;
};

const getUsers = async ({ search, role, year, page, limit }) => {
  const filter = buildFilter({ search, role, year });
  const currentPage = page ?? 1;
  const pageSize = limit ?? 20;
  const [users, total] = await Promise.all([
    repository.findDirectoryUsers(filter, { skip: (currentPage - 1) * pageSize, limit: pageSize }),
    repository.countDirectoryUsers(filter),
  ]);
  return { data: formatUsers(users), meta: { page: currentPage, limit: pageSize, total } };
};


const updateProfile = async (id, updates, caller) => {
  if (caller?._id?.toString().toLowerCase() !== id.toLowerCase() && !isAdmin(caller)) throw new AppError(FORBIDDEN, 'FORBIDDEN', 'You do not have permission to modify this profile');
  const user = await repository.findByIdAndUpdate(id, updates);
  if (!user) throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Not found');
  return formatUser(await repository.findProfileById(user._id));
};

module.exports = { getUsers, updateProfile };
