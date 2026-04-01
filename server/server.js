require('dotenv').config();

const path = require('path');
const https = require('https');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const passport = require('./services/steamAuthService');

const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const leaderboardController = require('./controllers/leaderboardController');
const plansController = require('./controllers/plansController');
const paymentController = require('./controllers/paymentController');
const ensureAuthenticated = require('./middleware/ensureAuthenticated');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Auth
app.get('/auth/steam', authController.getSteamAuth);
app.get('/auth/steam/return', authController.getSteamReturn);
app.post('/logout', authController.logout);

// User
app.get('/api/user', userController.getUser);

// Leaderboard
app.get('/api/leaderboard', leaderboardController.getLeaderboard);
app.post('/api/stats', leaderboardController.pushStats); // called from CS2 server

// Plans
app.get('/api/plans', plansController.getPlans);
app.post('/api/plans/buy', ensureAuthenticated, plansController.buyPlan);
app.get('/api/plans/me', ensureAuthenticated, plansController.myPlan);

// Payment (Razorpay — requires npm install razorpay + env vars)
app.post('/api/payment/create-order', ensureAuthenticated, paymentController.createOrder);

// Steam profile proxy — returns avatarUrl + displayName for a vanity URL
app.get('/api/steamprofile/:vanity', (req, res) => {
  const vanity = encodeURIComponent(req.params.vanity);
  const url = `https://steamcommunity.com/id/${vanity}?xml=1`;
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (steam) => {
    let body = '';
    steam.on('data', (chunk) => { body += chunk; });
    steam.on('end', () => {
      const avatar = (body.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/) || [])[1] || null;
      const name   = (body.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/)       || [])[1] || 'Unknown';
      res.json({ avatarUrl: avatar, displayName: name });
    });
  }).on('error', () => res.json({ avatarUrl: null, displayName: 'Unknown' }));
});

// Page routes (clean URLs without .html)
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, '../public/leaderboard.html')));
app.get('/vip', (req, res) => res.sendFile(path.join(__dirname, '../public/vip.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, '../public/about.html')));

app.listen(PORT, () => {
  console.log(`2Hype v2 running on http://localhost:${PORT}`);
});
