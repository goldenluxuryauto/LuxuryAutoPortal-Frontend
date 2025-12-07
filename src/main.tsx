import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// PDF worker is configured in pdf-config.ts - import it to ensure it runs
import "@/lib/pdf-config";

createRoot(document.getElementById("root")!).render(<App />);
