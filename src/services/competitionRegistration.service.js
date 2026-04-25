const competitionRepository = require('../repositories/competition.repository');
const competitionFencerRepository = require('../repositories/competitionFencer.repository');
const clubRepository = require('../repositories/club.repository');
const fencerRepository = require('../repositories/fencer.repository');
const refereeRepository = require('../repositories/referee.repository');
const AppError = require('../utils/appError');

async function registerFencer(competitionId, fencerId, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  // -------------------------
  // OWNERSHIP CHECK
  // -------------------------
  if (
    user.role !== 'super_admin' &&
    competition.admin_id !== user.id
  ) {
    throw new AppError('FORBIDDEN', 403);
  }

  // -------------------------
  // STATE CHECK
  // -------------------------
  if (competition.status !== 'REGISTRATION') {
    throw new AppError('INVALID_COMPETITION_STATE', 400);
  }

  // -------------------------
  // DUPLICATE CHECK
  // -------------------------
  const alreadyRegistered =
    await competitionFencerRepository.isFencerAlreadyRegistered(
      competitionId,
      fencerId
    );

  if (alreadyRegistered) {
    throw new AppError('FENCER_ALREADY_REGISTERED', 400);
  }

  // -------------------------
  // INSERT
  // -------------------------
  return await competitionFencerRepository.addFencerToCompetition(
    competitionId,
    fencerId
  );
}

async function listFencers(competitionId, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  if (
    user.role !== 'super_admin' &&
    competition.admin_id !== user.id
  ) {
    throw new AppError('FORBIDDEN', 403);
  }

  return await competitionFencerRepository.getFencersByCompetition(
    competitionId
  );
}

function parseFullName(value) {
  if (!value || typeof value !== 'string') {
    return { surname: '', givenName: '' };
  }

  const parts = value.split(',');
  if (parts.length >= 2) {
    return {
      surname: parts[0].trim(),
      givenName: parts.slice(1).join(',').trim()
    };
  }

  const words = value.trim().split(' ');
  if (words.length === 1) {
    return { surname: words[0], givenName: '' };
  }

  return {
    surname: words.slice(0, -1).join(' '),
    givenName: words[words.length - 1]
  };
}

function parseCsvRows(csvText) {
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
  const hasNameColumn = headerSet.has('full_name') || headerSet.has('name');
  const hasSurnameColumns = headerSet.has('surname') && headerSet.has('given_name');

  if (!hasNameColumn && !hasSurnameColumns) {
    throw new AppError('INVALID_CSV_HEADERS', 400, {
      required: 'full_name OR name OR (surname + given_name)'
    });
  }

  const requiredHeaders = ['club', 'ranking', 'sex'];
  for (const required of requiredHeaders) {
    if (!headerSet.has(required)) {
      throw new AppError('INVALID_CSV_HEADERS', 400, { required });
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

    const { surname, givenName } = hasNameColumn
      ? parseFullName(record.full_name || record.name)
      : {
          surname: record.surname || '',
          givenName: record.given_name || ''
        };

    const club = record.club || '';
    const ranking = Number(record.ranking);
    const sex = (record.sex || '').toUpperCase();

    if (!surname) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Missing surname or full_name'
      });
    }

    if (!givenName) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Missing given_name or invalid full_name'
      });
    }

    if (!club) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Missing club'
      });
    }

    if (!Number.isInteger(ranking) || ranking <= 0) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Ranking must be a positive integer'
      });
    }

    if (!['M', 'F', 'X'].includes(sex)) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Sex must be M, F or X'
      });
    }

    return {
      surname,
      givenName,
      club,
      ranking,
      sex
    };
  });
}

async function resolveClub(name) {
  const existingClub = await clubRepository.findClubByName(name);
  if (existingClub) {
    return existingClub;
  }

  return await clubRepository.createClub(name, 'Unknown', 'Unknown');
}

async function createOrFindFencer(surname, givenName, clubId, ranking, sex) {
  const existingFencer = await fencerRepository.findFencerByUniqueKey(
    surname,
    givenName,
    clubId,
    sex
  );

  if (existingFencer) {
    return existingFencer;
  }

  return await fencerRepository.createFencer(
    surname,
    givenName,
    clubId,
    ranking,
    sex
  );
}

async function importFencersFromCsv(competitionId, csvContent, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  if (user.role !== 'super_admin' && competition.admin_id !== user.id) {
    throw new AppError('FORBIDDEN', 403);
  }

  if (competition.status !== 'REGISTRATION') {
    throw new AppError('INVALID_COMPETITION_STATE', 400);
  }

  const parsedRows = parseCsvRows(csvContent);

  const imported = [];
  const skipped = [];

  for (const row of parsedRows) {
    const club = await resolveClub(row.club);
    const fencer = await createOrFindFencer(
      row.surname,
      row.givenName,
      club.id,
      row.ranking,
      row.sex
    );

    const registration = await competitionFencerRepository.addFencerToCompetition(
      competitionId,
      fencer.id
    );

    if (!registration) {
      skipped.push({ fencer, reason: 'already_registered' });
    } else {
      imported.push({ fencer, registrationId: registration.id });
    }
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

function normalizePersonName(value) {
  const { surname, givenName } = parseFullName(value);
  if (!surname) return '';
  return givenName ? `${surname}, ${givenName}` : surname;
}

function parseRefereeCsvRows(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new AppError('INVALID_CSV_PAYLOAD', 400);
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 1) {
    throw new AppError('INVALID_CSV_PAYLOAD', 400);
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((header) => header.trim().toLowerCase());
  const headerSet = new Set(headers);
  const hasNameColumn = headerSet.has('full_name') || headerSet.has('name');

  let rows = lines;
  if (hasNameColumn) {
    rows = lines.slice(1);
  } else if (headers.length !== 1) {
    throw new AppError('INVALID_CSV_HEADERS', 400, {
      required: 'single name column or header full_name/name'
    });
  }

  if (rows.length === 0) {
    throw new AppError('INVALID_CSV_PAYLOAD', 400);
  }

  return rows.map((line, index) => {
    const columns = line.split(delimiter).map((value) => value.trim());

    let nameValue;
    if (hasNameColumn) {
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

      nameValue = record.full_name || record.name;
    } else {
      nameValue = columns[0] || '';
    }

    const normalizedName = normalizePersonName(nameValue);
    if (!normalizedName) {
      throw new AppError('INVALID_CSV_ROW', 400, {
        row: index + 2,
        message: 'Missing referee name'
      });
    }

    return normalizedName;
  });
}

async function createOrFindReferee(name) {
  const existingReferee = await refereeRepository.findRefereeByName(name);
  if (existingReferee) {
    return existingReferee;
  }

  return await refereeRepository.createReferee(name);
}

async function importRefereesFromCsv(competitionId, csvContent, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  if (user.role !== 'super_admin' && competition.admin_id !== user.id) {
    throw new AppError('FORBIDDEN', 403);
  }

  if (competition.status !== 'REGISTRATION') {
    throw new AppError('INVALID_COMPETITION_STATE', 400);
  }

  const refereeNames = parseRefereeCsvRows(csvContent);

  const imported = [];
  const skipped = [];

  for (const name of refereeNames) {
    const referee = await createOrFindReferee(name);
    const registration = await refereeRepository.addRefereeToCompetition(
      competitionId,
      referee.id
    );

    if (!registration) {
      skipped.push({ referee, reason: 'already_registered' });
    } else {
      imported.push({ referee, registrationId: registration.id });
    }
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
  registerFencer,
  listFencers,
  importFencersFromCsv,
  importRefereesFromCsv
};
