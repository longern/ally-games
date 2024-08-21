import { Game } from "../app/game";
import { GameBoardComponent } from "../Client";

export const lazyGameComponents: Record<
  string,
  () => Promise<{ game: Game; Board: GameBoardComponent<Game> }>
> = {
  "/block-blast": () => import("../block-blast"),
  "/gomoku": () => import("../gomoku"),
  "/dixit": () => import("../dixit"),
  "/just-chat": () => import("../just-chat"),
  "/outliar": () => import("../outliar"),
};
