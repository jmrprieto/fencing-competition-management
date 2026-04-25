const clubRepository = require('../repositories/club.repository');
const AppError = require('../utils/appError');

function parseClubCsvRows(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new AppError('INVALID_CSV_PAYLOAD', 400);
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new AppError('INVALID_CSV_PAYLOAD', 400);
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((header) => header.trim().toLowerCase());
  const headerSet = new Set(headers);

  const requiredHeaders = ['name', 'city', 'country'];
  for (const required of requiredHeaders) {
    if (!headerSet.has(required)) {
      throw new AppError('INVALID_CSV_HEADERS', 400, {
        required: required,
        expected: 'name, city, country'
      });
    }
  }

  return lines.slice(1).map((line, index) => {
    const columns = line.split(delimiter).map((value) => value.trim());
    if (columns.length < headers.length) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Row does not contain enough columns'
      });
    }

    const record = headers.reduce((acc, header, idx) => {
      acc[header] = columns[idx] || '';
      return acc;
    }, {});

    const name = record.name || '';
    const city = record.city || '';
    const country = record.country || '';

    if (!name) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Missing club name'
      });
    }

    if (!city) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Missing club city'
      });
    }

    if (!country) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Missing club country'
      });
    }

    return {
      name,
      city,
      country
    };
  });
}

async function importClubsFromCsv(csvContent, user) {
  if (!user) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  const rows = parseClubCsvRows(csvContent);
  const imported = [];
  const skipped = [];
  const seen = new Set();

  for (const row of rows) {
    const nameKey = row.name.trim().toLowerCase();

    if (seen.has(nameKey)) {
      skipped.push({ club: row, reason: 'duplicate_payload' });
      continue;
    }

    seen.add(nameKey);

    const existing = await clubRepository.findClubByName(row.name);
    if (existing) {
      skipped.push({ club: existing, reason: 'already_exists' });
      continue;
    }

    const club = await clubRepository.createClub(row.name, row.city, row.country);
    imported.push(club);
  }

  return {
    imported: imported.length,
    skipped: skipped.length,
    details: {
      imported,
      skipped
    }
  };
}

module.exports = {
  importClubsFromCsv
};
