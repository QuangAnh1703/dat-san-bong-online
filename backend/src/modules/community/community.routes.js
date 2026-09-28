'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const repo = require('./community.repository');

const router = express.Router();

// List match posts (browse teams/players)
// GET /api/community/posts?type=TEAM_FINDS_PLAYER&district=HK&skill_level=INTERMEDIATE
router.get('/posts', async (req, res, next) => {
  try {
    const { type, district, skill_level, date_from, date_to, limit = 20, offset = 0 } = req.query;
    const posts = await repo.listPosts({
      type: type || undefined,
      district_code: district || undefined,
      required_level: skill_level || undefined,
      play_date_from: date_from || undefined,
      play_date_to: date_to || undefined,
      status: 'OPEN',
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ count: posts.length, data: posts });
  } catch (err) {
    next(err);
  }
});

// Get post details with requests
router.get('/posts/:id', async (req, res, next) => {
  try {
    const post = await repo.getPostById(req.params.id);
    if (!post) {
      return next(new AppError('POST_NOT_FOUND'));
    }

    res.json({ data: post });
  } catch (err) {
    next(err);
  }
});

// Create a new match post (PLAYER creates to find team, TEAM creates to find players)
router.post('/posts', requireAuthenticated, requireRole('PLAYER', 'OWNER', 'ADMIN'), async (req, res, next) => {
  const {
    type, team_id, booking_id, district_code, play_date, time_span,
    required_level, deal_note, slots_needed, cost_kind, cost_amount, content, expires_at,
  } = req.body;

  try {
    requireFields(req.body, ['type', 'district_code', 'play_date', 'expires_at']);

    if (!['TEAM_FINDS_TEAM', 'TEAM_FINDS_PLAYER', 'PLAYER_FINDS_TEAM'].includes(type)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'type' } });
    }

    // TEAM_FINDS_* requires booking_id and team_id
    if (type.startsWith('TEAM_') && (!booking_id || !team_id)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'booking_id/team_id required for team posts' } });
    }

    // TEAM_FINDS_PLAYER requires slots_needed and cost info
    if (type === 'TEAM_FINDS_PLAYER' && (!slots_needed || !cost_kind)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'slots_needed/cost_kind required' } });
    }

    const post = await repo.createPost({
      type,
      author_user_id: req.user.id,
      team_id: team_id || null,
      booking_id: booking_id || null,
      district_code,
      play_date,
      time_span: time_span || null,
      required_level: required_level || 'INTERMEDIATE',
      deal_note: deal_note || null,
      slots_needed: slots_needed || null,
      cost_kind: cost_kind || null,
      cost_amount: cost_amount || null,
      content: content || '',
      expires_at,
    });

    res.status(201).json({ message: 'Post created', data: post });
  } catch (err) {
    next(err);
  }
});

// Close/match a post (update status)
router.put('/posts/:id', requireAuthenticated, async (req, res, next) => {
  const { status } = req.body;

  try {
    const post = await repo.getPostById(req.params.id);
    if (!post) {
      return next(new AppError('POST_NOT_FOUND'));
    }

    if (post.author_user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('FORBIDDEN'));
    }

    const updated = await repo.updatePost(req.params.id, { status });
    res.json({ message: 'Post updated', data: updated });
  } catch (err) {
    next(err);
  }
});

// Send join request
router.post('/requests', requireAuthenticated, async (req, res, next) => {
  const { post_id, message } = req.body;

  try {
    requireFields(req.body, ['post_id']);

    const post = await repo.getPostById(post_id);
    if (!post) {
      return next(new AppError('POST_NOT_FOUND'));
    }

    // Check for duplicate request
    const existing = await query(
      `SELECT * FROM join_request WHERE post_id = $1 AND requester_user_id = $2`,
      [post_id, req.user.id]
    );

    if (existing.rowCount > 0) {
      return next(new AppError('REQUEST_ALREADY_EXISTS'));
    }

    const request = await repo.createJoinRequest({
      post_id,
      requester_user_id: req.user.id,
      requester_team_id: null,
      message: message || null,
    });

    res.status(201).json({ message: 'Join request sent', data: request });
  } catch (err) {
    next(err);
  }
});

// List join requests (received by post author or sent by user)
router.get('/requests', requireAuthenticated, async (req, res, next) => {
  try {
    const { post_id, status, limit = 20, offset = 0 } = req.query;
    let requests;

    if (post_id) {
      // Author viewing requests on their post
      const post = await repo.getPostById(post_id);
      if (!post || post.author_user_id !== req.user.id) {
        return next(new AppError('FORBIDDEN'));
      }
      requests = await repo.listJoinRequests({
        post_id,
        status: status || undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } else {
      // User viewing their own sent requests
      requests = await repo.listJoinRequests({
        requester_user_id: req.user.id,
        status: status || undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }

    res.json({ count: requests.length, data: requests });
  } catch (err) {
    next(err);
  }
});

// Approve/reject join request
router.put('/requests/:id', requireAuthenticated, async (req, res, next) => {
  const { status } = req.body;

  try {
    requireFields(req.body, ['status']);

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'status' } }));
    }

    const request = await repo.getJoinRequestById(req.params.id);
    if (!request) {
      return next(new AppError('REQUEST_NOT_FOUND'));
    }

    const post = await repo.getPostById(request.post_id);
    if (post.author_user_id !== req.user.id) {
      return next(new AppError('FORBIDDEN'));
    }

    const updated = await repo.updateJoinRequest(req.params.id, { status });

    // If ACCEPTED, add to match_participant
    if (status === 'ACCEPTED' && post.booking_id) {
      await query(
        `INSERT INTO match_participant (booking_id, user_id, source)
         VALUES ($1, $2, 'FREELANCE') ON CONFLICT DO NOTHING`,
        [post.booking_id, request.requester_user_id]
      );
    }

    res.json({ message: `Request ${status.toLowerCase()}`, data: updated });
  } catch (err) {
    next(err);
  }
});

// Get conversations for current user
router.get('/conversations', requireAuthenticated, async (req, res, next) => {
  try {
    const convs = await query(
      `SELECT c.*, count(m.id) as message_count
       FROM conversation c
       JOIN conversation_member cm ON cm.conversation_id = c.id
       LEFT JOIN message m ON m.conversation_id = c.id
       WHERE cm.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ count: convs.rowCount, data: convs.rows });
  } catch (err) {
    next(err);
  }
});

// Get messages in a conversation
router.get('/conversations/:id/messages', requireAuthenticated, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Check if user is member
    const member = await query(
      `SELECT * FROM conversation_member WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (member.rowCount === 0) {
      return next(new AppError('FORBIDDEN'));
    }

    const messages = await repo.listMessages({
      conversation_id: req.params.id,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ count: messages.length, data: messages });
  } catch (err) {
    next(err);
  }
});

// Send message
router.post('/conversations/:id/messages', requireAuthenticated, async (req, res, next) => {
  const { content } = req.body;

  try {
    requireFields(req.body, ['content']);

    // Check if user is member
    const member = await query(
      `SELECT * FROM conversation_member WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (member.rowCount === 0) {
      return next(new AppError('FORBIDDEN'));
    }

    const message = await repo.createMessage({
      conversation_id: req.params.id,
      sender_id: req.user.id,
      content,
    });

    res.status(201).json({ message: 'Message sent', data: message });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
