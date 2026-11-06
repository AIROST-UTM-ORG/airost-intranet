export const getInitialForm = (user) => ({
  name: user?.name || '',
  year: user?.year || '',
  course: user?.course || '',
  country: user?.origin?.country || '',
  state: user?.origin?.state || '',
  email: user?.email || '',
  instagramUrl: user?.instagramUrl || '',
  linkedinUrl: user?.linkedinUrl || '',
  githubUrl: user?.githubUrl || '',
  description: user?.description || '',
  photoUrl: user?.photoUrl || '',
  featuredProjectIds: Array.isArray(user?.featuredProjectIds)
    ? user.featuredProjectIds.map((project) => project?._id || project).filter(Boolean)
    : [],
});
