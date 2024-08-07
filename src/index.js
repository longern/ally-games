import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
} from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";

import EnhancerProvider from "./enhancer";
import store from "./app/store";
import router from "./router";

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
        <EnhancerProvider>
          <CssBaseline />
          {globalStyles}
          <RouterProvider router={router} />
        </EnhancerProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
