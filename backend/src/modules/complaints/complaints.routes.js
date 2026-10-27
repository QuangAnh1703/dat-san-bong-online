'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const router = express.Router();

router.use(requireAuthenticated);

const URL_RE = /^https?:\/\/\S{1,490}$/;

function parseEvidence(urls) {
  if (urls === undefined) return [];
  if (!Array.isArray(urls) || urls.length > 5 || urls.some((u) => typeof u !== 'string' || !URL_RE.test(u))) {
    throw new AppError('INVALID_FIELD', { details: { field: 'evidence_urls', reason: 'Tối đa 5 link http(s)' } });
  }
  return urls;
}

// POST /api/complaints  body: { booking_code, subject, content, evidence_urls? }
router.post('/', async (req, res, next) => {
  const { booking_code, subject, content } = req.body || {};
  try {
    requireFields(req.body, ['booking_code', 'subject', 'content']);
    if (String(subject).length > 200 || String(content).length > 2000) {
      throw new AppError('INVALID_FIELD', { details: { reason: 'subject <= 200, content <= 2000 ky tu' } });
    }
    const evidence = parseEvidence(req.body.evidence_urls);

    const b = await query(`SELECT id, user_id FROM booking WHERE code = $1`, [booking_code]);
    if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code: booking_code } });
    if (b.rows[0].user_id !== req.user.id) throw new AppError('FORBIDDEN');

    const out = await withTransaction(async (c) => {
      const code = `TK-${Date.now().toString(36).toUpperCase()}`;
      const r = await c.query(
        `INSERT INTO complaint_ticket (code, reporter_id, target_kind, target_id, booking_id, subject, content)
         VALUES ($1, $2, 'BOOKING', $3, $3, $4, $5)
         RETURNING id, code, status, subject, created_at`,
        [code, req.user.id, b.rows[0].id, subject, content]
      );
      for (const url of evidence) {
        await c.query(`INSERT INTO complaint_evidence (ticket_id, url, uploaded_by) VALUES ($1, $2, $3)`, [
          r.rows[0].id,
          url,
          req.user.id,
        ]);
      }
      return r.rows[0];
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints/me - Khieu nai cua toi
router.get('/me', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT ct.id, ct.code, ct.status, ct.subject, ct.content, ct.resolution, ct.info_due_at,
              ct.created_at, ct.closed_at, b.code AS booking_code, v.name AS venue_name,
              (SELECT cm.content FROM complaint_message cm
                WHERE cm.ticket_id = ct.id AND cm.author_id <> ct.reporter_id
                ORDER BY cm.created_at DESC LIMIT 1) AS last_admin_message
         FROM complaint_ticket ct
         LEFT JOIN booking b ON b.id = ct.booking_id
         LEFT JOIN venue v ON v.id = b.venue_id
        WHERE ct.reporter_id = $1 ORDER BY ct.created_at DESC`,
      [req.user.id]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

async function loadOwnTicket(db, id, userId, lock = false) {
  const t = await db.query(`SELECT * FROM complaint_ticket WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`, [id]);
  if (t.rowCount === 0) throw new AppError('TICKET_NOT_FOUND');
  if (t.rows[0].reporter_id !== userId) throw new AppError('FORBIDDEN');
  return t.rows[0];
}

// GET /api/complaints/:id - Chi tiet khieu nai cua toi kem trao doi voi Admin va bang chung
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await loadOwnTicket({ query }, Number(req.params.id), req.user.id);
    const [messages, evidence] = await Promise.all([
      query(
        `SELECT cm.id, cm.author_id, (cm.author_id = $2) AS is_mine, cm.content, cm.created_at
           FROM complaint_message cm WHERE cm.ticket_id = $1 ORDER BY cm.created_at`,
        [ticket.id, req.user.id]
      ),
      query(`SELECT id, url, created_at FROM complaint_evidence WHERE ticket_id = $1 ORDER BY created_at`, [
        ticket.id,
      ]),
    ]);
    res.json({ ...ticket, messages: messages.rows, evidence: evidence.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/complaints/:id/messages  body: { content, evidence_urls? }
// Nguoi gui bo sung thong tin; ticket dang NEED_INFO -> IN_PROGRESS de Admin xu ly tiep
router.post('/:id/messages', async (req, res, next) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) throw new AppError('MISSING_FIELD', { details: { missing: ['content'] } });
    if (content.length > 2000) throw new AppError('INVALID_FIELD', { details: { field: 'content', reason: '<= 2000' } });
    const evidence = parseEvidence(req.body.evidence_urls);

    const out = await withTransaction(async (c) => {
      const ticket = await loadOwnTicket(c, Number(req.params.id), req.user.id, true);
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        throw new AppError('INVALID_STATUS', { message: 'Khiếu nại đã đóng', details: { status: ticket.status } });
      }
      const m = await c.query(
        `INSERT INTO complaint_message (ticket_id, author_id, content) VALUES ($1, $2, $3)
         RETURNING id, content, created_at`,
        [ticket.id, req.user.id, content]
      );
      for (const url of evidence) {
        await c.query(`INSERT INTO complaint_evidence (ticket_id, url, uploaded_by) VALUES ($1, $2, $3)`, [
          ticket.id,
          url,
          req.user.id,
        ]);
      }
      if (ticket.status === 'NEED_INFO') {
        await c.query(`UPDATE complaint_ticket SET status = 'IN_PROGRESS', info_due_at = NULL WHERE id = $1`, [
          ticket.id,
        ]);
        if (ticket.assigned_admin_id) {
          await c.query(
            `INSERT INTO notification (user_id, type, title, body)
             VALUES ($1, 'COMPLAINT_REPLIED', $2, $3)`,
            [ticket.assigned_admin_id, `Khiếu nại ${ticket.code} đã được bổ sung thông tin`, content.slice(0, 500)]
          );
        }
      }
      return m.rows[0];
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
