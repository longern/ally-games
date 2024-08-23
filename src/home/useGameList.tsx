import React, { useEffect, useState } from "react";
import { Card, CardActionArea, CardContent, Grid } from "@mui/material";

import { lazyGameComponents } from "./router";

const gameListCache = {
  current: null as null | { name: string; pathname: string }[],
};

export function useGameList() {
  const [games, setGames] = useState<{ name: string; pathname: string }[]>([]);

  useEffect(() => {
    if (gameListCache.current) {
      setGames(gameListCache.current);
      return;
    }

    Promise.allSettled(
      Object.keys(lazyGameComponents).map((gamePath) =>
        fetch(`${gamePath}/manifest.json`).then(
          async (res) => [gamePath, await res.json()] as const
        )
      )
    ).then((responses) => {
      const games = responses.flatMap((response) => {
        if (response.status === "rejected") return [];
        const [gamePath, manifest] = response.value;
        return { ...manifest, pathname: gamePath.replace(/^\//, "") };
      });
      gameListCache.current = games;
      setGames(games);
    });
  }, []);

  return games;
}

export function GameGrid({
  games,
  selected,
  onClick,
}: {
  games: { name: string; pathname: string }[];
  selected?: string;
  onClick?: (pathname: string) => void;
}) {
  return (
    <Grid container spacing={3}>
      {games.map((game) => (
        <Grid item key={game.name} xs={6} md={4}>
          <Card elevation={game.pathname === selected ? 8 : 1}>
            <CardActionArea onClick={() => onClick(game.pathname)}>
              <CardContent>{game.name}</CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
