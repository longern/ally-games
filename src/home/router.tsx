import { Game } from "../app/game";
import { GameBoardComponent } from "../Client";

export const lazyGameComponents: Record<
  string,
  () => Promise<{ game: Game; Board: GameBoardComponent<Game> }>
> = {
  "/block-blast": () => import("../games/block-blast"),
  "/gomoku": () => import("../games/gomoku"),
  "/dixit": () => import("../games/dixit"),
  "/just-chat": () => import("../games/just-chat"),
  "/outliar": () => import("../games/outliar"),
};
