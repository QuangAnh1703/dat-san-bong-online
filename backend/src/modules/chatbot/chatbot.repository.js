'use strict';
const { query } = require('../../db');

const CATEGORIES = ['BOOKING', 'PAYMENT', 'POLICY', 'COMMUNITY', 'ACCOUNT', 'OWNER', 'ADMIN', 'GENERAL'];
const AUDIENCES = ['GUEST', 'PLAYER', 'OWNER', 'ADMIN'];

// Tu hu khong mang nghia tim kiem; viet khong dau vi da bo dau truoc khi so khop
const STOPWORDS = new Set(
  (
    'a ah a oi ban cac cai cho chu co con cua da de den di duoc em gi giup ha hay hoi ko khong la lam lai luc ' +
    'ma minh muon nao nay ne nhe nhi nhu nhung oi o ra roi sao se thi the theo toi tu va vay ve voi vs xin'
  ).split(/\s+/)
);

// Giong f_unaccent + lower trong CSDL de tu cua cau hoi khop voi search_vector
function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .slice(0, 30);
}

/**
 * Lay cac bai lien quan nhat toi cau hoi, chi trong cac bai vai tro `role` duoc doc.
 * Diem = khop tu bat ky + thuong gap doi khi khop cum 2 tu lien nhau (tieng Viet ghep tu bang am tiet:
 * "dat san", "hoan coc") + do giong trigram voi tieu de / tu khoa (bat loi go sai).
 */
async function searchArticles(text, { role = 'GUEST', limit = 4, minScore = 0.6 } = {}) {
  const words = tokenize(text);
  if (words.length === 0) return [];
  const anyQuery = [...new Set(words)].join(' | ');
  const pairs = [];
  for (let i = 0; i + 1 < words.length; i++) pairs.push(`(${words[i]} <-> ${words[i + 1]})`);
  const phraseQuery = pairs.join(' | ');

  const r = await query(
    `WITH q AS (
       SELECT to_tsquery('simple', $1) AS any_q,
              CASE WHEN $2 = '' THEN NULL ELSE to_tsquery('simple', $2) END AS phrase_q
     )
     SELECT a.id, a.slug, a.title, a.category, a.route, a.content,
            round((ts_rank_cd(a.search_vector, q.any_q, 32)
                   + COALESCE(2 * ts_rank_cd(a.search_vector, q.phrase_q, 32), 0)
                   + 0.5 * word_similarity($3, lower(f_unaccent(a.title || ' ' || a.keywords))))::numeric, 4)::float AS score
       FROM kb_article a, q
      WHERE a.is_active AND a.audience && $4::text[]
        AND (a.search_vector @@ q.any_q OR $3 <% lower(f_unaccent(a.title || ' ' || a.keywords)))
      ORDER BY score DESC
      LIMIT $5`,
    [anyQuery, phraseQuery, words.join(' '), [role], limit]
  );
  // ts_rank khong co IDF nen am tiet pho bien ("san", "dat") keo bai khong lien quan len duoi danh sach:
  // bo cac bai kem xa bai dau
  const top = r.rows[0]?.score || 0;
  return r.rows.filter((row) => row.score >= minScore && row.score >= top * 0.5);
}

async function listArticles({ q, category, page, limit }) {
  const params = [];
  let where = 'TRUE';
  if (q) {
    params.push(`%${normalize(q)}%`);
    where += ` AND lower(f_unaccent(title || ' ' || keywords || ' ' || slug)) LIKE $${params.length}`;
  }
  if (category) {
    params.push(category);
    where += ` AND category = $${params.length}`;
  }
  const total = await query(`SELECT count(*)::int AS n FROM kb_article WHERE ${where}`, params);
  params.push(limit, (page - 1) * limit);
  const r = await query(
    `SELECT id, slug, title, category, audience, route, keywords, content, is_active, updated_at
       FROM kb_article WHERE ${where}
      ORDER BY category, title
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { total: total.rows[0].n, data: r.rows };
}

const COLUMNS = 'id, slug, title, category, audience, route, keywords, content, is_active, updated_at';

async function createArticle(a, userId) {
  const r = await query(
    `INSERT INTO kb_article (slug, title, category, audience, route, keywords, content, is_active, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLUMNS}`,
    [a.slug, a.title, a.category, a.audience, a.route, a.keywords, a.content, a.is_active, userId]
  );
  return r.rows[0];
}

async function updateArticle(id, a, userId) {
  const r = await query(
    `UPDATE kb_article
        SET slug = $2, title = $3, category = $4, audience = $5, route = $6, keywords = $7,
            content = $8, is_active = $9, updated_by = $10, updated_at = now()
      WHERE id = $1
      RETURNING ${COLUMNS}`,
    [id, a.slug, a.title, a.category, a.audience, a.route, a.keywords, a.content, a.is_active, userId]
  );
  return r.rows[0] || null;
}

async function deleteArticle(id) {
  const r = await query(`DELETE FROM kb_article WHERE id = $1`, [id]);
  return r.rowCount > 0;
}

module.exports = {
  CATEGORIES,
  AUDIENCES,
  searchArticles,
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
};
