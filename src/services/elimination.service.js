const db = require('../config/db');
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
      VALUES ($1, $2, $3, $4, $5, $6, 'finished')
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
    VALUES ($1, $2, $3, $4, $5, 'pending')
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

