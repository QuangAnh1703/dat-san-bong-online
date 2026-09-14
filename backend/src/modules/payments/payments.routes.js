'use strict';
const express = require('express');
const { AppError } = require('../../lib/errors');
const router = express.Router();

// TODO: thanh toan, IPN, hoan tien - du lieu da co o V06__payments.sql
router.use((_req, _res, next) => {
  next(new AppError('NOT_IMPLEMENTED', { details: { module: 'payments' } }));
});

module.exports = router;
