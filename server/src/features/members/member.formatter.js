const formatUser = (source) => {
  if (!source) return source;
  const user = typeof source.toObject === 'function' ? source.toObject() : { ...source };
  const { googleId, googleID, __v, isActive, ...publicUser } = user;
  return {
    ...publicUser,
    positions: publicUser.positions || [],
    year: publicUser.year || '',
    course: publicUser.course || '',
    origin: {
      state: publicUser.origin?.state ?? '',
      country: publicUser.origin?.country ?? '',
    },
    description: publicUser.description || '',
    photoUrl: publicUser.photoUrl || '',
    instagramUrl: publicUser.instagramUrl || '',
    linkedinUrl: publicUser.linkedinUrl || '',
    githubUrl: publicUser.githubUrl || '',
    featuredProjectIds: publicUser.featuredProjectIds || [],
    loggedIn: Boolean(googleId || googleID),
    verified: Boolean(publicUser.positions?.length),
  };
};

module.exports = { formatUser, formatUsers: (users) => users.map(formatUser) };
