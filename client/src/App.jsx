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
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Link to="/" style={{ fontWeight: 800, letterSpacing: 0.4 }}>
        Arcane
      </Link>

      {user ? (
        <>
          <Link to="/decks">My Decks</Link>
          <Link to="/lobby">Lobby</Link>

          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ opacity: 0.9 }}>
              Hi, <b>{user.username}</b>
            </span>
            <button
              onClick={() => {
                clearAuth();
                nav("/login");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(34,197,94,0.15)",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Logout
            </button>
          </div>
        </>
      ) : (
        <div style={{ marginLeft: "auto" }}>
          <Link to="/login">Login</Link>{" "}
          <span style={{ opacity: 0.6 }}>|</span>{" "}
          <Link to="/register">Register</Link>
        </div>
      )}
    </div>
  );
}

function RequireAuth({ children }) {
  const user = getUser();
  return user ? children : <Navigate to="/login" replace />;
}

function Home() {
  const user = getUser();

  return (
    <div
      style={{
        padding: "34px 18px 24px",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(59,130,246,0.20), transparent 60%)," +
          "radial-gradient(900px 500px at 80% 0%, rgba(34,197,94,0.14), transparent 55%)," +
          "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.55))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 34, letterSpacing: 0.5 }}>
        Arcane Deckbuilder
      </h1>
      <p style={{ marginTop: 10, opacity: 0.85, maxWidth: 720 }}>
        Build a <b>10-card</b> deck and duel another player with live updates.
      </p>

      {user ? (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              fontWeight: 700,
            }}
          >
            Logged in as {user.username}
          </span>
          <span style={{ opacity: 0.75 }}>
            Tip: build a deck, then host a match from Lobby.
          </span>
        </div>
      ) : (
        <div style={{ marginTop: 14, opacity: 0.85 }}>
          Log in to build decks and play multiplayer.
        </div>
      )}

      {/* Action cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginTop: 26,
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 16,
            background: "rgba(20,20,34,0.65)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>🧙 Build a Deck</div>
          <div style={{ opacity: 0.82, marginTop: 6 }}>
            Create a deck and add card art. Your deck must have exactly 10 cards.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to={user ? "/decks" : "/login"} style={{ fontWeight: 800, color: "#22c55e" }}>
              Go to Decks →
            </Link>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 16,
            background: "rgba(20,20,34,0.65)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>🏟️ Create a Match</div>
          <div style={{ opacity: 0.82, marginTop: 6 }}>
            Host a match and share the ID with a friend.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to={user ? "/lobby" : "/login"} style={{ fontWeight: 800, color: "#22c55e" }}>
              Open Lobby →
            </Link>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 16,
            background: "rgba(20,20,34,0.65)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>⚔️ Join a Match</div>
          <div style={{ opacity: 0.82, marginTop: 6 }}>
            Paste a match ID and jump straight into the duel.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to={user ? "/lobby" : "/login"} style={{ fontWeight: 800, color: "#22c55e" }}>
              Join from Lobby →
            </Link>
          </div>
        </div>
      </div>

      {/* Small “footer” row to make it feel less dead */}
      <div
        style={{
          marginTop: 22,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          opacity: 0.85,
          fontSize: 13,
        }}
      >
        <span>✨ Live matches via Socket.IO</span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span>🃏 Card art from /public/cards</span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span>⚔️ Minions must be cleared before face</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 700px at 50% -10%, rgba(59,130,246,0.18), transparent 60%)," +
          "radial-gradient(900px 600px at 10% 30%, rgba(34,197,94,0.12), transparent 55%)," +
          "linear-gradient(180deg, #0b0b12 0%, #07070d 55%, #05050a 100%)",
        color: "white",
      }}
    >
      <Nav />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/decks"
            element={
              <RequireAuth>
                <Decks />
              </RequireAuth>
            }
          />
          <Route
            path="/decks/:deckId"
            element={
              <RequireAuth>
                <DeckBuilder />
              </RequireAuth>
            }
          />
          <Route
            path="/lobby"
            element={
              <RequireAuth>
                <Lobby />
              </RequireAuth>
            }
          />
          <Route
            path="/match/:matchId"
            element={
              <RequireAuth>
                <Match />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </div>
  );
}
