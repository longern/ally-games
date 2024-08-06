import { combineReducers, configureStore } from "@reduxjs/toolkit";

import lobbySlice from "./lobby";
import { useDispatch, useSelector } from "react-redux";
import lobbyMiddleware from "./lobbyMiddleware";

const combinedReducer = combineReducers({
  lobby: lobbySlice.reducer,
});

const store = configureStore({
  reducer: combinedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(lobbyMiddleware),
});

export type AppStore = typeof store;
export type AppState = ReturnType<typeof combinedReducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector = useSelector.withTypes<AppState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

export default store;
