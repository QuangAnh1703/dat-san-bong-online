'use strict';
const express = require('express');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { query, withTransaction } = require('../../db');

const router = express.Router();

// All profile routes require authentication
router.use(requireAuthenticated);

// GET /api/profile - Get current user profile
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const r = await query(
      `SELECT u.id, u.email, u.phone, u.role, u.status, u.phone_verified,
              u.created_at, u.updated_at,
              p.full_name, p.avatar_url, p.district_code, p.skill_level,
              p.preferred_position, p.reputation_score, p.total_matches, p.bio
       FROM app_user u
       LEFT JOIN user_profile p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (r.rowCount === 0) {
      return next(new AppError('USER_NOT_FOUND'));
    }

    const user = r.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      phoneVerified: user.phone_verified,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      districtCode: user.district_code,
      skillLevel: user.skill_level,
      preferredPosition: user.preferred_position,
      reputationScore: user.reputation_score,
      totalMatches: user.total_matches,
      bio: user.bio,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile - Update profile (SCRUM-109)
router.put('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      full_name,
      avatar_url,
      district_code,
      skill_level,
      preferred_position,
      bio,
    } = req.body;

    // Validation (SCRUM-111)
    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || full_name.trim().length === 0) {
        return next(new AppError('INVALID_FIELD', {
          details: { field: 'full_name', reason: 'Must be non-empty string' }
        }));
      }
      if (full_name.length > 120) {
        return next(new AppError('INVALID_FIELD', {
          details: { field: 'full_name', reason: 'Max 120 characters' }
        }));
      }
    }

    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        return next(new AppError('INVALID_FIELD', {
          details: { field: 'bio', reason: 'Must be string' }
        }));
      }
      if (bio.length > 500) {
        return next(new AppError('INVALID_FIELD', {
          details: { field: 'bio', reason: 'Max 500 characters' }
        }));
      }
    }

    if (avatar_url !== undefined) {
      if (typeof avatar_url !== 'string' || avatar_url.length > 500) {
        return next(new AppError('INVALID_FIELD', {
          details: { field: 'avatar_url', reason: 'Max 500 characters' }
        }));
      }
    }

    if (skill_level !== undefined) {
      const validSkills = ['BEGINNER', 'INTERMEDIATE', 'GOOD', 'SEMI_PRO'];
      if (!validSkills.includes(skill_level)) {
        return next(new AppError('INVALID_FIELD', {
          details: { field: 'skill_level', reason: `Must be one of: ${validSkills.join(', ')}` }
        }));
      }
    }

    if (preferred_position !== undefined) {
      const validPositions = ['GK', 'DF', 'MF', 'FW', 'ANY'];
      if (!validPositions.includes(preferred_position)) {
        return next(new AppError('INVALID_FIELD', {
          details: { field: 'preferred_position', reason: `Must be one of: ${validPositions.join(', ')}` }
        }));
      }
    }

    if (district_code !== undefined) {
      if (district_code !== null) {
        const districtCheck = await query(
          'SELECT 1 FROM district WHERE code = $1',
          [district_code]
        );
        if (districtCheck.rowCount === 0) {
          return next(new AppError('INVALID_FIELD', {
            details: { field: 'district_code', reason: 'Invalid district code' }
          }));
        }
      }
    }

    // Update profile
    const updates = [];
    const values = [userId];
    let paramCount = 2;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount}`);
      values.push(full_name.trim());
      paramCount++;
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount}`);
      values.push(avatar_url);
      paramCount++;
    }
    if (district_code !== undefined) {
      updates.push(`district_code = $${paramCount}`);
      values.push(district_code);
      paramCount++;
    }
    if (skill_level !== undefined) {
      updates.push(`skill_level = $${paramCount}`);
      values.push(skill_level);
      paramCount++;
    }
    if (preferred_position !== undefined) {
      updates.push(`preferred_position = $${paramCount}`);
      values.push(preferred_position);
      paramCount++;
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`);
      values.push(bio);
      paramCount++;
    }

    updates.push(`updated_at = now()`);

    if (updates.length === 1) {
      // Only updated_at changed, nothing to update
      return res.json({ message: 'No changes' });
    }

    const updateQuery = `
      UPDATE user_profile
      SET ${updates.join(', ')}
      WHERE user_id = $1
      RETURNING full_name, avatar_url, district_code, skill_level,
                preferred_position, reputation_score, total_matches, bio, updated_at
    `;

    const result = await query(updateQuery, values);

    if (result.rowCount === 0) {
      return next(new AppError('USER_NOT_FOUND'));
    }

    const updated = result.rows[0];
    res.json({
      message: 'Profile updated successfully',
      profile: {
        fullName: updated.full_name,
        avatarUrl: updated.avatar_url,
        districtCode: updated.district_code,
        skillLevel: updated.skill_level,
        preferredPosition: updated.preferred_position,
        reputationScore: updated.reputation_score,
        totalMatches: updated.total_matches,
        bio: updated.bio,
        updatedAt: updated.updated_at,
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/profile/avatar - Upload avatar (SCRUM-110)
router.post('/avatar', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { image_url } = req.body;

    if (!image_url) {
      return next(new AppError('INVALID_FIELD', {
        details: { field: 'image_url', reason: 'Required' }
      }));
    }

    // Note: In production, this would receive file from multipart form-data
    // and upload to Cloudinary. For now, we accept a Cloudinary URL.
    if (!image_url.includes('cloudinary')) {
      return next(new AppError('INVALID_FIELD', {
        details: { field: 'image_url', reason: 'Must be Cloudinary URL' }
      }));
    }

    const result = await query(
      `UPDATE user_profile SET avatar_url = $1, updated_at = now()
       WHERE user_id = $2
       RETURNING avatar_url, updated_at`,
      [image_url, userId]
    );

    res.json({
      message: 'Avatar updated',
      avatar_url: result.rows[0]?.avatar_url,
      updated_at: result.rows[0]?.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/profile/:userId - View public profile (without auth)
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!Number.isInteger(Number(userId))) {
      return next(new AppError('INVALID_FIELD', {
        details: { field: 'userId', reason: 'Must be number' }
      }));
    }

    const r = await query(
      `SELECT u.id, u.role, u.status,
              p.full_name, p.avatar_url, p.district_code, p.skill_level,
              p.preferred_position, p.reputation_score, p.total_matches, p.bio, p.updated_at
       FROM app_user u
       LEFT JOIN user_profile p ON p.user_id = u.id
       WHERE u.id = $1 AND u.status = 'ACTIVE'`,
      [userId]
    );

    if (r.rowCount === 0) {
      return next(new AppError('USER_NOT_FOUND'));
    }

    const user = r.rows[0];
    res.json({
      id: user.id,
      role: user.role,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      districtCode: user.district_code,
      skillLevel: user.skill_level,
      preferredPosition: user.preferred_position,
      reputationScore: user.reputation_score,
      totalMatches: user.total_matches,
      bio: user.bio,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
