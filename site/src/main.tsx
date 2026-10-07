import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/index.css";

if (import.meta.env.DEV && import.meta.env.VITE_LLM_BACKEND === "mock") {
  const { mockWorker } = await import("./app/mocks/browser");
  await mockWorker.start({ onUnhandledRequest: "bypass" });
}

const InteractionRecordingControls = import.meta.env.DEV
  ? lazy(() => import("./app/interaction-recording/InteractionRecordingControls").then(module => ({ default: module.InteractionRecordingControls })))
  : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {InteractionRecordingControls ? <Suspense fallback={null}><InteractionRecordingControls /></Suspense> : null}
  </StrictMode>,
);
