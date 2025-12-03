/**
 * PDF.js Worker Configuration
 * 
 * Uses CDN worker for reliability. The backend worker path can have MIME type issues.
 * 
 * IMPORTANT: This module MUST be imported as a side-effect import:
 *   import "@/lib/pdf-config";
 * 
 * Do NOT use named imports that aren't used, as the bundler will tree-shake
 * this module and the side effects (worker configuration) won't run.
 */

// Use pdfjs-dist directly
import * as pdfjs from "pdfjs-dist";

// Use CDN worker - more reliable than local worker due to MIME type issues
// Using unpkg CDN which serves correct MIME types
const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

// Log the worker source for debugging
if (typeof window !== "undefined") {
  console.log("PDF.js Worker configured:", workerSrc);
}

// Export the configured pdfjs instance for use in components (if needed)
export { pdfjs };

// Export pdfjs version for reference (useful for cMap URLs if needed)
export const PDFJS_VERSION = pdfjs.version;

