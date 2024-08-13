import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const SETTINGS_LOCAL_STORAGE_KEY = "allyGameSettings";

const localStorageSettings = JSON.parse(
  localStorage.getItem(SETTINGS_LOCAL_STORAGE_KEY) ?? "{}"
);

const DEFAULT_PROTOCOL =
  process.env.NODE_ENV === "production" ? "webrtc" : "broadcast-channel";

const defaultSettings = {
  protocol: DEFAULT_PROTOCOL,
};

const initialState = {
  ...defaultSettings,
  ...localStorageSettings,
} as typeof defaultSettings;

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setSettings(
      state,
      action: PayloadAction<{ value: Partial<typeof initialState> }>
    ) {
      Object.assign(state, action.payload);
    },
  },
});

export function localStorageWriter(slice: typeof initialState) {
  const defaultsRemoved = Object.fromEntries(
    Object.entries(slice).filter(
      ([key, value]) => defaultSettings[key] !== value
    )
  );
  if (Object.keys(defaultsRemoved).length === 0) {
    localStorage.removeItem(SETTINGS_LOCAL_STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    SETTINGS_LOCAL_STORAGE_KEY,
    JSON.stringify(defaultsRemoved)
  );
}

export default settingsSlice;
