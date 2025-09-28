import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "App";
import { MaterialUIControllerProvider } from "context";

const container = document.getElementById("app"); // ← correspond à ton HTML
const root = createRoot(container);

root.render(
  <HashRouter>
    <MaterialUIControllerProvider>
      <App />
    </MaterialUIControllerProvider>
  </HashRouter>
);
