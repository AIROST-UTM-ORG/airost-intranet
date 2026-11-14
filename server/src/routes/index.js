/**
 * Registers feature routers under canonical API paths and backward-compatible aliases.
 */
const express = require('express');

const authRoutes = require('../../routes/auth');
const docRoutes = require('../../routes/docRoutes');
const adminRoutes = require('../../routes/adminRoutes');
const userRoutes = require('../../routes/userRoutes');
const eventRoutes = require('../../routes/eventRoutes');
const projectRoutes = require('../../routes/projectsRoutes');

const router = express.Router();

// Canonical API mounts. Domain routers retain ownership of their endpoint paths.
router.use('/api/auth', authRoutes);
router.use('/api/airost/doc', docRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/user', userRoutes);
router.use('/api/projects', projectRoutes);
router.use('/api/calendar', eventRoutes);

// Legacy API aliases retained for existing clients and integrations.
router.use('/auth', authRoutes);
router.use('/airost/doc', docRoutes);
router.use('/doc', docRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/projects', projectRoutes);
router.use('/calendar', eventRoutes);

// Test-only session bootstrap used by the existing Supertest integration suite.
if (process.env.NODE_ENV === 'test') {
  router.post('/test/auth/login', async (req, res) => {
    try {
      const User = require('../../models/User');
      const user = await User.findById(req.body.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      req.login(user, (error) => {
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, user });
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
}

module.exports = router;
