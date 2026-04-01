const passport = require('passport');

exports.getSteamAuth = passport.authenticate('steam');

exports.getSteamReturn = [
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => res.redirect('/vip'),
];

exports.logout = (req, res) => {
  req.session.destroy();
  res.clearCookie('connect.sid');
  res.json({ success: true });
};
