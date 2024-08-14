import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
} from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import store from "./app/store";
import Home from "./home";

const theme = createTheme({
  typography: { button: { textTransform: "none" } },
});

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

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {globalStyles}
        <Home />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
