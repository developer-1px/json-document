import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/index.css";

if (import.meta.env.DEV && import.meta.env.VITE_LLM_BACKEND === "mock") {
  const { mockWorker } = await import("./app/mocks/browser");
  await mockWorker.start({ onUnhandledRequest: "bypass" });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
