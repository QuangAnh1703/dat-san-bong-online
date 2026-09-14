'use strict';
const express = require('express');
const { AppError } = require('../../lib/errors');
const router = express.Router();

// TODO: dang ky/dang nhap/phan quyen - se trien khai trong EP3 (Xac thuc & phan quyen)
router.use((_req, _res, next) => {
  next(new AppError('NOT_IMPLEMENTED', { details: { module: 'auth' } }));
});

module.exports = router;
