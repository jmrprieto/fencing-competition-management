const db = require('../config/db');
const AppError = require('../utils/appError');

async function getPouleStandings(pouleId) {
  const result = await db.query(
    `
    SELECT
      f.*,
      COALESCE(v,0) AS v,
      COALESCE(matches,0) AS m,
      COALESCE(ts,0) AS ts,
      COALESCE(tr,0) AS tr,

      CASE
        WHEN COALESCE(matches,0) = 0 THEN 0
        ELSE v::float / matches
      END AS ratio,

      (COALESCE(ts,0) - COALESCE(tr,0)) AS ind

    FROM fencer_match_stats f
    WHERE poule_id = $1
    `,
    [pouleId]
  );

  const ranking = result.rows;

  ranking.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    if (b.ind !== a.ind) return b.ind - a.ind;
    if (b.ts !== a.ts) return b.ts - a.ts;
    return a.fencer_id - b.fencer_id;
  });

  return { pouleId, ranking };
}

async function getGlobalStandings(competitionId) {
  const result = await db.query(
    `
    SELECT
      fencer_id,
      SUM(v) AS v,
      SUM(matches) AS m,
      SUM(ts) AS ts,
      SUM(tr) AS tr,
      CASE
        WHEN SUM(matches) = 0 THEN 0
        ELSE SUM(v)::float / SUM(matches)
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
    return a.fencer_id - b.fencer_id;
  });

  return ranking;
}


async function getPouleBoutSheet(pouleId) {
  const boutsRes = await db.query(
    `
    SELECT 
      pb.*,
      fa.name AS fencer_a_name,
      fb.name AS fencer_b_name
    FROM poule_bouts pb
    JOIN fencers fa ON fa.id = pb.fencer_a_id
    JOIN fencers fb ON fb.id = pb.fencer_b_id
    WHERE pb.poule_id = $1
    ORDER BY pb.id
    `,
    [pouleId]
  );

  const bouts = boutsRes.rows;

  // structured for printing
  return bouts.map((b, index) => ({
    boutNumber: index + 1,
    fencerA: b.fencer_a_name,
    fencerB: b.fencer_b_name,
    scoreA: b.score_a,
    scoreB: b.score_b,
    status: b.status
  }));
}

module.exports = {
  getPouleStandings,
  getGlobalStandings,
  getPouleBoutSheet
};