import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Link, useNavigate } from "react-router-dom";

export default function Decks() {
  const [decks, setDecks] = useState([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function load() {
    const res = await api.myDecks();
    setDecks(res.decks);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setErr("");
    try {
      const deckName = (name || "").trim();
      if (!deckName) {
        setErr("Please enter a deck name.");
        return;
      }
      const res = await api.createDeck(deckName);
      setName("");
      await load(); // refresh list
      nav(`/decks/${res.deck.id}`);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>My Decks</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New deck name (e.g. Goblin Rush)"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid #333" }}
        />
        <button
          onClick={create}
          style={{ padding: "10px 14px", borderRadius: 12 }}
        >
          Create
        </button>
      </div>

      {err && <div style={{ color: "tomato", marginBottom: 10 }}>{err}</div>}

      <ul style={{ marginTop: 0 }}>
        {decks.map((d) => (
          <li key={d.id}>
            <Link to={`/decks/${d.id}`}>{d.name}</Link>
          </li>
        ))}
      </ul>

      <p style={{ opacity: 0.8 }}>
        To play, build a deck with exactly <b>10</b> cards, then go to Lobby.
      </p>
    </div>
  );
}
