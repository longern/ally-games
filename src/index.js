import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  { path: "/dixit", lazy: () => import("./dixit") },
  { path: "/just-chat", lazy: () => import("./just-chat") },
  { path: "/outlier", lazy: () => import("./outlier") },
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
