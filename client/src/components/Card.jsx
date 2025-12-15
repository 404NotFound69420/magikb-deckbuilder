import React, { useState } from "react";
import "./Card.css";

export default function Card({ card, onPlay, disabled }) {
  const [imgOk, setImgOk] = useState(true);

  if (!card) return null;

  // expects: client/public/cards/<id>.png
  const imgSrc = `/cards/${card.id}.png`;

  return (
    <div className={`card ${disabled ? "disabled" : ""}`}>
      <div className="mana">{card.cost}</div>

      <div className="card-body">
        <div className="card-name">{card.name}</div>

        <div className="card-image">
          {imgOk && (
            <img
              src={imgSrc}
              alt={card.name}
              className="card-img"
              onError={() => setImgOk(false)}
            />
          )}
          {!imgOk && <div className="image-placeholder">{card.type}</div>}
        </div>

        {card.type === "MINION" && (
          <div className="stats">
            <span className="atk">⚔ {card.attack}</span>
            <span className="hp">❤ {card.health}</span>
          </div>
        )}
      </div>

      <button className="play-btn" disabled={disabled} onClick={onPlay}>
        Play
      </button>
    </div>
  );
}

