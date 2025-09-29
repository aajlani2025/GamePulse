import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import App from "./App";
import { MaterialUIControllerProvider } from "./context";

import { Buffer } from "buffer";
import process from "process";
import stream from "stream-browserify";

const root = createRoot(document.getElementById("app"));
window.Buffer = Buffer;
window.process = process;

root.render(
  <HashRouter>
    <MaterialUIControllerProvider>
      <App />
    </MaterialUIControllerProvider>
  </HashRouter>
);
