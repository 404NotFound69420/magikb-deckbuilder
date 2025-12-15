import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";

const DECK_SIZE = 10;

export default function DeckBuilder() {
  const { deckId } = useParams();
  const [allCards, setAllCards] = useState([]);
  const [deck, setDeck] = useState(null);
  const [deckCards, setDeckCards] = useState({}); // cardId -> qty
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [cardsRes, deckRes] = await Promise.all([
          api.cards(),
          api.getDeck(deckId),
        ]);

        setAllCards(cardsRes.cards);
        setDeck(deckRes.deck);

        const map = {};
        for (const row of deckRes.cards) map[row.cardId] = row.qty;
        setDeckCards(map);
      } catch (e) {
        setErr(String(e.message || e));
      }
    })();
  }, [deckId]);

  const total = useMemo(
    () => Object.values(deckCards).reduce((s, n) => s + n, 0),
    [deckCards]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allCards;
    return allCards.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.type.toLowerCase().includes(s)
    );
  }, [q, allCards]);

  function inc(cardId) {
    setMsg("");
    setErr("");

    setDeckCards((prev) => {
      if (total >= DECK_SIZE) return prev;

      const next = { ...prev };
      const cur = next[cardId] || 0;
      next[cardId] = cur + 1;
      return next;
    });
  }

  function dec(cardId) {
    setMsg("");
    setErr("");

    setDeckCards((prev) => {
      const next = { ...prev };
      const cur = next[cardId] || 0;
      if (cur <= 0) return prev;
      if (cur === 1) delete next[cardId];
      else next[cardId] = cur - 1;
      return next;
    });
  }

  async function save() {
    setErr("");
    setMsg("");

    try {
      if (total !== DECK_SIZE) {
        setErr(`Deck must be exactly ${DECK_SIZE} cards to save/play.`);
        return;
      }

      const cards = Object.entries(deckCards).map(([cardId, qty]) => ({
        cardId: Number(cardId),
        qty,
      }));

      await api.saveDeckCards(deckId, cards);
      setMsg("Saved!");
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  const canSave = total === DECK_SIZE;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Deck Builder</h2>

      {deck && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{deck.name}</div>
          <div style={{ opacity: 0.8 }}>
            Total cards:{" "}
            <b style={{ color: canSave ? "lightgreen" : "orange" }}>
              {total}/{DECK_SIZE}
            </b>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          margin: "10px 0 16px",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Search cards..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: 1,
            minWidth: 240,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #333",
          }}
        />

        <button
          onClick={save}
          disabled={!canSave}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            opacity: canSave ? 1 : 0.6,
          }}
        >
          Save Deck
        </button>

        {msg && <span style={{ color: "lightgreen" }}>{msg}</span>}
        {err && <span style={{ color: "tomato" }}>{err}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LEFT: All Cards */}
        <div>
          <h3 style={{ marginTop: 0 }}>All Cards</h3>

          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((c) => {
              const inDeck = deckCards[c.id] || 0;

              return (
                <div
                  key={c.id}
                  style={{
                    border: "1px solid #333",
                    padding: 12,
                    borderRadius: 14,
                    display: "grid",
                    gridTemplateColumns: "72px 1fr",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  {/* Optional image: put files in client/public/cards/1.png, 2.png, etc */}
                  <div
                    style={{
                      width: 72,
                      height: 96,
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "1px solid #333",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      opacity: 0.85,
                    }}
                  >
                    <img
                      src={`/cards/${c.id}.png`}
                      alt={c.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        // fallback to text
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement.textContent = c.type;
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <b>{c.name}</b>
                      <span style={{ fontWeight: 800 }}>Cost {c.cost}</span>
                    </div>

                    <div style={{ opacity: 0.85, marginTop: 4 }}>
                      {c.type}
                      {c.type === "MINION" ? ` • ${c.attack}/${c.health}` : ""}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                      <button onClick={() => dec(c.id)} disabled={inDeck === 0}>
                        -
                      </button>

                      <span style={{ minWidth: 90 }}>
                        In deck: <b>{inDeck}</b>
                      </span>

                      <button
                        onClick={() => inc(c.id)}
                        disabled={total >= DECK_SIZE}
                      >
                        +
                      </button>

                      {total >= DECK_SIZE && inDeck === 0 && (
                        <span style={{ opacity: 0.7, fontSize: 12 }}>
                          deck full
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Deck List */}
        <div>
          <h3 style={{ marginTop: 0 }}>Deck List</h3>

          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(deckCards).length === 0 && (
              <p style={{ opacity: 0.7 }}>Add cards from the left.</p>
            )}

            {Object.entries(deckCards)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([cid, qty]) => {
                const c = allCards.find((x) => x.id === Number(cid));
                if (!c) return null;

                return (
                  <div
                    key={cid}
                    style={{
                      border: "1px solid #333",
                      padding: 12,
                      borderRadius: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{c.name}</div>
                      <div style={{ opacity: 0.8, fontSize: 13 }}>
                        Cost {c.cost} • {c.type}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 800 }}>x{qty}</span>
                      <button onClick={() => dec(c.id)}>-</button>
                      <button onClick={() => inc(c.id)} disabled={total >= DECK_SIZE}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div style={{ marginTop: 12, opacity: 0.9 }}>
            <p style={{ marginBottom: 6 }}>
              <b>Play rule:</b> You must have exactly <b>{DECK_SIZE}</b> cards to start a match.
            </p>
            {!canSave && (
              <p style={{ marginTop: 0, opacity: 0.75 }}>
                Add {DECK_SIZE - total} more card{DECK_SIZE - total === 1 ? "" : "s"} to enable Save.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
