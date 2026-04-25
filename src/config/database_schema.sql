PostgreSQL database schema:

-- =========================
-- ENUM TYPES
-- =========================

CREATE TYPE competition_status AS ENUM ('CREATED','PENDING', 'REGISTRATION', 'POULES', 'ELIMINATION', 'FINISHED');
CREATE TYPE bout_status AS ENUM ('PENDING', 'ONGOING', 'COMPLETED');
CREATE TYPE sex_type AS ENUM ('M', 'F', 'X');
CREATE TYPE bout_type AS ENUM ('POULE', 'ELIMINATION');

-- =========================
-- USERS (ADMIN AUTH)
-- =========================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- CLUBS
-- =========================

CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (LOWER(name))
);

-- =========================
-- REFEREES
-- =========================

CREATE TABLE referees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE competition_referees (
    id SERIAL PRIMARY KEY,

    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    referee_id INTEGER NOT NULL REFERENCES referees(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (competition_id, referee_id)
);

-- =========================
-- FENCERS
-- =========================

CREATE TABLE fencers (
    id SERIAL PRIMARY KEY,
    surname TEXT NOT NULL,
    given_name TEXT NOT NULL,
    club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
    ranking INTEGER NOT NULL CHECK (ranking > 0),
    sex sex_type NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- COMPETITIONS
-- =========================

CREATE TABLE competitions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status competition_status NOT NULL DEFAULT 'CREATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- POULES
-- =========================

CREATE TABLE poules (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,    
    poule_number INTEGER NOT NULL,
    referee_id INTEGER REFERENCES referees(id),
    UNIQUE (competition_id, poule_number, referee_id)
);

CREATE TABLE poule_fencers (
    id SERIAL PRIMARY KEY,
    poule_id INTEGER NOT NULL REFERENCES poules(id) ON DELETE CASCADE,
    fencer_id INTEGER NOT NULL REFERENCES fencers(id) ON DELETE CASCADE,
    UNIQUE (poule_id, fencer_id)
);

-- =========================
-- POULE BOUTS
-- =========================

CREATE TABLE poule_bouts (
    id SERIAL PRIMARY KEY,
    poule_id INTEGER NOT NULL REFERENCES poules(id) ON DELETE CASCADE,
    fencer_a_id INTEGER NOT NULL REFERENCES fencers(id),
    fencer_b_id INTEGER NOT NULL REFERENCES fencers(id),
    referee_id INTEGER REFERENCES referees(id),
    score_a INTEGER CHECK (score_a >= 0),
    score_b INTEGER CHECK (score_b >= 0),
    winner_id INTEGER REFERENCES fencers(id),
    status bout_status NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    CHECK (fencer_a_id <> fencer_b_id)
);

-- =========================
-- POULE RESULTS (STANDINGS)
-- =========================

CREATE TABLE poule_results (
    id SERIAL PRIMARY KEY,
    poule_id INTEGER NOT NULL REFERENCES poules(id) ON DELETE CASCADE,
    fencer_id INTEGER NOT NULL REFERENCES fencers(id) ON DELETE CASCADE,
    victories INTEGER NOT NULL DEFAULT 0,
    defeats INTEGER NOT NULL DEFAULT 0,
    touches_scored INTEGER NOT NULL DEFAULT 0,
    touches_received INTEGER NOT NULL DEFAULT 0,
    indicator INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    UNIQUE (poule_id, fencer_id)
);

-- =========================
-- ELIMINATION PHASE
-- =========================

CREATE TABLE elimination_brackets (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    round_name TEXT NOT NULL
);

CREATE TABLE elimination_bouts (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    bracket_id INTEGER NOT NULL REFERENCES elimination_brackets(id) ON DELETE CASCADE,
    round_order INTEGER NOT NULL,
    fencer_a_id INTEGER REFERENCES fencers(id),
    fencer_b_id INTEGER REFERENCES fencers(id),
    referee_id INTEGER REFERENCES referees(id),
    score_a INTEGER CHECK (score_a >= 0),
    score_b INTEGER CHECK (score_b >= 0),
    winner_id INTEGER REFERENCES fencers(id),
    next_bout_id INTEGER REFERENCES elimination_bouts(id) ON DELETE SET NULL,
    status bout_status NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    CHECK (
        fencer_a_id IS NULL OR
        fencer_b_id IS NULL OR
        fencer_a_id <> fencer_b_id
    )
);

-- =========================
-- FINAL RESULTS
-- =========================

CREATE TABLE final_results (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    fencer_id INTEGER NOT NULL REFERENCES fencers(id) ON DELETE CASCADE,
    final_position INTEGER NOT NULL,
    UNIQUE (competition_id, fencer_id),
    UNIQUE (competition_id, final_position)
);

-- =========================
-- OPTIONAL: REFEREE ASSIGNMENT HISTORY
-- =========================

CREATE TABLE bout_referee_assignments (
    id SERIAL PRIMARY KEY,
    bout_type bout_type NOT NULL,
    bout_id INTEGER NOT NULL,
    referee_id INTEGER NOT NULL REFERENCES referees(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP
);

-- =========================
-- INDEXES (PERFORMANCE)
-- =========================

CREATE INDEX idx_fencers_club ON fencers(club_id);
CREATE INDEX idx_poule_bouts_poule ON poule_bouts(poule_id);
CREATE INDEX idx_elimination_bouts_bracket ON elimination_bouts(bracket_id);
CREATE INDEX idx_poule_results_poule ON poule_results(poule_id);
CREATE INDEX idx_final_results_competition ON final_results(competition_id);

-- =========================
-- DATA INTEGRITY TRIGGERS
-- =========================

-- Ensure a bout cannot be completed without referee and winner

CREATE OR REPLACE FUNCTION validate_bout_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        IF NEW.referee_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete bout without referee';
        END IF;

        IF NEW.winner_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete bout without winner';
        END IF;

        IF NEW.score_a IS NULL OR NEW.score_b IS NULL THEN
            RAISE EXCEPTION 'Scores must be set before completing bout';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_poule_bout
BEFORE UPDATE ON poule_bouts
FOR EACH ROW
EXECUTE FUNCTION validate_bout_completion();

CREATE TRIGGER trg_validate_elimination_bout
BEFORE UPDATE ON elimination_bouts
FOR EACH ROW
EXECUTE FUNCTION validate_bout_completion();

CREATE TABLE competition_fencers (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    fencer_id INTEGER NOT NULL REFERENCES fencers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (competition_id, fencer_id)
);


CREATE TABLE languages (
    code VARCHAR(10) PRIMARY KEY, -- e.g. 'es', 'en-GB'
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO languages (code, name, is_default) VALUES
('es', 'Spanish', TRUE),
('en-GB', 'English (UK)', FALSE);

CREATE TABLE competition_translations (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    name TEXT NOT NULL,
    city TEXT,
    country TEXT,
    UNIQUE (competition_id, language_code)
);



// =========================
-- HELPER VIEWS to precalculate poule stats for ranking and display
// =========================
CREATE OR REPLACE VIEW fencer_match_stats AS
SELECT
  f.id AS fencer_id,
  pf.poule_id,
  p.competition_id,

  COUNT(pb.id) FILTER (WHERE pb.status = 'FINISHED') AS matches,

  SUM(
    CASE
      WHEN pb.fencer_a_id = f.id THEN pb.score_a
      WHEN pb.fencer_b_id = f.id THEN pb.score_b
      ELSE 0
    END
  ) AS ts,

  SUM(
    CASE
      WHEN pb.fencer_a_id = f.id THEN pb.score_b
      WHEN pb.fencer_b_id = f.id THEN pb.score_a
      ELSE 0
    END
  ) AS tr,

  SUM(
    CASE WHEN pb.winner_id = f.id THEN 1 ELSE 0 END
  ) AS v

FROM fencers f
JOIN poule_fencers pf ON pf.fencer_id = f.id
JOIN poules p ON p.id = pf.poule_id
LEFT JOIN poule_bouts pb
  ON pb.poule_id = pf.poule_id
  AND (pb.fencer_a_id = f.id OR pb.fencer_b_id = f.id)

GROUP BY f.id, pf.poule_id, p.competition_id;