import { Middleware } from "@reduxjs/toolkit";
import store, { AppState } from "./store";
import { AppDispatch } from "./game";

const lobbyMiddleware: Middleware<{}, AppState, AppDispatch> =
  (store) => (next) => (action) => {
    return next(action);
  };

export default lobbyMiddleware;
