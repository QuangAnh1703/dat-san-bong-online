'use strict';
const express = require('express');
const { AppError } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const {
  createOwnerRequest,
  findPendingOwnerRequest,
  getOwnerRequest,
} = require('./owner.repository');

const router = express.Router();

// POST /api/owner/request - Yêu cầu nâng cấp lên OWNER (PLAYER only)
router.post('/request', requireAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Chỉ PLAYER mới có thể yêu cầu
    if (req.user.role !== 'PLAYER') {
      return next(new AppError('INVALID_OPERATION', {
        message: 'Only PLAYER can request to become OWNER'
      }));
    }

    // Kiểm tra đã có yêu cầu pending chưa
    const existing = await findPendingOwnerRequest(userId);
    if (existing) {
      return next(new AppError('OWNER_REQUEST_ALREADY_PENDING', {
        details: { request_id: existing.id, created_at: existing.created_at }
      }));
    }

    const request = await createOwnerRequest(userId);

    res.status(201).json({
      message: 'Owner request submitted',
      request: {
        id: request.id,
        user_id: request.user_id,
        status: request.status,
        requested_at: request.requested_at,
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/me - Lấy thông tin yêu cầu của user hiện tại
router.get('/me', requireAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const request = await findPendingOwnerRequest(userId);
    if (!request) {
      return res.json({ request: null, message: 'No pending request' });
    }

    res.json({
      request: {
        id: request.id,
        status: request.status,
        requested_at: request.requested_at,
        reviewed_at: request.reviewed_at,
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
