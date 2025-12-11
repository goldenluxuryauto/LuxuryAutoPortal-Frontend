import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PenTool, Type, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FormField {
  name: string;
  label: string;
  value: string;
  required: boolean;
  type?: "text" | "email" | "tel";
}

interface ContractFormFillerProps {
  pdfUrl: string;
  onboardingData: any;
  onSubmit: (signedPdfBlob: Blob, signatureType: "typed" | "drawn") => Promise<void>;
}

export function ContractFormFiller({
  pdfUrl,
  onboardingData,
  onSubmit,
}: ContractFormFillerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [filledPdfUrl, setFilledPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  // Form fields with pre-filled data
  const [formFields, setFormFields] = useState<FormField[]>([
    { name: "firstName", label: "First Name", value: onboardingData?.firstNameOwner || "", required: true },
    { name: "lastName", label: "Last Name", value: onboardingData?.lastNameOwner || "", required: true },
    { name: "email", label: "Email", value: onboardingData?.emailOwner || "", required: true, type: "email" },
    { name: "phone", label: "Phone", value: onboardingData?.phoneOwner || "", required: true, type: "tel" },
    { name: "address", label: "Street Address", value: onboardingData?.streetAddress || "", required: true },
    { name: "city", label: "City", value: onboardingData?.city || "", required: true },
    { name: "state", label: "State", value: onboardingData?.state || "", required: true },
    { name: "zipCode", label: "ZIP Code", value: onboardingData?.zipCode || "", required: true },
    { name: "vehicleMake", label: "Vehicle Make", value: onboardingData?.vehicleMake || "", required: true },
    { name: "vehicleModel", label: "Vehicle Model", value: onboardingData?.vehicleModel || "", required: true },
    { name: "vehicleYear", label: "Vehicle Year", value: onboardingData?.vehicleYear || "", required: true },
  ]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Signature state
  const [signatureType, setSignatureType] = useState<"typed" | "drawn">("typed");
  const [typedName, setTypedName] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const signatureCanvasRef = useRef<SignatureCanvas>(null);
  const { toast } = useToast();

  // Load PDF bytes
  useEffect(() => {
    async function loadPdf() {
      try {
        const response = await fetch(pdfUrl);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setPdfBytes(bytes);
        setFilledPdfUrl(pdfUrl); // Start with original
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

  // Real-time PDF filling as user types
  const updatePdfPreview = useCallback(async () => {
    if (!pdfBytes) return;

    setIsGeneratingPreview(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const fontSize = 12;
      const textColor = rgb(0, 0, 0);

      // Fill fields on first page (adjust coordinates based on your PDF)
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Example coordinates - adjust these to match your actual PDF blank positions
      const fieldPositions: Record<string, { x: number; y: number }> = {
        firstName: { x: 120, y: height - 200 },
        lastName: { x: 300, y: height - 200 },
        email: { x: 120, y: height - 230 },
        phone: { x: 350, y: height - 230 },
        address: { x: 120, y: height - 260 },
        city: { x: 120, y: height - 290 },
        state: { x: 250, y: height - 290 },
        zipCode: { x: 350, y: height - 290 },
        vehicleMake: { x: 120, y: height - 350 },
        vehicleModel: { x: 300, y: height - 350 },
        vehicleYear: { x: 450, y: height - 350 },
      };

      // Fill each field
      formFields.forEach((field) => {
        if (field.value.trim() && fieldPositions[field.name]) {
          const pos = fieldPositions[field.name];
          firstPage.drawText(field.value, {
            x: pos.x,
            y: pos.y,
            size: fontSize,
            font: helveticaFont,
            color: textColor,
          });
        }
      });

      const pdfBytesResult = await pdfDoc.save();
      const blob = new Blob([pdfBytesResult.buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      // Clean up old URL
      if (filledPdfUrl && filledPdfUrl !== pdfUrl) {
        URL.revokeObjectURL(filledPdfUrl);
      }
      
      setFilledPdfUrl(url);
    } catch (error) {
      console.error("Error updating PDF preview:", error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [pdfBytes, formFields, pdfUrl]);

  // Debounced PDF update (wait 500ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePdfPreview();
    }, 500);

    return () => clearTimeout(timer);
  }, [updatePdfPreview]);

  const handleFieldChange = (name: string, value: string) => {
    setFormFields((prev) =>
      prev.map((field) => (field.name === name ? { ...field, value } : field))
    );
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check all required fields
    formFields.forEach((field) => {
      if (field.required && !field.value.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    // Email validation
    if (formFields.find((f) => f.name === "email")?.value) {
      const email = formFields.find((f) => f.name === "email")!.value;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // Check signature
    if (signatureType === "typed" && !typedName.trim()) {
      newErrors.signature = "Please type your full name to sign";
    }

    if (signatureType === "drawn" && signatureCanvasRef.current?.isEmpty()) {
      newErrors.signature = "Please draw your signature";
    }

    // Check agreement
    if (!agreeToTerms) {
      newErrors.terms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Please complete all required fields",
        description: "Check the form for missing information",
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
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const pages = pdfDoc.getPages();

    const fontSize = 12;
    const textColor = rgb(0, 0, 0);

    // Fill form fields on first page
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const fieldPositions: Record<string, { x: number; y: number }> = {
      firstName: { x: 120, y: height - 200 },
      lastName: { x: 300, y: height - 200 },
      email: { x: 120, y: height - 230 },
      phone: { x: 350, y: height - 230 },
      address: { x: 120, y: height - 260 },
      city: { x: 120, y: height - 290 },
      state: { x: 250, y: height - 290 },
      zipCode: { x: 350, y: height - 290 },
      vehicleMake: { x: 120, y: height - 350 },
      vehicleModel: { x: 300, y: height - 350 },
      vehicleYear: { x: 450, y: height - 350 },
    };

    formFields.forEach((field) => {
      if (field.value.trim() && fieldPositions[field.name]) {
        const pos = fieldPositions[field.name];
        firstPage.drawText(field.value, {
          x: pos.x,
          y: pos.y,
          size: fontSize,
          font: helveticaFont,
          color: textColor,
        });
      }
    });

    // Add signature on last page
    const signaturePage = pages[pages.length - 1];
    const signatureY = 200;
    const signatureX = 100;

    if (signatureType === "typed") {
      signaturePage.drawText(typedName, {
        x: signatureX,
        y: signatureY,
        size: 18,
        font: helveticaOblique,
        color: textColor,
      });
    } else {
      const signatureDataUrl = signatureCanvasRef.current?.toDataURL("image/png");
      if (signatureDataUrl) {
        const signatureImage = await pdfDoc.embedPng(signatureDataUrl);
        const signatureDims = signatureImage.scale(0.3);
        signaturePage.drawImage(signatureImage, {
          x: signatureX,
          y: signatureY - 30,
          width: signatureDims.width,
          height: signatureDims.height,
        });
      }
    }

    // Add date
    const today = new Date().toLocaleDateString();
    signaturePage.drawText(`Date: ${today}`, {
      x: signatureX + 200,
      y: signatureY,
      size: fontSize,
      font: helveticaFont,
      color: textColor,
    });

    const pdfBytesResult = await pdfDoc.save();
    return new Blob([pdfBytesResult.buffer], { type: "application/pdf" });
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
        {/* Left 2/3: PDF Preview */}
        <div className="flex-[2] flex flex-col bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] rounded-lg border-2 border-[#EAEB80]/30 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-[#EAEB80]/20 flex items-center justify-between">
            <h3 className="text-[#EAEB80] font-semibold text-lg">Contract Preview</h3>
            <div className="flex items-center gap-4">
              {isGeneratingPreview && (
                <Loader2 className="w-4 h-4 animate-spin text-[#EAEB80]" />
              )}
              <span className="text-gray-300 text-sm">
                Page {pageNumber} of {numPages}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: "100%" }}>
              <Document
                file={filledPdfUrl || pdfUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                  <div className="flex items-center justify-center h-[600px]">
                    <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
                  </div>
                }
              >
                <Page pageNumber={pageNumber} scale={scale} />
              </Document>
            </div>
          </div>

          {/* Page Navigation */}
          <div className="p-4 border-t border-[#EAEB80]/20 flex items-center justify-between bg-[#1a1a1a]">
            <Button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              variant="outline"
              size="sm"
              className="border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
                variant="ghost"
                size="sm"
                className="text-gray-400"
              >
                −
              </Button>
              <span className="text-gray-300 text-sm w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                onClick={() => setScale((s) => Math.min(2, s + 0.1))}
                variant="ghost"
                size="sm"
                className="text-gray-400"
              >
                +
              </Button>
            </div>
            <Button
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              variant="outline"
              size="sm"
              className="border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Right 1/3: Form Fields & Signature */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Your Information Card */}
          <Card className="bg-[#1a1a1a] border-[#EAEB80]/20 flex-shrink-0">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formFields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label htmlFor={field.name} className="text-gray-300 text-sm">
                    {field.label}
                    {field.required && <span className="text-[#EAEB80] ml-1">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type || "text"}
                    value={field.value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required}
                    className={cn(
                      "bg-[#2a2a2a] border text-white focus:border-[#EAEB80] transition-colors",
                      errors[field.name]
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#EAEB80]/30"
                    )}
                  />
                  {errors[field.name] && (
                    <p className="text-red-400 text-xs">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sign Here Card */}
          <Card className="bg-[#1a1a1a] border-[#EAEB80]/20 flex-shrink-0">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">Sign Here</CardTitle>
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
                    onChange={(e) => {
                      setTypedName(e.target.value);
                      if (errors.signature) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.signature;
                          return newErrors;
                        });
                      }
                    }}
                    className={cn(
                      "bg-[#2a2a2a] border text-white focus:border-[#EAEB80]",
                      errors.signature
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#EAEB80]/30"
                    )}
                  />
                  {errors.signature && (
                    <p className="text-red-400 text-xs">{errors.signature}</p>
                  )}
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
                  <div className={cn(
                    "border-2 rounded-md bg-white overflow-hidden",
                    errors.signature ? "border-red-500" : "border-[#EAEB80]/30"
                  )}>
                    <SignatureCanvas
                      ref={signatureCanvasRef}
                      canvasProps={{
                        className: "w-full h-32",
                      }}
                    />
                  </div>
                  {errors.signature && (
                    <p className="text-red-400 text-xs mt-1">{errors.signature}</p>
                  )}
                  <Button
                    onClick={() => {
                      signatureCanvasRef.current?.clear();
                      if (errors.signature) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.signature;
                          return newErrors;
                        });
                      }
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
                  onCheckedChange={(checked) => {
                    setAgreeToTerms(checked as boolean);
                    if (errors.terms) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.terms;
                        return newErrors;
                      });
                    }
                  }}
                  className={cn(
                    "mt-1",
                    errors.terms && "border-red-500"
                  )}
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-gray-300 cursor-pointer leading-relaxed"
                >
                  I agree to the terms and conditions outlined in this Co-Hosting Agreement.
                </Label>
              </div>
              {errors.terms && (
                <p className="text-red-400 text-xs">{errors.terms}</p>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full h-12 bg-[#EAEB80] text-black text-lg font-bold hover:bg-[#d4d570] disabled:opacity-50"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
