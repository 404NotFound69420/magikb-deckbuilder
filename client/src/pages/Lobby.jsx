import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function Lobby() {
  const nav = useNavigate();
  const [decks, setDecks] = useState([]);
  const [deckId, setDeckId] = useState("");
  const [matchId, setMatchId] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const res = await api.myDecks();
      setDecks(res.decks);
      if (res.decks[0]) setDeckId(String(res.decks[0].id));
    })();
  }, []);

  async function createMatch() {
    setErr("");
    try {
      const res = await api.createMatch(Number(deckId));
      nav(`/match/${res.matchId}`);
    } catch (e) { setErr(String(e.message || e)); }
  }

  async function joinMatch() {
    setErr("");
    try {
      await api.joinMatch(matchId, Number(deckId));
      nav(`/match/${matchId}`);
    } catch (e) { setErr(String(e.message || e)); }
  }

  return (
    <div>
      <h2>Lobby</h2>

      <div style={{display:"grid", gap:8, maxWidth:520}}>
        <label>
          Select Deck:
          <select value={deckId} onChange={e=>setDeckId(e.target.value)} style={{marginLeft:8}}>
            {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>

        <div style={{display:"flex", gap:8}}>
          <button onClick={createMatch}>Create Match</button>
          <input placeholder="Match ID to join" value={matchId} onChange={e=>setMatchId(e.target.value)} style={{flex:1}} />
          <button onClick={joinMatch}>Join</button>
        </div>

        {err && <div style={{color:"tomato"}}>{err}</div>}
        <p style={{opacity:0.8}}>
          Tip: open another browser/incognito, login as user #2, paste the match ID.
        </p>
      </div>
    </div>
  );
}
