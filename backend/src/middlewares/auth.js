'use strict';
const jwt = require('jsonwebtoken');
const { AppError } = require('../lib/errors');

/**
 * JWT Middleware - Parse and validate access tokens
 * Attaches req.user with decoded token data
 */

function verifyAccessToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  // No token - user is anonymous (may be OK for public endpoints)
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev-secret');
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('TOKEN_EXPIRED', {
        message: 'Access token expired'
      }));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('INVALID_TOKEN', {
        message: 'Invalid access token'
      }));
    }
    next(err);
  }
}

function requireAuthenticated(req, res, next) {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', {
      message: 'Authentication required'
    }));
  }
  next();
}

module.exports = { verifyAccessToken, requireAuthenticated };
