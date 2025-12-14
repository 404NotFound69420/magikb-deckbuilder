import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getUser } from "../api";
import { makeSocket } from "../socket";

export default function Match() {
  const { matchId } = useParams();
  const me = getUser();
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const socket = makeSocket();
    socket.on("connect", () => {
      socket.emit("match:joinRoom", { matchId });
    });
    socket.on("match:state", ({ state }) => setState(state));
    socket.on("match:error", ({ error }) => setErr(error));

    return () => socket.disconnect();
  }, [matchId]);

  const slot = useMemo(() => {
    if (!state) return null;
    if (state.players?.p1?.userId === me?.id) return "p1";
    if (state.players?.p2?.userId === me?.id) return "p2";
    return null;
  }, [state, me]);

  function socketEmit(event, payload) {
    const socket = makeSocket(); // simple approach; for optimization keep one socket in state
    socket.emit(event, payload);
    setTimeout(() => socket.disconnect(), 200); // fire-and-forget
  }

  if (!state) return <div>Loading match…</div>;

  if (state.status === "LOBBY") {
    return (
      <div>
        <h2>Match Lobby</h2>
        <p><b>Match ID:</b> {matchId}</p>
        <p>Status: waiting for player 2…</p>
        <p style={{opacity:0.8}}>Have another user join this match ID from the Lobby page.</p>
      </div>
    );
  }

  const g = state.game;
  const opp = slot === "p1" ? "p2" : "p1";
  const myHand = g.hands[slot] || [];
  const myBoard = g.boards[slot] || [];
  const oppBoard = g.boards[opp] || [];

  return (
    <div>
      <h2>Match</h2>
      <p><b>Match ID:</b> {matchId}</p>
      {err && <div style={{color:"tomato"}}>{err}</div>}

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div style={{border:"1px solid #333", padding:12, borderRadius:12}}>
          <h3>Opponent</h3>
          <p>HP: <b>{g.hp[opp]}</b></p>
          <p>Board:</p>
          <ul>
            {oppBoard.map((m, i) => (
              <li key={i}>#{i} ATK {m.atk} / HP {m.hp}</li>
            ))}
          </ul>
        </div>

        <div style={{border:"1px solid #333", padding:12, borderRadius:12}}>
          <h3>You ({slot})</h3>
          <p>HP: <b>{g.hp[slot]}</b></p>
          <p>Mana: <b>{g.mana[slot]}</b> / {g.maxMana[slot]}</p>
          <p>Turn: <b>{g.current}</b></p>

          <div style={{marginTop:10}}>
            <h4>Your Board</h4>
            <ul>
              {myBoard.map((m, i) => (
                <li key={i}>
                  #{i} ATK {m.atk} / HP {m.hp} {m.canAttack ? "(can attack)" : ""}
                  {" "}
                  <button disabled={!m.canAttack || g.current !== slot} onClick={() => socketEmit("match:attack", { matchId, attackerIndex: i })}>
                    Attack face
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div style={{marginTop:10}}>
            <h4>Your Hand (play by index)</h4>
            <ul>
              {myHand.map((cid, i) => (
                <li key={i}>
                  CardID {cid}{" "}
                  <button disabled={g.current !== slot} onClick={() => socketEmit("match:playCard", { matchId, handIndex: i })}>
                    Play
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button disabled={g.current !== slot} onClick={() => socketEmit("match:endTurn", { matchId })}>
            End Turn
          </button>
        </div>
      </div>

      <div style={{marginTop:16, border:"1px solid #333", padding:12, borderRadius:12}}>
        <h3>Log</h3>
        <div style={{maxHeight:200, overflow:"auto"}}>
          {(g.log || []).slice(-20).map((x, i) => <div key={i}>{x}</div>)}
        </div>
      </div>

      {state.status === "ENDED" && <h2 style={{marginTop:16}}>Game Over</h2>}
    </div>
  );
}
