'use strict';
const express = require('express');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const repo = require('./chatbot.repository');

// Quan tri kho tri thuc cua tro ly (RAG) - chi admin
const router = express.Router();
router.use(requireAuthenticated, requireRole('ADMIN'));

const bad = (field, reason) => new AppError('INVALID_FIELD', { details: { field, reason } });

function parseArticle(body) {
  requireFields(body, ['slug', 'title', 'category', 'content']);
  const slug = String(body.slug).trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    throw bad('slug', 'Chữ thường không dấu, số và dấu gạch ngang, tối đa 80 ký tự');
  }
  const title = String(body.title).trim();
  if (!title || title.length > 200) throw bad('title', 'Tối đa 200 ký tự');
  if (!repo.CATEGORIES.includes(body.category)) throw bad('category', repo.CATEGORIES.join(' | '));
  const audience = Array.isArray(body.audience) ? [...new Set(body.audience)] : ['GUEST', 'PLAYER'];
  if (audience.length === 0 || audience.some((a) => !repo.AUDIENCES.includes(a))) {
    throw bad('audience', `Mảng khác rỗng gồm ${repo.AUDIENCES.join(', ')}`);
  }
  const route = body.route ? String(body.route).trim() : null;
  if (route && (!route.startsWith('/') || route.length > 200)) throw bad('route', 'Bắt đầu bằng /, tối đa 200 ký tự');
  const content = String(body.content).trim();
  if (content.length < 20 || content.length > 4000) throw bad('content', 'Từ 20 đến 4000 ký tự');
  return {
    slug,
    title,
    category: body.category,
    audience,
    route,
    keywords: String(body.keywords || '').trim().slice(0, 1000),
    content,
    is_active: body.is_active !== false,
  };
}

// GET /api/admin/knowledge?q=&category=&page=1&limit=20
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const category = repo.CATEGORIES.includes(req.query.category) ? req.query.category : null;
    const { total, data } = await repo.listArticles({ q: req.query.q, category, page, limit });
    res.json({ total, page, limit, data });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/knowledge/search?q=&role=PLAYER - xem truoc tro ly se lay duoc bai nao cho cau hoi
router.get('/search', async (req, res, next) => {
  try {
    requireFields(req.query, ['q']);
    const role = repo.AUDIENCES.includes(req.query.role) ? req.query.role : 'PLAYER';
    const data = await repo.searchArticles(String(req.query.q).slice(0, 300), { role, limit: 5 });
    res.json({ count: data.length, role, data });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const article = await repo.createArticle(parseArticle(req.body || {}), req.user.id);
    res.status(201).json(article);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const article = await repo.updateArticle(Number(req.params.id), parseArticle(req.body || {}), req.user.id);
    if (!article) throw new AppError('KB_ARTICLE_NOT_FOUND', { details: { id: req.params.id } });
    res.json(article);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!(await repo.deleteArticle(Number(req.params.id)))) {
      throw new AppError('KB_ARTICLE_NOT_FOUND', { details: { id: req.params.id } });
    }
    res.json({ message: 'Đã xóa bài viết' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
