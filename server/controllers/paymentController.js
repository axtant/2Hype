// ── Razorpay Payment Controller ───────────────────────────────────────────────
// Setup:
//   1. npm install razorpay
//   2. Add to .env:
//        RAZORPAY_KEY_ID=rzp_test_...
//        RAZORPAY_KEY_SECRET=...

let razorpay = null;

try {
  const Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
} catch (_) {
  // razorpay package not installed — vip.js will fall back to direct /api/plans/buy
}

// Plan amounts in smallest currency unit (paise for INR, cents for USD)
// Adjust currency and amounts to match your Razorpay account settings
const PLAN_ORDERS = {
  HOURLY:     { amount: 200,   currency: 'INR', description: 'Hourly Server (1 hr)' },
  MONTHLY:    { amount: 3000,  currency: 'INR', description: 'Monthly Server (30 days)' },
  HOST_MATCH: { amount: 500,   currency: 'INR', description: 'Host a Match (3 hrs)' },
  VIP:        { amount: 1000,  currency: 'INR', description: 'VIP Access (30 days)' },
};

// POST /api/payment/create-order
exports.createOrder = async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ error: 'Payment gateway not configured' });
  }

  const { plan } = req.body;
  const orderSpec = PLAN_ORDERS[plan];
  if (!orderSpec) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const order = await razorpay.orders.create({
      amount:   orderSpec.amount,
      currency: orderSpec.currency,
      receipt:  `2hype_${plan}_${Date.now()}`,
      notes:    { userId: req.user?.id, plan },
    });

    res.json({
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};
