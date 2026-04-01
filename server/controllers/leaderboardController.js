const prisma = require('../services/prismaClient');

// GET /api/leaderboard
// Returns top players by total kills, with K/D and headshot %
exports.getLeaderboard = async (req, res) => {
  try {
    const stats = await prisma.dmStat.groupBy({
      by: ['userId', 'steamId'],
      _sum: { kills: true, deaths: true, headshots: true, damage: true },
      orderBy: { _sum: { kills: 'desc' } },
      take: 100,
    });

    const userIds = stats.map((s) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true, isVip: true },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const leaderboard = stats.map((s, index) => {
      const user = userMap[s.userId] || {};
      const kills = s._sum.kills || 0;
      const deaths = s._sum.deaths || 0;
      const headshots = s._sum.headshots || 0;
      return {
        rank: index + 1,
        userId: s.userId,
        steamId: s.steamId,
        displayName: user.displayName || 'Unknown',
        avatarUrl: user.avatarUrl || null,
        isVip: user.isVip || false,
        kills,
        deaths,
        headshots,
        damage: s._sum.damage || 0,
        kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2),
        hsp: kills > 0 ? ((headshots / kills) * 100).toFixed(1) : '0.0',
      };
    });

    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

// POST /api/stats  (called from your CS2 server after each DM session)
exports.pushStats = async (req, res) => {
  try {
    const { steamId, kills, deaths, headshots, damage, map } = req.body;

    if (!steamId) return res.status(400).json({ error: 'steamId required' });

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stat = await prisma.dmStat.create({
      data: { userId: user.id, steamId, kills, deaths, headshots, damage, map },
    });

    res.json({ success: true, stat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to push stats' });
  }
};
