import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";

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
      const [cardsRes, deckRes] = await Promise.all([api.cards(), api.getDeck(deckId)]);
      setAllCards(cardsRes.cards);
      setDeck(deckRes.deck);
      const map = {};
      for (const row of deckRes.cards) map[row.cardId] = row.qty;
      setDeckCards(map);
    })();
  }, [deckId]);

  const total = useMemo(() => Object.values(deckCards).reduce((s,n)=>s+n,0), [deckCards]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allCards;
    return allCards.filter(c => c.name.toLowerCase().includes(s) || c.type.toLowerCase().includes(s));
  }, [q, allCards]);

  function inc(cardId) {
    setMsg(""); setErr("");
    setDeckCards(prev => {
      const next = { ...prev };
      const cur = next[cardId] || 0;
      if (total >= 30) return prev;
      next[cardId] = cur + 1;
      return next;
    });
  }

  function dec(cardId) {
    setMsg(""); setErr("");
    setDeckCards(prev => {
      const next = { ...prev };
      const cur = next[cardId] || 0;
      if (cur <= 0) return prev;
      if (cur === 1) delete next[cardId];
      else next[cardId] = cur - 1;
      return next;
    });
  }

  async function save() {
    setErr(""); setMsg("");
    try {
      const cards = Object.entries(deckCards).map(([cardId, qty]) => ({ cardId: Number(cardId), qty }));
      await api.saveDeckCards(deckId, cards);
      setMsg("Saved!");
    } catch (e) { setErr(String(e.message || e)); }
  }

  return (
    <div>
      <h2>Deck Builder</h2>
      {deck && <p><b>{deck.name}</b> — Total cards: <b>{total}/30</b></p>}

      <div style={{display:"flex", gap:8, alignItems:"center", margin:"10px 0"}}>
        <input placeholder="Search cards..." value={q} onChange={e=>setQ(e.target.value)} />
        <button onClick={save}>Save Deck</button>
        {msg && <span style={{color:"lightgreen"}}>{msg}</span>}
        {err && <span style={{color:"tomato"}}>{err}</span>}
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div>
          <h3>All Cards</h3>
          <div style={{display:"grid", gap:8}}>
            {filtered.map(c => (
              <div key={c.id} style={{border:"1px solid #333", padding:10, borderRadius:10}}>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <b>{c.name}</b>
                  <span>Cost {c.cost}</span>
                </div>
                <div style={{opacity:0.85}}>{c.type}{c.type==="MINION" ? ` • ${c.attack}/${c.health}` : ""}</div>
                <div style={{display:"flex", gap:6, marginTop:8}}>
                  <button onClick={()=>dec(c.id)}>-</button>
                  <span>In deck: {deckCards[c.id] || 0}</span>
                  <button onClick={()=>inc(c.id)}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>Deck List</h3>
          <div style={{display:"grid", gap:8}}>
            {Object.entries(deckCards).length === 0 && <p style={{opacity:0.7}}>Add cards from the left.</p>}
            {Object.entries(deckCards).map(([cid, qty]) => {
              const c = allCards.find(x => x.id === Number(cid));
              if (!c) return null;
              return (
                <div key={cid} style={{border:"1px solid #333", padding:10, borderRadius:10}}>
                  <div style={{display:"flex", justifyContent:"space-between"}}>
                    <b>{c.name}</b>
                    <span>x{qty}</span>
                  </div>
                  <div style={{opacity:0.85}}>Cost {c.cost} • {c.type}</div>
                </div>
              );
            })}
          </div>

          <div style={{marginTop:12, opacity:0.85}}>
            <p><b>Play rule:</b> You must have exactly <b>30</b> cards to start a match.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
