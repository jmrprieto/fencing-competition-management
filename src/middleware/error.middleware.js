const errors = require('../i18n/error');
const getLanguage = require('../utils/getLanguage');

function errorMiddleware(err, req, res, next) {
  console.error(err);

  const lang = getLanguage(req);

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const message =
    (errors[lang] && errors[lang][code]) ||
    errors['es'][code] ||
    code;

  const response = {
    error: {
      code,
      message
    }
  };

  // Optional: include details in non-production
  if (process.env.NODE_ENV !== 'production' && err.details) {
    response.error.details = err.details;
  }

  res.status(status).json(response);
}

module.exports = errorMiddleware;
