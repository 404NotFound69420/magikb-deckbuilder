import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getUser } from "../api";
import { makeSocket } from "../socket";
import Card from "../components/Card";

export default function Match() {
  const { matchId } = useParams();
  const me = getUser();

  const socketRef = useRef(null);

  const [state, setState] = useState(null);
  const [err, setErr] = useState("");

  // cache card details by id so UI can show name/cost/atk/hp
  const [cardMap, setCardMap] = useState({}); // { [id]: {id,name,type,cost,attack,health,...} }

  // NEW: selected attacker index (your board minion index)
  const [selectedAttacker, setSelectedAttacker] = useState(null);

  useEffect(() => {
    const socket = makeSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("match:joinRoom", { matchId });
    });

    socket.on("match:state", ({ state }) => setState(state));
    socket.on("match:error", ({ error }) => setErr(error));

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

  function socketEmit(event, payload) {
    const s = socketRef.current;
    if (!s) return;
    s.emit(event, payload);
  }

  // When we see card ids in hand/board, fetch their details (once)
  useEffect(() => {
    if (!state || state.status !== "ACTIVE") return;

    const g = state.game;
    if (!g) return;

    const ids = new Set();

    // hands are card IDs
    (g.hands?.p1 || []).forEach((id) => ids.add(id));
    (g.hands?.p2 || []).forEach((id) => ids.add(id));

    // boards store { cardId, atk, hp, ... }
    (g.boards?.p1 || []).forEach((m) => ids.add(m.cardId));
    (g.boards?.p2 || []).forEach((m) => ids.add(m.cardId));

    const missing = [...ids].filter((id) => !cardMap[id]);
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(missing.map((id) => api.card(id)));
        if (cancelled) return;

        const next = { ...cardMap };
        for (const c of results) next[c.id] = c;
        setCardMap(next);
      } catch (e) {
        console.warn("Card fetch failed:", e?.message || e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // NEW: if turn changes or board changes, clear selection (avoids stale attacker)
  useEffect(() => {
    setSelectedAttacker(null);
  }, [state?.game?.current, state?.game?.boards]);

  if (!state) return <div>Loading match…</div>;

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
      </div>
    );
  }

  const g = state.game;
  const opp = slot === "p1" ? "p2" : "p1";

  const myHand = g.hands?.[slot] || [];
  const myBoard = g.boards?.[slot] || [];
  const oppBoard = g.boards?.[opp] || [];

  const myTurn = g.current === slot;

  // NEW: attack helpers
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

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
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
            disabled={!myTurn}
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
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
            const clickable = canTargetEnemyMinion;
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
                title={
                  clickable
                    ? "Click to attack this minion"
                    : "Select one of your minions as attacker first"
                }
              >
                <div style={{ fontWeight: 700 }}>
                  {cardMap[m.cardId]?.name || `Card ${m.cardId}`}
                </div>
                <div style={{ opacity: 0.85, fontSize: 13 }}>
                  ATK <b>{m.atk}</b> • HP <b>{m.hp}</b>
                </div>
                {clickable && (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    Target
                  </div>
                )}
              </button>
            );
          })}

          {oppBoard.length === 0 && <div style={{ opacity: 0.7 }}>No minions</div>}

          {oppBoard.length > 0 && myTurn && selectedAttacker != null && (
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
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
                      disabled={!myTurn || !m.canAttack}
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
                      disabled={!myTurn || !m.canAttack || faceBlocked}
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

                  {myTurn && isSelected && oppBoard.length > 0 && (
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
                card={cardMap[cid]} // may be undefined at first (Card should handle it)
                disabled={!myTurn}
                onPlay={() => socketEmit("match:playCard", { matchId, handIndex: i })}
              />
            ))}

            {myHand.length === 0 && <div style={{ opacity: 0.7 }}>Empty hand</div>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #333", padding: 12, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Log</h3>
        <div style={{ maxHeight: 200, overflow: "auto" }}>
          {(g.log || []).slice(-20).map((x, i) => (
            <div key={i}>{x}</div>
          ))}
        </div>
      </div>

      {state.status === "ENDED" && <h2 style={{ marginTop: 16 }}>Game Over</h2>}
    </div>
  );
}
