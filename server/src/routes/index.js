/**
 * Registers feature routers under canonical API paths and backward-compatible aliases.
 */
const express = require('express');

const authRoutes = require('../features/auth/auth.routes');
const docRoutes = require('../../routes/docRoutes');
const adminRoutes = require('../../routes/adminRoutes');
const userRoutes = require('../features/members/member.routes');
const memberRepository = require('../features/members/member.repository');
const eventRoutes = require('../../routes/eventRoutes');
const projectRoutes = require('../features/projects/project.routes');

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
  const { validate } = require('../middleware/validate');
  const { validateTestLoginPayload } = require('../features/auth/auth.validation');
  router.post('/test/auth/login', validate((req) => validateTestLoginPayload(req.body)), async (req, res) => {
    try {
      const user = await memberRepository.findById(req.sanitizedData.userId);
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
