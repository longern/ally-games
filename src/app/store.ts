import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import lobbySlice from "./lobby";
import lobbyMiddleware from "./lobbyMiddleware";
import settingsSlice from "./settings";

const combinedReducer = combineReducers({
  lobby: lobbySlice.reducer,
  settings: settingsSlice.reducer,
});

const store = configureStore({
  reducer: combinedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(lobbyMiddleware),
});

export type AppStore = typeof store;
export type AppState = ReturnType<typeof combinedReducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector = useSelector.withTypes<AppState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

export default store;
