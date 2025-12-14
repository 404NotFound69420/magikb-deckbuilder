import { query } from "../db.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function expandDeck(deckCards) {
  const deck = [];
  for (const row of deckCards) {
    for (let i = 0; i < row.qty; i++) deck.push(row.card_id);
  }
  return shuffle(deck);
}

export async function createMatch(userId, deckId) {
  const matchId = crypto.randomUUID();

  // verify deck belongs to user
  const deckRes = await query("SELECT id FROM decks WHERE id=$1 AND user_id=$2", [deckId, userId]);
  if (deckRes.rowCount === 0) throw new Error("Deck not found");

  const deckCards = await query("SELECT card_id, qty FROM deck_cards WHERE deck_id=$1", [deckId]);
  const deck = expandDeck(deckCards.rows);

  if (deck.length !== 30) throw new Error("Deck must contain exactly 30 cards to play");

  const initial = {
    status: "LOBBY",
    players: {
      p1: { userId, deckId },
      p2: null
    },
    game: null
  };

  await query("INSERT INTO matches(id,status,player1_id) VALUES ($1,'LOBBY',$2)", [matchId, userId]);
  await query("INSERT INTO match_state(match_id,state_json) VALUES ($1,$2::jsonb)", [matchId, JSON.stringify(initial)]);

  return matchId;
}

export async function joinMatch(userId, matchId, deckId) {
  const ms = await query("SELECT state_json FROM match_state WHERE match_id=$1", [matchId]);
  if (ms.rowCount === 0) throw new Error("Match not found");
  const state = ms.rows[0].state_json;

  if (state.players.p2) throw new Error("Match already full");
  if (state.players.p1.userId === userId) throw new Error("You cannot join your own match");

  // verify deck
  const deckRes = await query("SELECT id FROM decks WHERE id=$1 AND user_id=$2", [deckId, userId]);
  if (deckRes.rowCount === 0) throw new Error("Deck not found");
  const deckCards = await query("SELECT card_id, qty FROM deck_cards WHERE deck_id=$1", [deckId]);
  const deck = expandDeck(deckCards.rows);
  if (deck.length !== 30) throw new Error("Deck must contain exactly 30 cards to play");

  state.players.p2 = { userId, deckId };

  // start game
  const p1DeckCards = await query("SELECT card_id, qty FROM deck_cards WHERE deck_id=$1", [state.players.p1.deckId]);
  const p2DeckCards = await query("SELECT card_id, qty FROM deck_cards WHERE deck_id=$1", [deckId]);
  const p1Deck = expandDeck(p1DeckCards.rows);
  const p2Deck = expandDeck(p2DeckCards.rows);

  const game = {
    turn: 1,
    current: "p1",
    mana: { p1: 1, p2: 0 },
    maxMana: { p1: 1, p2: 0 },
    hp: { p1: 20, p2: 20 },
    decks: { p1: p1Deck, p2: p2Deck },
    hands: { p1: p1Deck.splice(0, 5), p2: p2Deck.splice(0, 5) },
    boards: { p1: [], p2: [] },
    log: []
  };

  state.status = "ACTIVE";
  state.game = game;

  await query("UPDATE matches SET status='ACTIVE', player2_id=$2 WHERE id=$1", [matchId, userId]);
  await query("UPDATE match_state SET state_json=$2::jsonb WHERE match_id=$1", [matchId, JSON.stringify(state)]);
  return state;
}

export async function getMatchState(matchId) {
  const ms = await query("SELECT state_json FROM match_state WHERE match_id=$1", [matchId]);
  if (ms.rowCount === 0) throw new Error("Match not found");
  return ms.rows[0].state_json;
}

async function getCard(cardId) {
  const r = await query("SELECT id, name, type, cost, attack, health, effect_json FROM cards WHERE id=$1", [cardId]);
  return r.rows[0];
}

function opponentOf(p) { return p === "p1" ? "p2" : "p1"; }

export async function playCard(matchId, userId, handIndex) {
  const state = await getMatchState(matchId);
  if (state.status !== "ACTIVE") throw new Error("Match not active");

  const current = state.game.current;
  const playerSlot = state.players.p1.userId === userId ? "p1" : (state.players.p2?.userId === userId ? "p2" : null);
  if (!playerSlot) throw new Error("Not a player in this match");
  if (playerSlot !== current) throw new Error("Not your turn");

  const hand = state.game.hands[playerSlot];
  const cardId = hand[handIndex];
  if (!cardId) throw new Error("Invalid hand index");

  const card = await getCard(cardId);
  const mana = state.game.mana[playerSlot];
  if (card.cost > mana) throw new Error("Not enough mana");

  // spend mana
  state.game.mana[playerSlot] -= card.cost;

  // remove from hand
  hand.splice(handIndex, 1);

  if (card.type === "MINION") {
    state.game.boards[playerSlot].push({ cardId: card.id, atk: card.attack, hp: card.health, canAttack: false });
    state.game.log.push(`${playerSlot} played ${card.name}`);
  } else {
    const effect = card.effect_json || {};
    const opp = opponentOf(playerSlot);

    if (effect.kind === "DAMAGE") {
      state.game.hp[opp] -= effect.amount;
      state.game.log.push(`${playerSlot} cast ${card.name} for ${effect.amount} damage`);
    } else if (effect.kind === "HEAL") {
      state.game.hp[playerSlot] += effect.amount;
      state.game.log.push(`${playerSlot} cast ${card.name} heal ${effect.amount}`);
    } else if (effect.kind === "DRAW") {
      for (let i=0;i<effect.amount;i++) {
        const top = state.game.decks[playerSlot].shift();
        if (top) state.game.hands[playerSlot].push(top);
      }
      state.game.log.push(`${playerSlot} cast ${card.name} draw ${effect.amount}`);
    } else if (effect.kind === "DAMAGE_ALL") {
      // damage all enemy minions
      for (const m of state.game.boards[opp]) m.hp -= effect.amount;
      state.game.boards[opp] = state.game.boards[opp].filter(m => m.hp > 0);
      state.game.log.push(`${playerSlot} cast ${card.name} hits all for ${effect.amount}`);
    } else if (effect.kind === "DRAIN") {
      state.game.hp[opp] -= effect.amount;
      state.game.hp[playerSlot] += effect.amount;
      state.game.log.push(`${playerSlot} cast ${card.name} drain ${effect.amount}`);
    } else {
      state.game.log.push(`${playerSlot} cast ${card.name}`);
    }
  }

  // check win
  if (state.game.hp.p1 <= 0 || state.game.hp.p2 <= 0) {
    state.status = "ENDED";
    const winner = state.game.hp.p1 <= 0 ? "p2" : "p1";
    const winnerId = state.players[winner].userId;
    state.game.log.push(`${winner} wins!`);
    await query("UPDATE matches SET status='ENDED', winner_id=$2 WHERE id=$1", [matchId, winnerId]);
  }

  await query("UPDATE match_state SET state_json=$2::jsonb WHERE match_id=$1", [matchId, JSON.stringify(state)]);
  return state;
}

export async function attack(matchId, userId, attackerIndex) {
  const state = await getMatchState(matchId);
  if (state.status !== "ACTIVE") throw new Error("Match not active");

  const current = state.game.current;
  const playerSlot = state.players.p1.userId === userId ? "p1" : (state.players.p2?.userId === userId ? "p2" : null);
  if (!playerSlot) throw new Error("Not a player in this match");
  if (playerSlot !== current) throw new Error("Not your turn");

  const board = state.game.boards[playerSlot];
  const attacker = board[attackerIndex];
  if (!attacker) throw new Error("Invalid attacker");
  if (!attacker.canAttack) throw new Error("This minion cannot attack yet");

  const opp = opponentOf(playerSlot);
  state.game.hp[opp] -= attacker.atk;
  attacker.canAttack = false;
  state.game.log.push(`${playerSlot} attacks for ${attacker.atk}`);

  if (state.game.hp.p1 <= 0 || state.game.hp.p2 <= 0) {
    state.status = "ENDED";
    const winner = state.game.hp.p1 <= 0 ? "p2" : "p1";
    const winnerId = state.players[winner].userId;
    state.game.log.push(`${winner} wins!`);
    await query("UPDATE matches SET status='ENDED', winner_id=$2 WHERE id=$1", [matchId, winnerId]);
  }

  await query("UPDATE match_state SET state_json=$2::jsonb WHERE match_id=$1", [matchId, JSON.stringify(state)]);
  return state;
}

export async function endTurn(matchId, userId) {
  const state = await getMatchState(matchId);
  if (state.status !== "ACTIVE") throw new Error("Match not active");

  const current = state.game.current;
  const playerSlot = state.players.p1.userId === userId ? "p1" : (state.players.p2?.userId === userId ? "p2" : null);
  if (!playerSlot) throw new Error("Not a player in this match");
  if (playerSlot !== current) throw new Error("Not your turn");

  const next = opponentOf(current);
  state.game.current = next;
  state.game.turn += 1;

  // increment mana for next player
  state.game.maxMana[next] = Math.min(10, state.game.maxMana[next] + 1);
  state.game.mana[next] = state.game.maxMana[next];

  // draw 1
  const top = state.game.decks[next].shift();
  if (top) state.game.hands[next].push(top);

  // enable attacks for next player's minions
  for (const m of state.game.boards[next]) m.canAttack = true;

  state.game.log.push(`${playerSlot} ended turn. Now ${next}'s turn.`);

  await query("UPDATE match_state SET state_json=$2::jsonb WHERE match_id=$1", [matchId, JSON.stringify(state)]);
  return state;
}
