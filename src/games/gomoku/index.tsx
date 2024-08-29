import React, { useCallback, useState } from "react";

import { GameBoardProps } from "../../Client";
import { gomoku } from "./game";
import "./index.css";

function Board({ G, ctx, moves, playerID }: GameBoardProps<typeof gomoku>) {
  const [moveDraft, setMoveDraft] = useState<[number, number]>([null, null]);

  const handleClick = useCallback(
    (event: React.PointerEvent) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.floor(((event.clientX - rect.left) / rect.width) * 15);
      const y = Math.floor(((event.clientY - rect.top) / rect.height) * 15);
      switch (event.pointerType) {
        case "touch":
          if (moveDraft[0] === x && moveDraft[1] === y) {
            moves.clickCell([x, y]);
            setMoveDraft([null, null]);
          } else {
            const turnInvalid =
              ctx.numPlayers > 1 &&
              G.currentPlayer !== ctx.playOrder.indexOf(playerID);
            if (G.board[y][x] === null && !turnInvalid) setMoveDraft([x, y]);
            else setMoveDraft([null, null]);
          }
          break;
        default:
          moves.clickCell([x, y]);
          break;
      }
    },
    [G, ctx, playerID, moves, moveDraft]
  );

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
            <defs>
              <radialGradient id="black-gradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#444" />
                <stop offset="100%" stopColor="#111" />
              </radialGradient>
            </defs>
            <defs>
              <radialGradient id="white-gradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#f5f5f5" />
                <stop offset="100%" stopColor="#d5d5d5" />
              </radialGradient>
            </defs>
            <circle cx="6" cy="6" r="5" fill="url(#black-gradient)" />
          </svg>
          <span className="gomoku-player-name">
            {ctx.playerNames[ctx.playOrder[0]] ?? "Black"}
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
            <circle cx="6" cy="6" r="5" fill="url(#white-gradient)" />
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
          onPointerUp={handleClick}
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
                    fill={
                      cell === 1
                        ? "url(#white-gradient)"
                        : "url(#black-gradient)"
                    }
                  />
                )
            )
          )}
          {moveDraft[0] !== null && (
            <circle
              cx={moveDraft[0] + 0.5}
              cy={moveDraft[1] + 0.5}
              r={0.4}
              fill={
                G.currentPlayer === 1
                  ? "url(#white-gradient)"
                  : "url(#black-gradient)"
              }
              fillOpacity="0.5"
            />
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
