import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Link, useNavigate } from "react-router-dom";

export default function Decks() {
  const [decks, setDecks] = useState([]);
  const [name, setName] = useState("My Deck");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function load() {
    const res = await api.myDecks();
    setDecks(res.decks);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr("");
    try {
      const res = await api.createDeck(name);
      nav(`/decks/${res.deck.id}`);
    } catch (e) { setErr(String(e.message || e)); }
  }

  return (
    <div>
      <h2>My Decks</h2>
      <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:12}}>
        <input value={name} onChange={e=>setName(e.target.value)} />
        <button onClick={create}>Create</button>
        {err && <span style={{color:"tomato"}}>{err}</span>}
      </div>
      <ul>
        {decks.map(d => (
          <li key={d.id}><Link to={`/decks/${d.id}`}>{d.name}</Link></li>
        ))}
      </ul>
      <p style={{opacity:0.8}}>To play, build a deck with exactly 30 cards, then go to Lobby.</p>
    </div>
  );
}
