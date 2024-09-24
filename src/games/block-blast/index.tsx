import React, { useCallback, useEffect } from "react";

import { GameBoardProps } from "../../Client";
import game, { PIECES } from "./game";
import "./index.css";

function Piece({
  piece,
  color,
  width,
}: {
  piece: [number, number][];
  color: number;
  width: string;
}) {
  const maxX = piece.reduce((max, [x]) => Math.max(max, x), 0);
  const maxY = piece.reduce((max, [, y]) => Math.max(max, y), 0);

  return (
    <div
      className="piece"
      style={{
        display: "flex",
        width: `calc(${maxX + 1} * ${width})`,
        height: `calc(${maxY + 1} * ${width})`,
        flexDirection: "column",
        gap: "1px",
      }}
    >
      {Array.from({ length: maxY + 1 }).map((_, y) => (
        <div key={y} style={{ display: "flex", flex: 1, gap: "1px" }}>
          {Array.from({ length: maxX + 1 }).map((_, x) => (
            <div
              key={x}
              className={`block block-${color}`}
              style={{
                visibility: piece.some(([px, py]) => px === x && py === y)
                  ? "visible"
                  : "hidden",
              }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Board({ G, moves }: GameBoardProps<typeof game>) {
  const boardRef = React.useRef<HTMLDivElement>(null);
  const pieceDraggingRef = React.useRef<HTMLDivElement>(null);
  const [dragReady, setDragReady] = React.useState(false);
  const [draggingCandidate, setDraggingCandidate] = React.useState<
    number | null
  >(null);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      setDraggingCandidate(null);
      const targetRect = event.currentTarget.getBoundingClientRect();
      moves.placeCandidate(
        draggingCandidate!,
        Math.round(pos.x / targetRect.width),
        Math.round(pos.y / targetRect.height)
      );
      setDragReady(false);
    },
    [draggingCandidate, moves, pos]
  );

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    const pieceDragging = pieceDraggingRef.current!;
    const parentRect = pieceDragging.parentElement!.getBoundingClientRect();
    const pieceElement = pieceDragging.firstElementChild;
    if (!pieceElement) return;
    const pieceRect = pieceElement.getBoundingClientRect();
    setPos({
      x: event.clientX - parentRect.left - pieceRect.width / 2,
      y: event.clientY - parentRect.top - pieceRect.height * (7 / 8),
    });
  }, []);

  useEffect(() => {
    const highscore = localStorage.getItem("block-blast-highscore") ?? "0";
    if (G.score > parseInt(highscore, 10)) {
      localStorage.setItem("block-blast-highscore", G.score.toString());
    }
  }, [G.score]);

  const pieceDragging = (
    <div
      id="piece-dragging"
      ref={pieceDraggingRef}
      style={{ left: pos.x, top: pos.y, opacity: dragReady ? 1 : 0 }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {draggingCandidate !== null && (
        <Piece
          piece={PIECES[G.candidates[draggingCandidate].pieceId]}
          color={G.candidates[draggingCandidate].color}
          width="100%"
        />
      )}
    </div>
  );

  return (
    <div className="black-background">
      <main className="block-blast">
        <div className="container">
          <div className="score">{G.score}</div>
          <div className="board" ref={boardRef}>
            {G.board.map((row, y) => (
              <div key={y} className="board-row">
                {row.map((cell, x) => (
                  <div key={x} className={`board-cell block-${cell}`}>
                    {x === 0 && y === 0 && pieceDragging}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="candidates">
            {G.candidates.map((candidate, i) => (
              <div
                key={i}
                onPointerDown={(e) => {
                  if (candidate === null) return;
                  setDraggingCandidate(i);
                  const pieceDragging = pieceDraggingRef.current!;
                  pieceDragging.setPointerCapture(e.pointerId);
                  setTimeout(() => {
                    setDragReady(true);
                    handlePointerMove(e);
                  }, 0);
                }}
              >
                {candidate !== null && i !== draggingCandidate && (
                  <Piece
                    piece={PIECES[candidate.pieceId]}
                    color={candidate.color}
                    width="19%"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export { game, Board };
