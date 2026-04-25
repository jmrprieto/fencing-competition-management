function getLanguage(req) {
  const header = req.headers['accept-language'];

  if (!header) return 'es';

  if (header.includes('en')) return 'en-GB';

  return 'es';
}

module.exports = getLanguage;
