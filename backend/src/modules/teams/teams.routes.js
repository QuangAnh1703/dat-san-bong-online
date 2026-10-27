'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const router = express.Router();

const SKILLS = ['BEGINNER', 'INTERMEDIATE', 'GOOD', 'SEMI_PRO'];

router.use(requireAuthenticated);

const TEAM_COLUMNS = `id, name, captain_id, district_code, skill_level, member_count, elo, wins, draws, losses, win_streak, fund_balance,
                      reputation_score, total_matches, created_at`;

// GET /api/teams/me - Doi ma nguoi dung dang lam doi truong (null neu chua co)
router.get('/me', async (req, res, next) => {
  try {
    const r = await query(`SELECT ${TEAM_COLUMNS} FROM team WHERE captain_id = $1`, [req.user.id]);
    res.json({ team: r.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teams/me  body: { name, member_count?, skill_level?, district_code? }
// Tao moi neu chua co doi, nguoc lai cap nhat
router.put('/me', async (req, res, next) => {
  const { name, member_count, skill_level, district_code } = req.body || {};
  try {
    requireFields(req.body, ['name']);
    if (typeof name !== 'string' || !name.trim() || name.length > 120) {
      throw new AppError('INVALID_FIELD', { details: { field: 'name', reason: '1-120 ky tu' } });
    }
    if (
      member_count !== undefined &&
      (!Number.isInteger(member_count) || member_count < 1 || member_count > 50)
    ) {
      throw new AppError('INVALID_FIELD', { details: { field: 'member_count', reason: '1-50' } });
    }
    if (skill_level !== undefined && !SKILLS.includes(skill_level)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'skill_level', reason: SKILLS.join(', ') } });
    }

    const team = await withTransaction(async (c) => {
      const r = await c.query(
        `INSERT INTO team (name, captain_id, district_code, skill_level, member_count)
         VALUES ($1, $2, $3, COALESCE($4, 'INTERMEDIATE')::skill_level, COALESCE($5, 10))
         ON CONFLICT (captain_id) DO UPDATE
            SET name = EXCLUDED.name,
                district_code = COALESCE($3, team.district_code),
                skill_level = COALESCE($4::skill_level, team.skill_level),
                member_count = COALESCE($5, team.member_count)
         RETURNING ${TEAM_COLUMNS}`,
        [name.trim(), req.user.id, district_code || null, skill_level || null, member_count ?? null]
      );
      await c.query(
        `INSERT INTO team_member (team_id, user_id, role_in_team) VALUES ($1, $2, 'CAPTAIN')
         ON CONFLICT DO NOTHING`,
        [r.rows[0].id, req.user.id]
      );
      return r.rows[0];
    });

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
