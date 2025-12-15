import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, getUser } from "../api";
import { makeSocket } from "../socket";
import Card from "../components/Card";

export default function Match() {
  const { matchId } = useParams();
  const nav = useNavigate();
  const me = getUser();

  const socketRef = useRef(null);

  const [state, setState] = useState(null);
  const [err, setErr] = useState("");

  // cache card details by id so UI can show name/cost/atk/hp
  const [cardMap, setCardMap] = useState({}); // { [id]: {id,name,type,cost,attack,health,...} }

  // selected attacker index (your board minion index)
  const [selectedAttacker, setSelectedAttacker] = useState(null);

  function socketEmit(event, payload) {
    const s = socketRef.current;
    if (!s) return;
    s.emit(event, payload);
  }

  // Connect socket + join room + immediately request current state
  useEffect(() => {
    setErr("");
    const socket = makeSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("match:joinRoom", { matchId });
      // immediate pull
      socket.emit("match:sync", { matchId });
    });

    socket.on("match:state", ({ state }) => {
      setState(state);
    });

    socket.on("match:error", ({ error }) => {
      setErr(error);
    });

    socket.on("disconnect", () => {
      // not fatal, but nice to know
      // setErr((prev) => prev || "Disconnected. Reconnecting…");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId]);

  const slot = useMemo(() => {
    if (!state) return null;
    if (state.players?.p1?.userId === me?.id) return "p1";
    if (state.players?.p2?.userId === me?.id) return "p2";
    return null;
  }, [state, me]);

  // While waiting in LOBBY, keep syncing until match becomes ACTIVE/ENDED
  useEffect(() => {
    if (!state) return;
    if (state.status !== "LOBBY") return;

    // pull once immediately
    socketEmit("match:sync", { matchId });

    const t = setInterval(() => {
      socketEmit("match:sync", { matchId });
    }, 1000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status, matchId]);

  // Fetch card details for any ids we see in hands/boards
  useEffect(() => {
    if (!state || state.status === "LOBBY") return;
    const g = state.game;
    if (!g) return;

    const ids = new Set();
    (g.hands?.p1 || []).forEach((id) => ids.add(id));
    (g.hands?.p2 || []).forEach((id) => ids.add(id));
    (g.boards?.p1 || []).forEach((m) => ids.add(m.cardId));
    (g.boards?.p2 || []).forEach((m) => ids.add(m.cardId));

    const missing = [...ids].filter((id) => !cardMap[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(missing.map((id) => api.card(id)));
        if (cancelled) return;

        setCardMap((prev) => {
          const next = { ...prev };
          for (const c of results) next[c.id] = c;
          return next;
        });
      } catch (e) {
        console.warn("Card fetch failed:", e?.message || e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Clear attacker selection when turn/boards change (avoid stale index)
  useEffect(() => {
    setSelectedAttacker(null);
  }, [state?.game?.current, state?.game?.boards]);

  if (!state) return <div style={{ padding: 16 }}>Loading match…</div>;

  // safety: if you aren't one of the players, show message
  if (!slot) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Match</h2>
        <div style={{ color: "tomato" }}>
          You are not a player in this match (or your login expired).
        </div>
        <button style={{ marginTop: 12 }} onClick={() => nav("/lobby")}>
          Back to Lobby
        </button>
      </div>
    );
  }

  // LOBBY view (host should automatically flip to ACTIVE as soon as p2 joins)
  if (state.status === "LOBBY") {
    return (
      <div style={{ padding: 16 }}>
        <h2>Match Lobby</h2>
        <p>
          <b>Match ID:</b> {matchId}
        </p>
        <p>Status: waiting for player 2…</p>
        <p style={{ opacity: 0.8 }}>
          Have another user join this match ID from the Lobby page.
        </p>

        {err && <div style={{ color: "tomato", marginTop: 10 }}>{err}</div>}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => socketEmit("match:sync", { matchId })}>
            Refresh state
          </button>
          <button onClick={() => nav("/lobby")}>Back to Lobby</button>
        </div>
      </div>
    );
  }

  const g = state.game;
  const opp = slot === "p1" ? "p2" : "p1";

  const myHand = g.hands?.[slot] || [];
  const myBoard = g.boards?.[slot] || [];
  const oppBoard = g.boards?.[opp] || [];

  const myTurn = g.current === slot;

  // attack helpers
  const canTargetEnemyMinion = myTurn && selectedAttacker != null;

  function attackEnemyMinion(enemyIndex) {
    if (selectedAttacker == null) return;
    socketEmit("match:attack", {
      matchId,
      attackerIndex: selectedAttacker,
      target: { type: "MINION", index: enemyIndex },
    });
    setSelectedAttacker(null);
  }

  function attackFaceWith(attackerIndex) {
    socketEmit("match:attack", {
      matchId,
      attackerIndex,
      target: { type: "FACE" },
    });
    setSelectedAttacker(null);
  }

  const winner = state.winner; // "p1" or "p2" (from engine)
  const iWon = state.status === "ENDED" && winner && winner === slot;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Match</h2>
          <div style={{ opacity: 0.8, fontSize: 14 }}>Match ID: {matchId}</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              padding: "8px 12px",
              border: "1px solid #333",
              borderRadius: 12,
            }}
          >
            Turn: <b>{g.current}</b>
          </div>
          <button
            disabled={!myTurn || state.status !== "ACTIVE"}
            onClick={() => socketEmit("match:endTurn", { matchId })}
            style={{ padding: "10px 14px", borderRadius: 12 }}
          >
            End Turn
          </button>
        </div>
      </div>

      {err && <div style={{ color: "tomato", marginTop: 10 }}>{err}</div>}

      {/* Opponent area */}
      <div
        style={{
          marginTop: 14,
          border: "1px solid #333",
          borderRadius: 16,
          padding: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Opponent</h3>
          <div style={{ display: "flex", gap: 12 }}>
            <div>
              HP: <b>{g.hp[opp]}</b>
            </div>
            <div style={{ opacity: 0.8 }}>
              Mana: {g.mana[opp]} / {g.maxMana[opp]}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          {oppBoard.map((m, i) => {
            const clickable = canTargetEnemyMinion && state.status === "ACTIVE";
            return (
              <button
                key={i}
                disabled={!clickable}
                onClick={() => attackEnemyMinion(i)}
                style={{
                  border: "1px solid #333",
                  borderRadius: 14,
                  padding: 10,
                  minWidth: 160,
                  background: clickable ? "#2a2a40" : "transparent",
                  color: "white",
                  cursor: clickable ? "pointer" : "default",
                  textAlign: "left",
                }}
                title={clickable ? "Click to attack this minion" : "Select your attacker first"}
              >
                <div style={{ fontWeight: 700 }}>
                  {cardMap[m.cardId]?.name || `Card ${m.cardId}`}
                </div>
                <div style={{ opacity: 0.85, fontSize: 13 }}>
                  ATK <b>{m.atk}</b> • HP <b>{m.hp}</b>
                </div>
                {clickable && (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>Target</div>
                )}
              </button>
            );
          })}

          {oppBoard.length === 0 && <div style={{ opacity: 0.7 }}>No minions</div>}

          {oppBoard.length > 0 && myTurn && selectedAttacker != null && state.status === "ACTIVE" && (
            <div style={{ width: "100%", opacity: 0.85, marginTop: 6 }}>
              Attacker selected. Click an enemy minion to attack it.
            </div>
          )}
        </div>
      </div>

      {/* Your area */}
      <div
        style={{
          marginTop: 14,
          border: "1px solid #333",
          borderRadius: 16,
          padding: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>You ({slot})</h3>
          <div style={{ display: "flex", gap: 12 }}>
            <div>
              HP: <b>{g.hp[slot]}</b>
            </div>
            <div>
              Mana: <b>{g.mana[slot]}</b> / {g.maxMana[slot]}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <h4 style={{ margin: "8px 0" }}>Your Board</h4>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {myBoard.map((m, i) => {
              const isSelected = selectedAttacker === i;
              const faceBlocked = oppBoard.length > 0;

              return (
                <div
                  key={i}
                  style={{
                    border: "1px solid #333",
                    borderRadius: 14,
                    padding: 10,
                    minWidth: 200,
                    opacity: myTurn ? 1 : 0.8,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {cardMap[m.cardId]?.name || `Card ${m.cardId}`}
                  </div>

                  <div style={{ opacity: 0.85, fontSize: 13, marginBottom: 8 }}>
                    ATK <b>{m.atk}</b> • HP <b>{m.hp}</b>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      disabled={!myTurn || !m.canAttack || state.status !== "ACTIVE"}
                      onClick={() => setSelectedAttacker(i)}
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        padding: "8px 10px",
                        border: isSelected ? "2px solid #22c55e" : "1px solid #333",
                      }}
                    >
                      {isSelected ? "Selected" : "Select attacker"}
                    </button>

                    <button
                      disabled={!myTurn || !m.canAttack || faceBlocked || state.status !== "ACTIVE"}
                      onClick={() => attackFaceWith(i)}
                      style={{ flex: 1, borderRadius: 12, padding: "8px 10px" }}
                      title={faceBlocked ? "Clear enemy minions first" : "Attack face"}
                    >
                      Attack face
                    </button>
                  </div>

                  {!m.canAttack && (
                    <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                      (summoning sick)
                    </div>
                  )}

                  {myTurn && isSelected && oppBoard.length > 0 && state.status === "ACTIVE" && (
                    <div style={{ opacity: 0.8, fontSize: 12, marginTop: 6 }}>
                      Now click an enemy minion above to attack it.
                    </div>
                  )}
                </div>
              );
            })}

            {myBoard.length === 0 && <div style={{ opacity: 0.7 }}>No minions</div>}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <h4 style={{ margin: "8px 0" }}>Your Hand</h4>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {myHand.map((cid, i) => (
              <Card
                key={i}
                card={cardMap[cid]}
                disabled={!myTurn || state.status !== "ACTIVE"}
                onPlay={() => socketEmit("match:playCard", { matchId, handIndex: i })}
              />
            ))}
            {myHand.length === 0 && <div style={{ opacity: 0.7 }}>Empty hand</div>}
          </div>
        </div>
      </div>

      {/* Log */}
      <div style={{ marginTop: 16, border: "1px solid #333", padding: 12, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Log</h3>
        <div style={{ maxHeight: 200, overflow: "auto" }}>
          {(g.log || []).slice(-20).map((x, i) => (
            <div key={i}>{x}</div>
          ))}
        </div>
      </div>

      {/* End overlay */}
      {state.status === "ENDED" && winner && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "min(520px, 92vw)",
              border: "1px solid #333",
              borderRadius: 18,
              padding: 18,
              background: "#121218",
              boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>
              {iWon ? "🏆 Victory" : "💀 Defeat"}
            </h2>
            <div style={{ opacity: 0.85, marginBottom: 14 }}>
              Winner: <b>{winner}</b>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => nav("/lobby")} style={{ padding: "10px 14px", borderRadius: 12 }}>
                Back to Lobby
              </button>
              <button
                onClick={() => {
                  // simplest rematch for now: go lobby and create new match
                  nav("/lobby");
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #333",
                }}
              >
                Rematch (new match)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
