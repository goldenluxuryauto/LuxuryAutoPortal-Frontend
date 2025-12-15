import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import SignatureCanvas from "react-signature-canvas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PenTool, Type, Check, X } from "lucide-react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// ============================================================================
// Zod Validation Schema
// ============================================================================

const contractFormSchema = z.object({
  owner: z.string().min(1, "Owner name is required").max(20, "Max 20 characters"),
  firstName: z.string().min(1, "First name is required").max(50, "First name must be 50 characters or less"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name must be 50 characters or less"),
  phone: z.string().min(1, "Phone number is required").max(20, "Phone number must be 20 characters or less"),
  email: z.string().min(1, "Email is required").email("Invalid email format").max(100, "Email must be 100 characters or less"),
  vehicleMake: z.string().min(1, "Vehicle make is required").max(50, "Vehicle make must be 50 characters or less"),
  vehicleModel: z.string().min(1, "Vehicle model is required").max(50, "Vehicle model must be 50 characters or less"),
  vehicleTrim: z.string().max(50, "Vehicle trim must be 50 characters or less").optional().or(z.literal("")),
  exteriorColor: z.string().min(1, "Exterior color is required").max(30, "Exterior color must be 30 characters or less"),
  interiorColor: z.string().max(30, "Interior color must be 30 characters or less").optional().or(z.literal("")),
  licensePlate: z.string().min(1, "License plate is required").max(20, "License plate must be 20 characters or less"),
  vin: z.string().min(1, "VIN number is required").max(17, "VIN must be 17 characters or less"),
  modelYear: z.string().min(1, "Year is required").max(4, "Year must be 4 characters or less"),
  fuelType: z.string().max(20, "Fuel type must be 20 characters or less").optional().or(z.literal("")),
  expectedStartDate: z.string().optional().or(z.literal("")),
  vehicleMileage: z.string().max(10, "Mileage must be 10 characters or less").optional().or(z.literal("")),
  contractDate: z.string().min(1, "Contract date is required"),
  vehicleOwner: z.string().min(1, "Vehicle owner is required").max(50, "Vehicle owner must be 50 characters or less"),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

// ============================================================================
// TEXT WRAPPING UTILITY
// ============================================================================

/**
 * Wraps text into multiple lines with word-aware splitting
 * Splits at spaces when possible, otherwise at character limit
 * @param text - The text to wrap
 * @param maxCharsPerLine - Maximum characters per line (default 20)
 * @returns Array of text lines
 */
function wrapText(text: string, maxCharsPerLine: number = 20): string[] {
  if (!text || text.length <= maxCharsPerLine) {
    return [text];
  }

  const lines: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxCharsPerLine) {
      lines.push(remainingText);
      break;
    }

    // Try to break at a space within the limit
    let breakPoint = maxCharsPerLine;
    const substring = remainingText.substring(0, maxCharsPerLine + 1);
    const lastSpaceIndex = substring.lastIndexOf(' ');

    if (lastSpaceIndex > 0 && lastSpaceIndex >= maxCharsPerLine * 0.5) {
      // Break at space if it's not too early (at least 50% of max length)
      breakPoint = lastSpaceIndex;
    }

    lines.push(remainingText.substring(0, breakPoint).trim());
    remainingText = remainingText.substring(breakPoint).trim();
  }

  return lines;
}

// ============================================================================
// PDF FIELD COORDINATES CONFIGURATION
// ============================================================================
// Replace the coordinates below with your exact PDF template coordinates.
// 
// PDF Coordinate System:
// - Origin (0,0) is at the BOTTOM-LEFT corner of the page
// - X increases to the RIGHT
// - Y increases UPWARD
// - Page numbers are 1-based (first page = 1)
//
// To find coordinates:
// 1. Open your PDF in a PDF editor (Adobe Acrobat, PDF-XChange, etc.)
// 2. Use the measurement tool or coordinate display
// 3. Note the X,Y position of each blank field
//
// Format: { fieldName: { page: number, x: number, y: number } }
// ============================================================================
const PDF_FIELD_COORDINATES: Record<string, { page: number; x: number; y: number }> = {
  // Owner information - exact coordinates as specified
  owner: { page: 1, x: 300, y: 618 },
  firstName: { page: 1, x: 144, y: 386 },
  lastName: { page: 1, x: 360, y: 386 },
  phone: { page: 1, x: 144, y: 361 }, // Mobile Phone Number
  email: { page: 1, x: 360, y: 361 },
  
  // Vehicle information - exact coordinates as specified
  vehicleMake: { page: 1, x: 114, y: 311 },
  vehicleModel: { page: 1, x: 300, y: 311 },
  vehicleTrim: { page: 1, x: 440, y: 311 },
  exteriorColor: { page: 1, x: 150, y: 282 },
  interiorColor: { page: 1, x: 330, y: 282 },
  licensePlate: { page: 1, x: 470, y: 282 },
  vin: { page: 1, x: 105, y: 256 },
  modelYear: { page: 1, x: 290, y: 256 }, // Year
  fuelType: { page: 1, x: 455, y: 256 },
  
  // Additional contract fields - exact coordinates as specified
  expectedStartDate: { page: 2, x: 170, y: 496 },
  vehicleMileage: { page: 3, x: 190, y: 191 },
  contractDate: { page: 11, x: 260, y: 343 },
  vehicleOwner: { page: 11, x: 345, y: 263 },
};

// Signature coordinates - exact position on Page 11
const SIGNATURE_COORDINATES = {
  page: 11, // Page 11 as specified
  x: 340, // Exact X coordinate
  y: 132, // Exact Y coordinate (PDF coordinate system: bottom-left origin)
  dateX: 340, // X position for date (next to signature)
  dateY: 100, // Y position for date (below signature)
};
// ============================================================================

/**
 * Renders typed signature text in Dancing Script font to a canvas image
 * @param text - The signature text to render
 * @returns Promise<string> - Base64 data URL of the signature image
 */
async function renderTypedSignatureAsImage(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Set canvas size (adjust as needed)
    canvas.width = 400;
    canvas.height = 100;

    // Set font style - Dancing Script, 24pt
    ctx.font = "24pt 'Dancing Script', cursive";
    ctx.fillStyle = "black";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Measure text to center it
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const x = (canvas.width - textWidth) / 2;
    const y = canvas.height / 2;

    // Draw the text
    ctx.fillText(text, x, y);

    // Convert to base64 image
    const dataUrl = canvas.toDataURL("image/png");
    resolve(dataUrl);
  });
}

// ============================================================================

interface FormField {
  name: string;
  label: string;
  value: string;
  required: boolean;
  type?: "text" | "email" | "tel" | "date";
  error?: string;
  maxLength?: number;
}

interface ContractFormFillerProps {
  pdfUrl: string;
  onboardingData: any;
  onSubmit: (signedPdfBlob: Blob, signatureType: "typed" | "drawn") => Promise<void>;
  onDecline?: () => void;
}

export function ContractFormFiller({
  pdfUrl,
  onboardingData,
  onSubmit,
  onDecline,
}: ContractFormFillerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0); // Initial zoom at 100%
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [drawnSignatureDataUrl, setDrawnSignatureDataUrl] = useState<string | null>(null); // For real-time overlay
  
  // No longer need filled PDF bytes or display URL for real-time preview
  // We'll render text overlays on top of the static PDF instead
  
  // Use refs to store latest values without causing re-renders
  const formFieldsRef = useRef<FormField[]>([]);
  const signatureTypeRef = useRef<"typed" | "drawn">("typed");
  const typedNameRef = useRef<string>("");
  const signatureCanvasRef = useRef<SignatureCanvas>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map()); // Track page divs for overlay positioning
  
  // Form fields - mapped to exact PDF coordinates with validation
  const [formFields, setFormFields] = useState<FormField[]>([
    // Owner information
    { name: "owner", label: "Owner Name", value: onboardingData ? `${onboardingData.firstNameOwner || ""} ${onboardingData.lastNameOwner || ""}`.trim() : "", required: true, maxLength: 20 },
    { name: "firstName", label: "First Name", value: onboardingData?.firstNameOwner || "", required: true, maxLength: 50 },
    { name: "lastName", label: "Last Name", value: onboardingData?.lastNameOwner || "", required: true, maxLength: 50 },
    { name: "phone", label: "Mobile Phone Number", value: onboardingData?.phoneOwner || "", required: true, type: "tel", maxLength: 20 },
    { name: "email", label: "Email", value: onboardingData?.emailOwner || "", required: true, type: "email", maxLength: 100 },
    
    // Vehicle information
    { name: "vehicleMake", label: "Vehicle Make", value: onboardingData?.vehicleMake || "", required: true, maxLength: 50 },
    { name: "vehicleModel", label: "Vehicle Model", value: onboardingData?.vehicleModel || "", required: true, maxLength: 50 },
    { name: "vehicleTrim", label: "Vehicle Trim", value: onboardingData?.vehicleTrim || "", required: false, maxLength: 50 },
    { name: "exteriorColor", label: "Exterior Color", value: onboardingData?.exteriorColor || "", required: true, maxLength: 30 },
    { name: "interiorColor", label: "Interior Color", value: onboardingData?.interiorColor || "", required: false, maxLength: 30 },
    { name: "licensePlate", label: "License Plate", value: onboardingData?.licensePlate || "", required: true, maxLength: 20 },
    { name: "vin", label: "VIN Number", value: onboardingData?.vinNumber || "", required: true, maxLength: 17 },
    { name: "modelYear", label: "Year", value: onboardingData?.vehicleYear || "", required: true, maxLength: 4 },
    { name: "fuelType", label: "Fuel Type", value: onboardingData?.fuelType || "", required: false, maxLength: 20 },
    
    // Additional contract fields
    { name: "expectedStartDate", label: "Expected Start Date", value: onboardingData?.expectedStartDate || "", required: false, type: "date" },
    { name: "vehicleMileage", label: "Vehicle Mileage", value: onboardingData?.vehicleMiles || "", required: false, maxLength: 10 },
    { name: "contractDate", label: "Contract Date", value: new Date().toLocaleDateString(), required: true },
    { name: "vehicleOwner", label: "Vehicle Owner", value: onboardingData ? `${onboardingData.firstNameOwner || ""} ${onboardingData.lastNameOwner || ""}`.trim() : "", required: true, maxLength: 50 },
  ]);

  // Signature state
  const [signatureType, setSignatureType] = useState<"typed" | "drawn">("typed");
  const [typedName, setTypedName] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { toast } = useToast();
  
  // Keep refs in sync with state
  useEffect(() => {
    formFieldsRef.current = formFields;
  }, [formFields]);
  
  useEffect(() => {
    signatureTypeRef.current = signatureType;
  }, [signatureType]);
  
  useEffect(() => {
    typedNameRef.current = typedName;
  }, [typedName]);

  // Load PDF bytes - keep the original PDF static, never reload it
  useEffect(() => {
    async function loadPdf() {
      try {
        const response = await fetch(pdfUrl);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setPdfBytes(bytes);
      } catch (error) {
        console.error("Error loading PDF:", error);
        toast({
          title: "Error",
          description: "Failed to load contract template",
          variant: "destructive",
        });
      }
    }
    loadPdf();
  }, [pdfUrl, toast]);
  
  // Memoize Document options to prevent unnecessary reloads
  const documentOptions = useMemo(() => ({
    cMapPacked: true,
    httpHeaders: { "Accept": "application/pdf" },
  }), []);

  // No real-time PDF update - we'll use HTML overlays instead
  // This prevents the PDF from reloading on every keystroke
  
  // Store page dimensions for coordinate conversion
  const [pageDimensions, setPageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  
  // Convert PDF coordinates to screen coordinates
  // PDF uses bottom-left origin (0,0), screen uses top-left origin
  // PDF.js Page component reports dimensions in PDF points (72 DPI)
  const pdfToScreenCoords = useCallback((pdfX: number, pdfY: number, page: number) => {
    const dims = pageDimensions.get(page);
    if (!dims) return { x: 0, y: 0 };
    
    // PDF coordinate system: (0,0) at bottom-left, Y increases upward
    // Screen coordinate system: (0,0) at top-left, Y increases downward
    // The Page component scales everything by 'scale' prop
    const screenX = pdfX * scale;
    const screenY = (dims.height - pdfY) * scale; // Flip Y axis and scale
    
    return { x: screenX, y: screenY };
  }, [pageDimensions, scale]);
  
  // Handle page load to get original PDF dimensions (before scaling)
  const handlePageLoadSuccess = useCallback((page: any, pageNumber: number) => {
    // page.originalWidth and page.originalHeight give us the PDF page size in points
    const { originalWidth, originalHeight } = page;
    setPageDimensions(prev => {
      const newMap = new Map(prev);
      newMap.set(pageNumber, { width: originalWidth, height: originalHeight });
      return newMap;
    });
  }, []);
  
  // Handle signature canvas end (when user finishes drawing) - capture for real-time overlay
  const handleSignatureEnd = useCallback(() => {
    if (signatureCanvasRef.current && !signatureCanvasRef.current.isEmpty()) {
      const dataUrl = signatureCanvasRef.current.toDataURL("image/png");
      setDrawnSignatureDataUrl(dataUrl);
    }
  }, []);

  const handleFieldChange = (name: string, value: string) => {
    console.log('handleFieldChange', name, value);
    setFormFields((prev) =>
      prev.map((field) => (field.name === name ? { ...field, value, error: undefined } : field))
    );
  };

  // Validate a single field
  const validateField = (name: string, value: string): string | undefined => {
    try {
      const fieldSchema = contractFormSchema.shape[name as keyof ContractFormData];
      if (fieldSchema) {
        fieldSchema.parse(value);
      }
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message;
      }
      return undefined;
    }
  };

  // Handle field blur for validation
  const handleFieldBlur = (name: string, value: string) => {
    const error = validateField(name, value);
    setFormFields((prev) =>
      prev.map((field) => (field.name === name ? { ...field, error } : field))
    );
  };

  // Format date as mm/dd/yyyy for expectedStartDate
  const formatDateMMDDYYYY = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleDateChange = (name: string, value: string) => {
    // For date fields, format as mm/dd/yyyy
    const formattedValue = formatDateMMDDYYYY(value);
    setFormFields((prev) =>
      prev.map((field) => (field.name === name ? { ...field, value: formattedValue, error: undefined } : field))
    );
  };

  // Calculate dynamic X position for Owner Name based on length
  // Character width: ~8pt for Arial 12pt font
  const calculateOwnerNameX = (ownerName: string): number => {
    const baseX = 340; // Standard starting position
    const length = ownerName.length;
    const charWidth = 8; // 8pt character width for Arial 12pt
    
    if (length <= 15) {
      return baseX;
    }
    // Shift left by charWidth (8pt) per character over 15
    const shift = (length - 15) * charWidth;
    return baseX - shift;
  };

  const validateForm = (): boolean => {
    // Validate all fields with Zod
    const formData: Record<string, string> = {};
    formFields.forEach((field) => {
      formData[field.name] = field.value;
    });

    try {
      contractFormSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Update form fields with errors
        const errorMap = new Map(error.errors.map((err) => [err.path[0] as string, err.message]));
        setFormFields((prev) =>
          prev.map((field) => ({
            ...field,
            error: errorMap.get(field.name),
          }))
        );

        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form",
          variant: "destructive",
        });
        return false;
      }
    }

    // Check signature
    if (signatureType === "typed" && !typedName.trim()) {
      toast({
        title: "Signature Required",
        description: "Please type your full name to sign",
        variant: "destructive",
      });
      return false;
    }

    if (signatureType === "drawn" && signatureCanvasRef.current?.isEmpty()) {
      toast({
        title: "Signature Required",
        description: "Please draw your signature",
        variant: "destructive",
      });
      return false;
    }

    // Check agreement
    if (!agreeToTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const generateSignedPdf = async (): Promise<Blob> => {
    if (!pdfBytes) throw new Error("PDF not loaded");

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    // Font size: 12pt to match preview (was 11pt, causing misalignment)
    const fontSize = 12;
    const lineHeight = 14; // 14pt line height for 12pt font
    const textColor = rgb(0, 0, 0);

    // Fill each field with user input at exact coordinates from configuration
    // Use same logic as preview: dynamic X for owner, wrapping for long text
    formFields.forEach((field) => {
      if (field.value && field.value.trim() && PDF_FIELD_COORDINATES[field.name]) {
        const pos = PDF_FIELD_COORDINATES[field.name];
        // Ensure page index is valid (0-based)
        const pageIndex = pos.page - 1;
        if (pageIndex >= 0 && pageIndex < pages.length) {
          const targetPage = pages[pageIndex];
          
          // Calculate dynamic X for owner name (same as preview)
          const dynamicX = field.name === "owner" ? calculateOwnerNameX(field.value.trim()) : pos.x;
          
          // Wrap text if longer than 20 characters (same as preview)
          const lines = wrapText(field.value.trim(), 20);
          
          // Draw each line with proper spacing
          lines.forEach((line, index) => {
            targetPage.drawText(line, {
              x: dynamicX,
              y: pos.y - (index * lineHeight), // Move down for each line
              size: fontSize,
              font: helveticaFont,
              color: textColor,
            });
          });
        }
      }
    });

    // Add signature at exact coordinates from configuration
    const signaturePageIndex = SIGNATURE_COORDINATES.page - 1;
    const signaturePage = signaturePageIndex >= 0 && signaturePageIndex < pages.length 
      ? pages[signaturePageIndex] 
      : pages[pages.length - 1]; // Fallback to last page if invalid
    const signatureX = SIGNATURE_COORDINATES.x;
    const signatureY = SIGNATURE_COORDINATES.y;

    if (signatureType === "typed" && typedName.trim()) {
      // Render typed signature as image with Dancing Script font (24pt)
      const signatureImageDataUrl = await renderTypedSignatureAsImage(typedName);
      const signatureImage = await pdfDoc.embedPng(signatureImageDataUrl);
      const signatureDims = signatureImage.scale(0.5); // Scale to fit
      signaturePage.drawImage(signatureImage, {
        x: signatureX,
        y: signatureY,
        width: signatureDims.width,
        height: signatureDims.height,
      });
    } else if (signatureType === "drawn" && signatureCanvasRef.current) {
      // Embed drawn signature as image
      const signatureDataUrl = signatureCanvasRef.current.toDataURL("image/png");
      if (signatureDataUrl && !signatureCanvasRef.current.isEmpty()) {
        const signatureImage = await pdfDoc.embedPng(signatureDataUrl);
        const signatureDims = signatureImage.scale(0.3);
        signaturePage.drawImage(signatureImage, {
          x: signatureX,
          y: signatureY,
          width: signatureDims.width,
          height: signatureDims.height,
        });
      }
    }

    // Add date at exact coordinates from configuration
    const today = new Date().toLocaleDateString();
    signaturePage.drawText(`Date: ${today}`, {
      x: SIGNATURE_COORDINATES.dateX,
      y: SIGNATURE_COORDINATES.dateY,
      size: fontSize,
      font: helveticaFont,
      color: textColor,
    });

    const pdfBytesResult = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytesResult)], { type: "application/pdf" });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      const signedPdfBlob = await generateSignedPdf();
      await onSubmit(signedPdfBlob, signatureType);
      toast({
        title: "Success!",
        description: "Thank you – agreement signed!",
      });
    } catch (error: any) {
      console.error("Error signing contract:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign contract",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Add Dancing Script font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
        {/* Left 2/3: Full-Size PDF Preview */}
        <div className="flex-[2] flex flex-col bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] rounded-lg border-2 border-[#EAEB80]/30 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-[#EAEB80]/20 flex items-center justify-between bg-[#1a1a1a]">
            <h3 className="text-[#EAEB80] font-semibold text-lg">Contract Preview</h3>
            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm">
                {numPages} {numPages === 1 ? 'page' : 'pages'}
              </span>
            </div>
          </div>

          {/* Scrollable PDF Viewer - All Pages in Continuous Scroll */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                  <div className="flex items-center justify-center h-[600px]">
                    <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
                  </div>
                }
                options={documentOptions}
              >
                {Array.from(new Array(numPages), (el, index) => {
                  const pageNumber = index + 1;
                  return (
                    <div key={`page_${pageNumber}`} className="relative bg-white shadow-lg">
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        onLoadSuccess={(page) => handlePageLoadSuccess(page, pageNumber)}
                      />
                      
                      {/* Text overlays for real-time preview */}
                      {/* Text overlays for form fields with wrapping support */}
                      {formFields.map((field) => {
                        const coords = PDF_FIELD_COORDINATES[field.name];
                        if (!coords || coords.page !== pageNumber || !field.value) return null;
                        
                        // Calculate dynamic X for owner name
                        const dynamicX = field.name === "owner" ? calculateOwnerNameX(field.value) : coords.x;
                        
                        // Wrap text if longer than 20 characters
                        const lines = wrapText(field.value, 20);
                        const lineHeight = 14; // 14pt line height for 12pt font
                        
                        return (
                          <div key={field.name}>
                            {lines.map((line, lineIndex) => {
                              const screenCoords = pdfToScreenCoords(
                                dynamicX, 
                                coords.y - (lineIndex * lineHeight), 
                                pageNumber
                              );
                              
                              return (
                                <div
                                  key={`${field.name}-line-${lineIndex}`}
                                  className="absolute pointer-events-none"
                                  style={{
                                    left: `${screenCoords.x}px`,
                                    top: `${screenCoords.y}px`,
                                    fontSize: `${12 * scale}px`, // 12pt font
                                    fontFamily: 'Arial, Helvetica, sans-serif',
                                    color: 'black',
                                    whiteSpace: 'nowrap',
                                    transform: 'translateY(-50%)',
                                  }}
                                >
                                  {line}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                      
                      {/* Signature overlay for real-time preview */}
                      {SIGNATURE_COORDINATES.page === pageNumber && (
                        <>
                          {/* Typed signature overlay */}
                          {signatureType === "typed" && typedName && (
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                left: `${pdfToScreenCoords(SIGNATURE_COORDINATES.x, SIGNATURE_COORDINATES.y, pageNumber).x}px`,
                                top: `${pdfToScreenCoords(SIGNATURE_COORDINATES.x, SIGNATURE_COORDINATES.y, pageNumber).y}px`,
                                fontSize: `${24 * scale}px`,
                                fontFamily: "'Dancing Script', cursive",
                                color: 'black',
                                fontStyle: 'italic',
                                whiteSpace: 'nowrap',
                                transform: 'translateY(-50%)',
                              }}
                            >
                              {typedName}
                            </div>
                          )}
                          
                          {/* Drawn signature overlay - display as image */}
                          {signatureType === "drawn" && drawnSignatureDataUrl && (
                            <img
                              src={drawnSignatureDataUrl}
                              alt="Signature"
                              className="absolute pointer-events-none"
                              style={{
                                left: `${pdfToScreenCoords(SIGNATURE_COORDINATES.x, SIGNATURE_COORDINATES.y, pageNumber).x}px`,
                                top: `${pdfToScreenCoords(SIGNATURE_COORDINATES.x, SIGNATURE_COORDINATES.y, pageNumber).y}px`,
                                width: `${200 * scale}px`, // 200px base width, scaled
                                height: 'auto',
                                transform: 'translateY(-50%)',
                                maxWidth: 'none',
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </Document>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="p-4 border-t border-[#EAEB80]/20 flex items-center justify-center bg-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                variant="ghost"
                size="sm"
                className="text-[#EAEB80] font-bold"
                style={{ fontSize: "2rem" }}
              >
                −
              </Button>
              <span className="text-[#EAEB80] text-sm w-16 text-center font-semibold">
                {(scale * 100).toFixed(0)}%
              </span>
              <Button
                onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
                variant="ghost"
                size="sm"
                className="text-[#EAEB80] font-bold"
                style={{ fontSize: "2rem" }}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Right 1/3: Form Fields & Signature */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Your Information Card */}
          <Card className="bg-[#1a1a1a] border-[#EAEB80]/20 flex-shrink-0">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">Your Information</CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                Fill in all required fields. The contract preview updates in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {formFields.map((field) => {
                const hasError = !!field.error;
                const isEmpty = field.required && !field.value.trim();
                
                // Special handling for date fields
                if (field.type === "date" && field.name === "expectedStartDate") {
                  return (
                    <div key={field.name} className="space-y-1">
                      <Label htmlFor={field.name} className="text-gray-300 text-sm">
                        {field.label}
                        {field.required && <span className="text-[#EAEB80] ml-1">*</span>}
                      </Label>
                      <Input
                        id={field.name}
                        type="date"
                        onChange={(e) => handleDateChange(field.name, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field.name, e.target.value)}
                        required={field.required}
                        className={`bg-[#2a2a2a] border text-white focus:border-[#EAEB80] transition-colors ${
                          hasError || isEmpty ? "border-red-500 focus:border-red-500" : "border-[#EAEB80]/30"
                        }`}
                      />
                      {field.value && (
                        <p className="text-xs text-gray-400 mt-1">
                          Will appear as: {field.value}
                        </p>
                      )}
                      {field.error && (
                        <p className="text-xs text-red-500 mt-1">{field.error}</p>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div key={field.name} className="space-y-1">
                    <Label htmlFor={field.name} className="text-gray-300 text-sm">
                      {field.label}
                      {field.required && <span className="text-[#EAEB80] ml-1">*</span>}
                      {field.name === "owner" && (
                        <span className="text-xs text-gray-400 ml-2">(Max 20 chars)</span>
                      )}
                    </Label>
                    <Input
                      id={field.name}
                      type={field.type || "text"}
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      onBlur={(e) => handleFieldBlur(field.name, e.target.value)}
                      required={field.required}
                      maxLength={field.name === "owner" ? 20 : 100}
                      className={`bg-[#2a2a2a] border text-white focus:border-[#EAEB80] transition-colors ${
                        hasError || isEmpty ? "border-red-500 focus:border-red-500" : "border-[#EAEB80]/30"
                      }`}
                    />
                    {field.error && (
                      <p className="text-xs text-red-500 mt-1">{field.error}</p>
                    )}
                    {field.name === "owner" && field.value.length > 15 && !field.error && (
                      <p className="text-xs text-[#EAEB80] mt-1">
                        Long name detected - text will auto-shift left ({field.value.length} chars)
                      </p>
                    )}
                    {field.name !== "owner" && field.value.length > 20 && !field.error && (
                      <p className="text-xs text-[#EAEB80] mt-1">
                        Long text detected - will wrap to {wrapText(field.value, 20).length} lines ({field.value.length} chars)
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Sign Here Card */}
          <Card className="bg-[#1a1a1a] border-[#EAEB80]/20 flex-shrink-0">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">Sign Here</CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                Type your name or draw your signature below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as "typed" | "drawn")}>
              <TabsList className="grid w-full grid-cols-2 bg-[#2a2a2a]">
                <TabsTrigger value="typed" className="data-[state=active]:bg-[#EAEB80] data-[state=active]:text-black">
                  <Type className="w-4 h-4 mr-2" />
                  Type Name
                </TabsTrigger>
                <TabsTrigger value="drawn" className="data-[state=active]:bg-[#EAEB80] data-[state=active]:text-black">
                  <PenTool className="w-4 h-4 mr-2" />
                  Draw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="typed" className="space-y-3 mt-4">
                <Input
                  type="text"
                  placeholder="Type your full name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="bg-[#2a2a2a] border-[#EAEB80]/30 text-white focus:border-[#EAEB80]"
                />
                {typedName && (
                  <div className="bg-white p-3 rounded-md border-2 border-[#EAEB80]/30">
                    <p
                      className="text-2xl text-black italic text-center"
                      style={{ fontFamily: "'Dancing Script', cursive" }}
                    >
                      {typedName}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="drawn" className="mt-4">
                <div className="border-2 border-[#EAEB80]/30 rounded-md bg-white overflow-hidden">
                  <SignatureCanvas
                    ref={signatureCanvasRef}
                    onEnd={handleSignatureEnd}
                    canvasProps={{
                      className: "w-full h-32 border border-[#EAEB80]/30 rounded-md bg-white",
                    }}
                  />
                </div>
                <Button
                  onClick={() => {
                    signatureCanvasRef.current?.clear();
                    setDrawnSignatureDataUrl(null); // Clear the overlay
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full border-[#EAEB80]/30 text-gray-300"
                >
                  Clear
                </Button>
              </TabsContent>
            </Tabs>

              {/* Agreement Checkbox */}
              <div className="flex items-start space-x-3 pt-4 border-t border-[#EAEB80]/20">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                  className="mt-1"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-gray-300 cursor-pointer leading-relaxed"
                >
                  I agree to the terms and conditions outlined in this Co-Hosting Agreement.
                </Label>
              </div>

              {/* Submit and Decline Buttons Row */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="flex-1 h-12 bg-[#EAEB80] text-black text-lg font-bold hover:bg-[#d4d570] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
                {onDecline && (
                  <Button
                    onClick={onDecline}
                    disabled={isProcessing}
                    className="flex-1 h-12 bg-[#ef4444] text-white text-lg font-bold hover:bg-[#dc2626] disabled:opacity-50"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Decline Contract
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

