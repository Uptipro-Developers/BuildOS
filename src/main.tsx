import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { initGoogleAnalytics } from "./lib/googleAnalytics";
import { installStaleChunkReload } from "./utils/staleChunkReload";

// Must run before the first lazy route resolves, so a tab left open across a
// deploy recovers instead of dead-ending on a chunk that no longer exists.
installStaleChunkReload();
initGoogleAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
