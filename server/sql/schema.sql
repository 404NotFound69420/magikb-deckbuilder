-- Drop (dev only)
DROP TABLE IF EXISTS match_state;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS deck_cards;
DROP TABLE IF EXISTS decks;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cards (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  type      TEXT NOT NULL CHECK (type IN ('MINION','SPELL')),
  cost      INT  NOT NULL CHECK (cost >= 0),
  attack    INT  CHECK (attack >= 0),
  health    INT  CHECK (health >= 0),
  effect_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE decks (
  id        SERIAL PRIMARY KEY,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deck_cards (
  deck_id INT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  qty     INT NOT NULL CHECK (qty >= 0),
  PRIMARY KEY (deck_id, card_id)
);

CREATE TABLE matches (
  id          UUID PRIMARY KEY,
  status      TEXT NOT NULL CHECK (status IN ('LOBBY','ACTIVE','ENDED')),
  player1_id  INT NOT NULL REFERENCES users(id),
  player2_id  INT REFERENCES users(id),
  winner_id   INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE match_state (
  match_id UUID PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL
);
