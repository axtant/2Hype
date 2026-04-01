const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const prisma = require('./prismaClient');

passport.use(new SteamStrategy(
  {
    returnURL: `${process.env.DOMAIN}/auth/steam/return`,
    realm: process.env.DOMAIN,
    apiKey: process.env.STEAM_API_KEY,
  },
  async (identifier, profile, done) => {
    try {
      const steamId = identifier.split('/').pop();
      const user = await prisma.user.upsert({
        where: { steamId },
        update: { lastLoginAt: new Date() },
        create: {
          steamId,
          displayName: profile.displayName || steamId,
          avatarUrl: profile.photos?.[1]?.value || profile.photos?.[0]?.value,
          profileUrl: profile._json?.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
          lastLoginAt: new Date(),
        },
      });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
