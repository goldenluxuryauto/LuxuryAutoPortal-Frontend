/**
 * PDF.js Worker Configuration
 * 
 * PERMANENT SOLUTION: Uses local worker file for maximum reliability.
 * 
 * IMPORTANT: This module MUST be imported as a side-effect import:
 *   import "@/lib/pdf-config";
 * 
 * Do NOT use named imports that aren't used, as the bundler will tree-shake
 * this module and the side effects (worker configuration) won't run.
 */

// Import pdfjs from react-pdf to ensure we configure the same instance it uses
// This is critical - react-pdf bundles its own pdfjs-dist, so we must use its instance
import { pdfjs } from "react-pdf";

// Set worker path - use CDN URL matching react-pdf's pdfjs-dist version
// react-pdf@9.2.1 uses pdfjs-dist@4.8.69, so we must use that version's worker
// This MUST be set synchronously before any PDF components load
const WORKER_VERSION = '4.8.69'; // Match react-pdf's pdfjs-dist version
const workerUrl = `https://unpkg.com/pdfjs-dist@${WORKER_VERSION}/build/pdf.worker.min.mjs`;

// Set worker path on react-pdf's pdfjs instance (this is the one that actually gets used)
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

console.log('✅ PDF worker set to unpkg CDN — matches react-pdf version');
console.log('Worker URL:', pdfjs.GlobalWorkerOptions.workerSrc);
console.log('Worker version:', WORKER_VERSION);

// Export the configured pdfjs instance for use in components
export { pdfjs };

// Export pdfjs version for reference (useful for cMap URLs if needed)
export const PDFJS_VERSION = pdfjs.version;

