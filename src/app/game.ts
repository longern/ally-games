import {
  CaseReducer,
  configureStore,
  createAction,
  createSlice,
  Dispatch,
  MiddlewareAPI,
  PayloadAction,
  StoreEnhancer,
} from "@reduxjs/toolkit";

export type Ctx = {
  numPlayers: number;
  playOrder: string[];
  playerNames: Record<string, string>;
};

export type GameMoveFunction<S = any> = (
  client: { G: S; ctx: Ctx; playerID: string },
  ...args: any[]
) => void;

export type GameMoveFunctions<S = any> = Record<string, GameMoveFunction<S>>;

export interface Game<
  S = any,
  M extends GameMoveFunctions<S> = GameMoveFunctions<S>
> {
  setup: ({ ctx }: { ctx: Ctx }) => S;
  moves: M;
  phases?: Record<
    string,
    {
      moves?: M;
      onBegin?: GameMoveFunction<S>;
      onEnd?: GameMoveFunction<S>;
    }
  >;
  playerView?: (props: { G: S; ctx: Ctx; playerID: string }) => Partial<S>;
  minPlayers?: number;
  maxPlayers?: number;
}

export type GameClientMoves<Moves> = {
  [K in keyof Moves]: (
    ...args: Moves[K] extends (
      client: Parameters<GameMoveFunction>[0],
      ...args: infer I
    ) => void
      ? I
      : never
  ) => void;
};

export function createGame<
  GameState,
  GameMoves extends GameMoveFunctions<GameState>
>(game: Game<GameState, GameMoves>) {
  return game;
}

export function STRIP_SECRET<GameState>({
  G,
  playerID,
}: {
  G: GameState;
  playerID: string;
}) {
  if (typeof G !== "object") return G;
  const stripped = { ...G };
  if ("secret" in stripped) delete stripped.secret;
  if ("players" in stripped) {
    stripped.players = { [playerID]: stripped.players[playerID] };
  }
  return stripped;
}

export type AppState<GameState = any> = {
  state: GameState | null;
  ctx: Ctx | null;
  playerID: string | null;
  chatMessages: any[];
};

export const setup = Object.assign(
  (ctx: Ctx) => {
    return Object.assign(
      (dispatch: Dispatch<BasicAppActions>) => {
        dispatch(clientActions.gameSetup(ctx));
        return () => {};
      },
      { type: setup.type }
    );
  },
  { type: "client/setup" as const }
);

const clientActions = {
  gameSetup: createAction<Ctx, "client/gameSetup">("client/gameSetup"),
  setCtx: createAction<Ctx, "client/setCtx">("client/setCtx"),
  setPlayerID: createAction<string, "client/setPlayerID">("client/setPlayerID"),
  setGameState: createAction<any, "client/setGameState">("client/setGameState"),
  sendChatMessage: createAction<
    [{ playerID: string }, any],
    "client/sendChatMessage"
  >("client/sendChatMessage"),
};

export const { gameSetup, setCtx, setPlayerID, setGameState, sendChatMessage } =
  clientActions;

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

function createGameSlice<G extends Game>({ game }: { game: G }) {
  type S = G extends Game<infer S> ? S : never;
  type M = G extends Game<any, infer M> ? M : never;

  const entries = Object.entries(game.moves) as Entries<M>;
  const gameReducers = Object.fromEntries(
    entries.map(([move, fn]) => [
      move,
      ((state, action) => {
        const oldPhase = game.phases?.[state.state?.["phase"]];
        const { ctx } = state;
        const [{ playerID }, ...args] = action.payload;
        fn({ G: state.state, ctx, playerID }, ...args);
        const G = state.state;
        const newPhase = game.phases?.[G?.["phase"]];
        if (newPhase !== oldPhase) {
          oldPhase?.onEnd?.({ G, ctx, playerID });
          newPhase?.onBegin?.({ G, ctx, playerID });
        }
      }) as CaseReducer<
        AppState<S>,
        PayloadAction<[{ playerID: string }, ...Parameters<typeof fn>]>
      >,
    ])
  );

  const slice = createSlice({
    name: "game",
    initialState: {
      state: null,
      ctx: null,
      playerID: null,
      chatMessages: [],
    } as AppState<S>,
    reducers: gameReducers,
    extraReducers: (builder) => {
      builder.addCase(clientActions.gameSetup, (state, action) => {
        state.ctx = action.payload;
        state.state = game.setup({ ctx: action.payload });
      });

      builder.addCase(clientActions.setCtx, (state, action) => {
        state.ctx = action.payload;
      });

      builder.addCase(clientActions.setPlayerID, (state, action) => {
        state.playerID = action.payload;
      });

      builder.addCase(clientActions.setGameState, (state, action) => {
        state.state = action.payload;
      });

      builder.addCase(clientActions.sendChatMessage, (state, action) => {
        const [{ playerID }, payload] = action.payload;
        state.chatMessages.push({
          id: Math.random().toString(),
          sender: playerID,
          payload: payload,
        });
      });
    },
  });

  return slice;
}

type ActionCreatorsFromGame<G extends Game> = G extends Game<any, infer M>
  ? PayloadAction<any[], `game/${Extract<keyof M, string>}`>
  : never;

type ValueOf<T> = T[keyof T];

type BasicAppActions<G extends Game = Game<any, {}>> =
  | ReturnType<ValueOf<typeof clientActions>>
  | ActionCreatorsFromGame<G>;

export type AppActions<G extends Game = Game<any, {}>> =
  | BasicAppActions<G>
  | ReturnType<typeof setup>;
export type AppDispatch<G extends Game = Game> = Dispatch<AppActions<G>>;

export type AppMiddleware = (
  store: MiddlewareAPI<AppDispatch, AppState>
) => (next: (action: unknown) => unknown) => (action: AppActions) => unknown;

export function createGameStore<G extends Game>({
  game,
  enhancer,
}: {
  game: G;
  enhancer: StoreEnhancer;
}) {
  const slice = createGameSlice({ game });
  const store = configureStore({
    reducer: slice.reducer,
    enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().prepend(enhancer ? [enhancer] : []),
  });

  return { actions: slice.actions as unknown as AppActions<G>, store };
}
