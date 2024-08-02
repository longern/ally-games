import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from "@mui/material";
import React from "react";

import game from "./game";
import { COLORS } from "./utils";
import { GameBoardProps } from "../Client";

export function ScoreTable({
  G,
  ctx,
}: Pick<GameBoardProps<typeof game>, "G" | "ctx">) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="score table">
        <TableBody>
          {ctx.playOrder.map((id, index) => (
            <TableRow key={id}>
              <TableCell>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: COLORS[index],
                  }}
                />
              </TableCell>
              <TableCell
                sx={
                  G.players[id].outliarInSight === id
                    ? { color: "red", fontWeight: "bold" }
                    : undefined
                }
              >
                {ctx.playerNames[id]}
              </TableCell>
              <TableCell>
                {G.pub[id].roundScore > 0 ? "+" : ""}
                {G.pub[id].roundScore}
              </TableCell>
              <TableCell>{G.pub[id].score + G.pub[id].roundScore}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ScoreTable;
