'use strict';
const { AppError } = require('../lib/errors');

/**
 * RBAC Middleware - Role-Based Access Control
 * Protects routes by checking user role
 */

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new AppError('UNAUTHORIZED', {
      message: 'Access token required'
    }));
  }

  // Token validation done in JWT middleware (if exists)
  // This is just a placeholder for now
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', {
      message: 'Invalid token'
    }));
  }

  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', {
        message: 'User not authenticated'
      }));
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('FORBIDDEN', {
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      }));
    }

    next();
  };
}

/**
 * Endpoint categories:
 * - PUBLIC: No auth required
 * - PLAYER: Any authenticated user
 * - OWNER: Only venue owners
 * - ADMIN: Only admins
 */

const permissions = {
  // Venues - Public search, Auth required for details and management
  'GET /api/venues': [], // PUBLIC - allow browsing all venues
  'GET /api/venues/:id': [], // PUBLIC - allow viewing venue details
  // OR use these if you want auth: ['PLAYER', 'OWNER', 'ADMIN'],
  'POST /api/venues': ['OWNER', 'ADMIN'],
  'PUT /api/venues/:id': ['OWNER', 'ADMIN'],
  'DELETE /api/venues/:id': ['OWNER', 'ADMIN'],

  // Bookings - PLAYER can create, view own
  'POST /api/bookings': ['PLAYER', 'OWNER', 'ADMIN'],
  'GET /api/bookings': ['PLAYER', 'OWNER', 'ADMIN'],
  'GET /api/bookings/:code': ['PLAYER', 'OWNER', 'ADMIN'],
  'PUT /api/bookings/:code': ['OWNER', 'ADMIN'],
  'DELETE /api/bookings/:code': ['PLAYER', 'OWNER', 'ADMIN'],

  // Community - PLAYER can use
  'POST /api/community/posts': ['PLAYER', 'OWNER', 'ADMIN'],
  'GET /api/community/posts': ['PLAYER', 'OWNER', 'ADMIN'],
  'POST /api/community/posts/:id/match': ['PLAYER', 'OWNER', 'ADMIN'],

  // Profile - All authenticated users
  'GET /api/profile': ['PLAYER', 'OWNER', 'ADMIN'],
  'PUT /api/profile': ['PLAYER', 'OWNER', 'ADMIN'],
  'POST /api/profile/avatar': ['PLAYER', 'OWNER', 'ADMIN'],

  // Owner requests - PLAYER can request
  'POST /api/owner/request': ['PLAYER'],
  'GET /api/owner/me': ['PLAYER', 'OWNER', 'ADMIN'],

  // Admin only
  'GET /api/admin/venues/pending': ['ADMIN'],
  'POST /api/admin/venues/:id/approve': ['ADMIN'],
  'POST /api/admin/venues/:id/reject': ['ADMIN'],
  'GET /api/admin/stats': ['ADMIN'],
  'GET /api/admin/users': ['ADMIN'],
  'PUT /api/admin/users/:id/role': ['ADMIN'],
  'GET /api/admin/owner-requests': ['ADMIN'],
  'POST /api/admin/owner-requests/:id/approve': ['ADMIN'],
  'POST /api/admin/owner-requests/:id/reject': ['ADMIN'],
};

/**
 * Check permission for route
 * Usage: app.use(checkPermission())
 */
function checkPermission() {
  return (req, res, next) => {
    const route = `${req.method} ${req.path.split('/').slice(0, 4).join('/')}`;
    const allowedRoles = permissions[route] || [];

    // Public endpoints - no check needed
    if (allowedRoles.length === 0) {
      return next();
    }

    // Check auth
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', {
        message: 'Authentication required'
      }));
    }

    // Check role
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', {
        message: `Access denied for role: ${req.user.role}`
      }));
    }

    next();
  };
}

module.exports = { requireAuth, requireRole, checkPermission, permissions };
