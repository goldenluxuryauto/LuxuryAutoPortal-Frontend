import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Configure PDF.js worker early - ensures it's set before any PDF components render
// Use pdfjs-dist directly to override any CDN defaults
import * as pdfjs from "pdfjs-dist";
import { getApiBaseUrl } from "@/lib/queryClient";

// Force local worker – this overrides ANY CDN attempt
const workerSrc = `${getApiBaseUrl()}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

console.log("Worker forced to local:", workerSrc);

createRoot(document.getElementById("root")!).render(<App />);
