'use strict';

// Log gon moi request
function requestLogger(req, _res, next) {
  console.log('%s %s', req.method, req.originalUrl);
  next();
}

// Khong khop route nao
function notFound(_req, res) {
  res.status(404).json({ error: 'Khong co endpoint nay' });
}

// Bo bat loi chung - luon tra JSON de frontend xu ly duoc
function errorHandler(err, _req, res, _next) {
  console.error('[loi]', err.code || '', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.public || 'Loi may chu',
    code: err.code,
    detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
}

module.exports = { requestLogger, notFound, errorHandler };
