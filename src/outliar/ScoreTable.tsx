import React from "react";
import { Box, Table, TableBody, TableCell, TableRow } from "@mui/material";

import { GameState } from "./game";
import { Ctx } from "../Client";
import { COLORS } from "./utils";

export function ScoreTable({ G, ctx }: { G: GameState; ctx: Ctx }) {
  return (
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
            <TableCell>{ctx.playerNames[id]}</TableCell>
            <TableCell>
              {G.pub[id].roundScore > 0 ? "+" : ""}
              {G.pub[id].roundScore}
            </TableCell>
            <TableCell>{G.pub[id].score + G.pub[id].roundScore}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ScoreTable;
