'use strict';
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findById, findByEmail, createUserWithOAuth, linkOAuthAccount, findOAuthAccount } = require('./user.repository');

function initGoogleOAuth() {
  const clientID = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
  const isDev = process.env.NODE_ENV !== 'production';

  // Use mock mode if credentials not provided
  const useMock = !clientID || !clientSecret || clientID === 'mock' || clientSecret === 'mock';

  if (useMock && isDev) {
    console.log('✅ Google OAuth: Using MOCK mode (development)');
    return;
  }
  // Production thieu cau hinh: chi tat dang nhap Google (route tra GOOGLE_OAUTH_NOT_CONFIGURED), khong lam sap server
  if (useMock) {
    console.warn('[google] chua cau hinh GOOGLE_OAUTH_CLIENT_ID/SECRET -> tat dang nhap Google');
    return;
  }

  // Real Google OAuth
  passport.use(
    'google',
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
            const existing = await findOAuthAccount(user.id, 'GOOGLE', googleId);
            if (!existing) {
              await linkOAuthAccount(user.id, 'GOOGLE', googleId);
            }
          } else {
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

async function handleGoogleCallbackMock(req, res) {
  try {
    const { email, name } = req.query;
    const mockGoogleId = 'mock-' + Math.random().toString(36).substr(2, 9);

    let user = await findByEmail(email || 'mockuser@gmail.com');

    if (user) {
      const existing = await findOAuthAccount(user.id, 'GOOGLE', mockGoogleId);
      if (!existing) {
        await linkOAuthAccount(user.id, 'GOOGLE', mockGoogleId);
      }
    } else {
      user = await createUserWithOAuth({
        email: email || 'mockuser@gmail.com',
        fullName: name || 'Mock User',
        provider: 'GOOGLE',
        providerId: mockGoogleId,
      });
    }

    return { user, mockGoogleId };
  } catch (err) {
    throw err;
  }
}

module.exports = { initGoogleOAuth, handleGoogleCallbackMock };
