const repository = require('../member.repository');
const { PLATFORM_ROLES } = require('../../../shared/constants/roles');

const getMergedUserList = async () => {
  const [users, verifiedUsers] = await Promise.all([
    repository.findAllUsers(),
    repository.findAllVerifiedUsers(),
  ]);
  const verifiedEmails = new Set(verifiedUsers.map((user) => user.email));
  const loggedInUsers = users.map((user) => ({
    _id: user._id,
    email: user.email,
    name: user.name,
    photo: user.photoUrl || '',
    position: user.positions || [],
    loggedIn: true,
    verified: verifiedEmails.has(user.email),
  }));
  const loggedInEmails = new Set(users.map((user) => user.email));
  const verifiedPlaceholders = verifiedUsers
    .filter((user) => !loggedInEmails.has(user.email))
    .map((user) => ({
      _id: user._id,
      email: user.email,
      name: user.name,
      photo: '',
      position: user.position,
      loggedIn: false,
      verified: true,
    }));

  return [...loggedInUsers, ...verifiedPlaceholders];
};

const createVerifiedUser = async ({ name, email, position }) => {
  const existingUser = await repository.findUserByEmail(email);
  if (existingUser) {
    await repository.addPositionToUser(existingUser._id, position);
    return { status: 200, data: { createStatus: 'success' } };
  }

  await repository.createUser({ name, email, positions: [position] });
  return { status: 201, data: { createStatus: 'success' } };
};

const isAdmin = (user) => {
  const positions = Array.isArray(user?.positions) ? user.positions : [user?.positions];
  return positions.some((role) => typeof role === 'string' && role.trim().toLowerCase() === PLATFORM_ROLES.ADMIN);
};

module.exports = { getMergedUserList, createVerifiedUser, isAdmin };
