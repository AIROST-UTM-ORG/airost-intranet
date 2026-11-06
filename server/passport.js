const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require("passport");
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      const photoUrl = profile.photos?.[0]?.value || '';
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        cb(null, user);
      } else {
        // Admin-created directory records are placeholders until their first login.
        user = email ? await User.findOne({ email }) : null;
        if (user) {
          user.googleId = profile.id;
          user.name = profile.displayName || user.name;
          user.email = email;
          user.photoUrl = photoUrl || user.photoUrl;
          await user.save();
        } else {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName || email || 'Airost member',
            email,
            photoUrl,
          });
        }
        cb(null, user);
      }
    } catch (err) {
      console.log(err);
      cb(err, null);
    }
  }
));

passport.serializeUser((user, cb) => {
  cb(null, user._id || user);
});

passport.deserializeUser(async function(id, cb) {
  try {
    const userId = id && typeof id === 'object' && id._id ? id._id : id;
    const user = await User.findById(userId);
    cb(null, user);
  } catch (err) {
    cb(err, null);
  }
});
