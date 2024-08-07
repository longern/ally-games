import React from "react";
import { createBrowserRouter } from "react-router-dom";

import Home from "./home";
import { Game } from "./app/game";
import { useEnhancer } from "./enhancer";
import { Client, GameBoardComponent } from "./Client";

const lazyGameComponents: Record<
  string,
  () => Promise<{ game: Game; Board: GameBoardComponent<Game> }>
> = {
  "/block-blast": () => import("./block-blast"),
  "/dixit": () => import("./dixit"),
  "/just-chat": () => import("./just-chat"),
  "/outliar": () => import("./outliar"),
};

function EnhancedClient<G extends Game>({
  game,
  board,
}: {
  game: G;
  board: GameBoardComponent<G>;
}) {
  const enhancer = useEnhancer();
  return <Client game={game} board={board} enhancer={enhancer} />;
}

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...Object.entries(lazyGameComponents).map(([path, module]) => ({
    path,
    lazy: () =>
      module().then(({ game, Board }) => ({
        element: <EnhancedClient game={game} board={Board} />,
      })),
  })),
]);

export default router;
