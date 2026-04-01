const prisma = require('../services/prismaClient');

const PLANS = {
  HOURLY:     { label: 'Hourly Server',   price: 2,   durationHours: 1 },
  MONTHLY:    { label: 'Monthly Server',  price: 30,  durationHours: 720 },
  HOST_MATCH: { label: 'Host a Match',    price: 5,   durationHours: 3 },
  VIP:        { label: 'VIP Access',      price: 10,  durationHours: 720 },
};

// GET /api/plans
exports.getPlans = (req, res) => {
  res.json({ plans: PLANS });
};

// POST /api/plans/buy  { plan: 'HOURLY' | 'MONTHLY' | 'HOST_MATCH' | 'VIP' }
// NOTE: plug in your payment provider (Stripe etc.) before going live
exports.buyPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const { durationHours } = PLANS[plan];
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: { plan, status: 'ACTIVE', startedAt: new Date(), expiresAt },
      create: { userId, plan, status: 'ACTIVE', expiresAt },
    });

    // If VIP, also flag user
    if (plan === 'VIP') {
      await prisma.user.update({
        where: { id: userId },
        data: { isVip: true, vipExpiresAt: expiresAt },
      });
    }

    res.json({ success: true, subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process purchase' });
  }
};

// GET /api/plans/me
exports.myPlan = async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
    });
    res.json({ subscription });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};
