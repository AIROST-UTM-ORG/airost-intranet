export const getInitialForm = (user) => ({
  name: user?.name || '',
  profileTitle: user?.profileTitle || '',
  year: user?.year || '',
  course: user?.course || '',
  country: user?.country || '',
  state: user?.state || '',
  email: user?.email || '',
  phonenum: user?.phonenum || '',
  instagram: user?.instagram || '',
  linkedin: user?.linkedin || '',
  github: user?.github || '',
  description: user?.description || '',
  photo: user?.photo || '',
  featuredProject: {
    title: user?.featuredProject?.title || '',
    description: user?.featuredProject?.description || '',
    role: user?.featuredProject?.role || '',
    status: user?.featuredProject?.status || '',
    technologies: Array.isArray(user?.featuredProject?.technologies)
      ? user.featuredProject.technologies.join(', ')
      : '',
  },
});
