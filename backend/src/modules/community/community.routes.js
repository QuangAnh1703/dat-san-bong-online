'use strict';
const express = require('express');
const { AppError } = require('../../lib/errors');
const router = express.Router();

// TODO: ghep doi, danh gia, khieu nai - du lieu da co o V07/V08
router.use((_req, _res, next) => {
  next(new AppError('NOT_IMPLEMENTED', { details: { module: 'community' } }));
});

module.exports = router;
