import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import store from "./app/store";
import App from "./home/App";

const globalStyles = (
  <GlobalStyles
    styles={{
      "html, body, #root": {
        height: "100%",
      },

      img: {
        maxWidth: "100%",
        maxHeight: "100%",
      },
    }}
  />
);

function Root() {
  const preferDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode: preferDarkMode ? "dark" : "light" },
        typography: { button: { textTransform: "none" } },
      }),
    [preferDarkMode]
  );

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {globalStyles}
        <App />
      </ThemeProvider>
    </Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
