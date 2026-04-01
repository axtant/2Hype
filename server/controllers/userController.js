const prisma = require('../services/prismaClient');

// GET /api/user
exports.getUser = (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.user });
};
