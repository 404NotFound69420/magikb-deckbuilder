import React from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { getUser, clearAuth } from "./api";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Decks from "./pages/Decks.jsx";
import DeckBuilder from "./pages/DeckBuilder.jsx";
import Lobby from "./pages/Lobby.jsx";
import Match from "./pages/Match.jsx";

function Nav() {
  const user = getUser();
  const nav = useNavigate();
  return (
    <div style={{display:"flex", gap:12, padding:12, borderBottom:"1px solid #333"}}>
      <Link to="/">Home</Link>
      {user ? (
        <>
          <Link to="/decks">My Decks</Link>
          <Link to="/lobby">Lobby</Link>
          <span style={{marginLeft:"auto"}}>Hi, {user.username}</span>
          <button onClick={() => { clearAuth(); nav("/login"); }}>Logout</button>
        </>
      ) : (
        <span style={{marginLeft:"auto"}}>
          <Link to="/login">Login</Link>{" | "}
          <Link to="/register">Register</Link>
        </span>
      )}
    </div>
  );
}

function RequireAuth({ children }) {
  const user = getUser();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div>
      <Nav />
      <div style={{maxWidth: 980, margin:"0 auto", padding:16}}>
        <Routes>
          <Route path="/" element={<div>
            <h2>Arcane Deckbuilder</h2>
            <p>Build a 30-card deck and duel another player with live updates.</p>
          </div>} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/decks" element={<RequireAuth><Decks /></RequireAuth>} />
          <Route path="/decks/:deckId" element={<RequireAuth><DeckBuilder /></RequireAuth>} />
          <Route path="/lobby" element={<RequireAuth><Lobby /></RequireAuth>} />
          <Route path="/match/:matchId" element={<RequireAuth><Match /></RequireAuth>} />
        </Routes>
      </div>
    </div>
  );
}
