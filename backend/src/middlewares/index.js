'use strict';
const crypto = require('crypto');
const { AppError, fromDbError } = require('../lib/errors');

/** Gan ma dinh danh cho moi request de doi chieu log <-> loi hien tren client */
function requestId(req, res, next) {
  req.id = req.get('X-Request-Id') || crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}

/** Log gon moi request kem thoi gian xu ly */
function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    console.log('%s %s %d %dms [%s]',
      req.method, req.originalUrl, res.statusCode, Date.now() - started, req.id);
  });
  next();
}

/** Khong khop route nao -> dua vao bo bat loi chung de dung mot dinh dang */
function notFound(_req, _res, next) {
  next(new AppError('ROUTE_NOT_FOUND'));
}

/**
 * Bo bat loi chung - diem DUY NHAT sinh phan hoi loi cua API.
 * Dinh dang thong nhat:
 *   { error: { code, message, details?, requestId, timestamp } }
 */
function errorHandler(err, req, res, _next) {
  const appError =
    err instanceof AppError ? err
    : fromDbError(err) || new AppError('INTERNAL_ERROR', { cause: err });

  // Log day du o server; khong lo chi tiet ky thuat ra ngoai khi chay that
  const logLevel = appError.status >= 500 ? 'error' : 'warn';
  console[logLevel]('[%s] %s %s -> %s: %s',
    req.id, req.method, req.originalUrl, appError.code, err.message);

  const body = {
    error: {
      code: appError.code,
      message: appError.message,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  };
  if (appError.details) body.error.details = appError.details;

  // Chi kem stack/loi goc khi dang phat trien
  if (process.env.NODE_ENV !== 'production' && appError.status >= 500) {
    body.error.debug = { message: err.message, code: err.code };
  }

  res.status(appError.status).json(body);
}

module.exports = { requestId, requestLogger, notFound, errorHandler };
