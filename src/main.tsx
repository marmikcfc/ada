import React from "react";
import ReactDOM from "react-dom/client";
import "../packages/genux-sdk/src/components/FullscreenLayout.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode> // Temporarily commented out
    <App />
  // </React.StrictMode>,
);
