'use strict';
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findById, findByEmail, createUserWithOAuth, linkOAuthAccount } = require('./user.repository');

function initGoogleOAuth() {
  const clientID = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientID || !clientSecret) {
    console.warn('⚠️ Google OAuth not configured - GOOGLE_OAUTH_CLIENT_ID/SECRET missing');
    return null;
  }

  passport.use(
    new GoogleStrategy(
      { clientID, clientSecret, callbackURL },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { id: googleId, emails, displayName } = profile;
          const email = emails?.[0]?.value?.toLowerCase();

          if (!email) {
            return done(new Error('Email not provided by Google'));
          }

          let user = await findByEmail(email);

          if (user) {
            // User exists - link OAuth if not already linked
            const { findOAuthAccount } = require('./user.repository');
            const existing = await findOAuthAccount(user.id, 'GOOGLE', googleId);

            if (!existing) {
              await linkOAuthAccount(user.id, 'GOOGLE', googleId);
            }
          } else {
            // Create new user with OAuth
            user = await createUserWithOAuth({
              email,
              fullName: displayName || email.split('@')[0],
              provider: 'GOOGLE',
              providerId: googleId,
            });
          }

          return done(null, { ...user, provider: 'GOOGLE' });
        } catch (err) {
          done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = { initGoogleOAuth };
