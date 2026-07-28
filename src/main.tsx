import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { initGoogleAnalytics } from "./lib/googleAnalytics";

initGoogleAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
