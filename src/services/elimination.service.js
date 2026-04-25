const db = require('../config/db');
const competitionRepository = require('../repositories/competition.repository');
const AppError = require('../utils/appError');

async function createBracket(competitionId, roundName) {
  const result = await db.query(
    `
    INSERT INTO elimination_brackets (competition_id, round_name)
    VALUES ($1, $2)
    RETURNING *
    `,
    [competitionId, roundName]
  );

  return result.rows[0];
}

async function buildGlobalRanking(competitionId) {
  const result = await db.query(
    `
    SELECT
      fencer_id AS id,

      SUM(v) AS v,
      SUM(m) AS m,
      SUM(ts) AS ts,
      SUM(tr) AS tr,

      CASE
        WHEN SUM(m) = 0 THEN 0
        ELSE SUM(v)::float / SUM(m)
      END AS ratio,

      SUM(ts - tr) AS ind

    FROM fencer_match_stats
    WHERE competition_id = $1
    GROUP BY fencer_id
    `,
    [competitionId]
  );

  const ranking = result.rows;

  ranking.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    if (b.ind !== a.ind) return b.ind - a.ind;
    if (b.ts !== a.ts) return b.ts - a.ts;
    return a.id - b.id;
  });

  return ranking;
}

function generateSeededBracket(ranking, size) {
  const padded = [...ranking];

  // fill BYEs
  while (padded.length < size) {
    padded.push(null);
  }

  const pairs = [];
  let i = 0;
  let j = size - 1;

  while (i < j) {
    pairs.push([
      padded[i],
      padded[j]
    ]);

    i++;
    j--;
  }

  return pairs;
}

function nextPowerOfTwo(n) {
  let size = 1;

  while (size < n) {
    size *= 2;
  }

  return size;
}

async function generateElimination(competitionId) {
  const ranking = await buildGlobalRanking(competitionId);

  if (ranking.length < 2) {
    throw new AppError('NOT_ENOUGH_FENCERS', 400);
  }

  // -------------------------
  // DETERMINE BRACKET SIZE
  // -------------------------
  const size = nextPowerOfTwo(ranking.length);
  const roundName = `DE${size}`;

  const bracket = await createBracket(
    competitionId,
    roundName
  );

  const pairs = generateSeededBracket(ranking, size);

  const createdBouts = [];

  // -------------------------
  // CREATE INITIAL BOUTS
  // -------------------------
  for (let i = 0; i < pairs.length; i++) {
  const [a, b] = pairs[i];

  // BYE handling
  if (!a || !b) {
    const realFencer = a || b;

    const res = await db.query(
      `
      INSERT INTO elimination_bouts (
        competition_id,
        bracket_id,
        round_order,
        fencer_a_id,
        fencer_b_id,
        winner_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'FINISHED')
      RETURNING *
      `,
      [
        competitionId,
        bracket.id,
        i,
        realFencer.id,
        null,
        realFencer.id
      ]
    );

    createdBouts.push(res.rows[0]);
    continue;
  }

  // normal bout
  const res = await db.query(
    `
    INSERT INTO elimination_bouts (
      competition_id,
      bracket_id,
      round_order,
      fencer_a_id,
      fencer_b_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'PENDING')
    RETURNING *
    `,
    [
      competitionId,
      bracket.id,
      i,
      a.id,
      b.id
    ]
  );

  createdBouts.push(res.rows[0]);
}


  // -------------------------
  // LINK PROGRESSION GRAPH
  // -------------------------
  const half = Math.floor(createdBouts.length / 2);

  for (let i = 0; i < half; i++) {
    const targetIndex = Math.floor(i / 2);

    const nextBout =
      createdBouts[half + targetIndex];

    if (nextBout) {
      await db.query(
        `
        UPDATE elimination_bouts
        SET next_bout_id = $1
        WHERE id = $2
        `,
        [nextBout.id, createdBouts[i].id]
      );
    }
  }

  return {
    bracket,
    bouts: createdBouts
  };
}

function buildEliminationTree(bouts) {
  const nodesById = new Map();

  for (const bout of bouts) {
    nodesById.set(bout.id, {
      ...bout,
      children: []
    });
  }

  for (const bout of nodesById.values()) {
    if (bout.next_bout_id) {
      const next = nodesById.get(bout.next_bout_id);
      if (next) {
        next.children.push(bout);
      }
    }
  }

  return [...nodesById.values()].filter((bout) => !bout.next_bout_id);
}

async function getEliminationTree(competitionId, user) {
  const competition = await competitionRepository.findById(competitionId);
  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  if (user.role !== 'super_admin' && competition.admin_id !== user.id) {
    throw new AppError('FORBIDDEN', 403);
  }

  const bracketResults = await db.query(
    `
    SELECT id, round_name
    FROM elimination_brackets
    WHERE competition_id = $1
    ORDER BY id ASC
    `,
    [competitionId]
  );

  const boutsResults = await db.query(
    `
    SELECT
      eb.*, 
      fa.surname AS fencer_a_surname,
      fa.given_name AS fencer_a_given_name,
      fb.surname AS fencer_b_surname,
      fb.given_name AS fencer_b_given_name,
      fr.name AS referee_name,
      fw.surname AS winner_surname,
      fw.given_name AS winner_given_name
    FROM elimination_bouts eb
    LEFT JOIN fencers fa ON eb.fencer_a_id = fa.id
    LEFT JOIN fencers fb ON eb.fencer_b_id = fb.id
    LEFT JOIN referees fr ON eb.referee_id = fr.id
    LEFT JOIN fencers fw ON eb.winner_id = fw.id
    WHERE eb.competition_id = $1
    ORDER BY eb.round_order ASC, eb.id ASC
    `,
    [competitionId]
  );

  const bouts = boutsResults.rows.map((row) => ({
    id: row.id,
    bracket_id: row.bracket_id,
    round_order: row.round_order,
    status: row.status,
    score_a: row.score_a,
    score_b: row.score_b,
    next_bout_id: row.next_bout_id,
    started_at: row.started_at,
    finished_at: row.finished_at,
    fencer_a: row.fencer_a_id
      ? {
          id: row.fencer_a_id,
          surname: row.fencer_a_surname,
          given_name: row.fencer_a_given_name
        }
      : null,
    fencer_b: row.fencer_b_id
      ? {
          id: row.fencer_b_id,
          surname: row.fencer_b_surname,
          given_name: row.fencer_b_given_name
        }
      : null,
    winner: row.winner_id
      ? {
          id: row.winner_id,
          surname: row.winner_surname,
          given_name: row.winner_given_name
        }
      : null,
    referee: row.referee_id
      ? {
          id: row.referee_id,
          name: row.referee_name
        }
      : null
  }));

  const brackets = bracketResults.rows.map((bracket) => {
    const bracketBouts = bouts.filter((bout) => bout.bracket_id === bracket.id);
    return {
      id: bracket.id,
      round_name: bracket.round_name,
      tree: buildEliminationTree(bracketBouts)
    };
  });

  return {
    competition_id: competitionId,
    brackets
  };
}

module.exports = {
  generateElimination,
  getEliminationTree
};

