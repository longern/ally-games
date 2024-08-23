import React from "react";

import { GameBoardProps } from "../Client";
import { gomoku } from "./game";
import "./index.css";

function Board({ G, ctx, moves }: GameBoardProps<typeof gomoku>) {
  return (
    <div className="gomoku-container">
      <div className="gomoku-info">
        <div
          className={`gomoku-player ${G.currentPlayer === 0 ? "active" : ""}`}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 12 12"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="6" cy="6" r="5" fill="black" />
          </svg>
          <span className="gomoku-player-name">
            {ctx.playerNames[ctx.playOrder[1]] ?? "Black"}
          </span>
        </div>
        <div className="gomoku-status"></div>
        <div
          className={`gomoku-player ${G.currentPlayer === 1 ? "active" : ""}`}
        >
          <span className="gomoku-player-name right">
            {ctx.playerNames[ctx.playOrder[1]] ?? "White"}
          </span>
          <svg
            width="32"
            height="32"
            viewBox="0 0 12 12"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="6" cy="6" r="5" fill="white" />
          </svg>
        </div>
      </div>
      <div
        className="gomoku-board"
        style={{ backgroundImage: `url("/gomoku/wood-pattern.png")` }}
      >
        <svg
          viewBox="0 0 15 15"
          xmlns="http://www.w3.org/2000/svg"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = Math.floor(
              ((event.clientX - rect.left) / rect.width) * 15
            );
            const y = Math.floor(
              ((event.clientY - rect.top) / rect.height) * 15
            );
            moves.clickCell([x, y]);
          }}
        >
          {Array.from({ length: 15 }).map((_, y) => (
            <path
              key={`y-${y}`}
              d={`M0.48 ${y + 0.5} H14.52`}
              stroke="black"
              strokeWidth="0.05"
            />
          ))}
          {Array.from({ length: 15 }).map((_, x) => (
            <path
              key={`x-${x}`}
              d={`M${x + 0.5} 0.48 V14.52`}
              stroke="black"
              strokeWidth="0.05"
            />
          ))}
          {[
            [3, 3],
            [11, 3],
            [3, 11],
            [11, 11],
            [7, 7],
          ].map(([x, y]) => (
            <circle
              key={`${x}-${y}`}
              cx={x + 0.5}
              cy={y + 0.5}
              r={0.1}
              fill="black"
            />
          ))}
          {G.board.map((row, y) =>
            row.map(
              (cell, x) =>
                cell !== null && (
                  <circle
                    key={`${x}-${y}`}
                    cx={x + 0.5}
                    cy={y + 0.5}
                    r={0.4}
                    fill={cell === 1 ? "white" : "black"}
                    stroke="black"
                    strokeWidth="0.05"
                  />
                )
            )
          )}
        </svg>
      </div>
      <div className="gomoku-actions">
        <button disabled={G.winner === null} onClick={() => moves.reset()}>
          Reset
        </button>
      </div>
    </div>
  );
}

export { gomoku as game, Board };
