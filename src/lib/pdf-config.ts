/**
 * PDF.js Worker Configuration
 * 
 * Uses the worker file from the public directory.
 * This ensures the worker is always loaded from the same origin, avoiding
 * all CORS and MIME type issues with CDN workers.
 * 
 * IMPORTANT: This module MUST be imported as a side-effect import:
 *   import "@/lib/pdf-config";
 * 
 * Do NOT use named imports that aren't used, as the bundler will tree-shake
 * this module and the side effects (worker configuration) won't run.
 */

// Use pdfjs-dist directly to override any CDN defaults
import * as pdfjs from "pdfjs-dist";
import { getApiBaseUrl } from "./queryClient";

// Force local worker – this overrides ANY CDN attempt
const workerSrc = `${getApiBaseUrl()}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

// Log the worker source for debugging
if (typeof window !== "undefined") {
  console.log("Worker forced to local:", workerSrc);
}

// Export the configured pdfjs instance for use in components (if needed)
export { pdfjs };

// Export pdfjs version for reference (useful for cMap URLs if needed)
export const PDFJS_VERSION = pdfjs.version;

