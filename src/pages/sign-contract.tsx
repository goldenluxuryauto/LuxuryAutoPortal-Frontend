import { useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document, Page } from "react-pdf";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Check, FileText } from "lucide-react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { buildApiUrl, getApiBaseUrl } from "@/lib/queryClient";

// Force local worker – redundant setup for safety (also configured in main.tsx)
// Use pdfjs-dist directly to override any CDN defaults
import * as pdfjs from "pdfjs-dist";
const WORKER_SRC = `${getApiBaseUrl()}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
console.log("Worker forced to local:", pdfjs.GlobalWorkerOptions.workerSrc);

interface ContractData {
  id: number;
  firstNameOwner: string;
  lastNameOwner: string;
  emailOwner: string;
  contractStatus: string;
}

export default function SignContract() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sign-contract/:token");
  
  // Extract token from URL - use params first, fallback to parsing URL
  const token = params?.token || (() => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const signContractIndex = pathParts.indexOf("sign-contract");
    if (signContractIndex >= 0 && pathParts[signContractIndex + 1]) {
      return pathParts[signContractIndex + 1];
    }
    return "";
  })();
  const contractTemplateUrl = buildApiUrl("/contracts/GoldenLuxuryAuto_Contract_Template.pdf");
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const signatureCanvasRef = useRef<SignatureCanvas>(null);
  const { toast } = useToast();

  // Validate token
  const { data: contractData, isLoading: isValidating, error: validationError } = useQuery<ContractData>({
    queryKey: ["validateContract", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const response = await fetch(buildApiUrl(`/api/contract/validate/${token}`), {
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Invalid or expired contract link");
      }
      return result.data;
    },
    enabled: !!token,
    retry: false,
  });

  // Handle PDF load
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    console.log("✅ PDF loaded successfully, pages:", numPages);
  };

  // Handle PDF load error
  const onDocumentLoadError = (error: Error) => {
    console.error("❌ PDF load error:", error);
    console.error("PDF path attempted:", contractTemplateUrl);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    setPdfError(
      error.message || "Failed to load contract. Please refresh the page or contact support."
    );
  };

  // Clear signature
  const handleClearSignature = () => {
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
      toast({
        title: "Signature cleared",
        description: "You can draw your signature again.",
      });
    }
  };

  // Check if signature is empty
  const isSignatureEmpty = () => {
    if (!signatureCanvasRef.current) return true;
    return signatureCanvasRef.current.isEmpty();
  };

  // Sign contract mutation
  const signMutation = useMutation({
    mutationFn: async (action: "sign" | "decline") => {
      const signatureData = action === "sign" && signatureCanvasRef.current
        ? signatureCanvasRef.current.toDataURL()
        : null;

      const response = await fetch(buildApiUrl(`/api/contract/${action}/${token}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signatureData,
        }),
        credentials: "include",
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${action} contract`);
      }
      return result;
    },
    onSuccess: (result, action) => {
      if (action === "sign") {
        toast({
          title: "Contract signed successfully!",
          description: result.signedPdfUrl
            ? `Your signed contract is available. You will receive a confirmation email shortly.`
            : "Thank you for signing. You will receive a confirmation email shortly.",
        });
        // Optionally open the signed PDF in a new tab
        if (result.signedPdfUrl) {
          setTimeout(() => {
            window.open(buildApiUrl(result.signedPdfUrl), "_blank");
          }, 1000);
        }
      } else {
        toast({
          title: "Contract declined",
          description: "The contract has been declined.",
        });
      }
      // Redirect after a short delay
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSign = () => {
    if (isSignatureEmpty()) {
      toast({
        title: "Signature required",
        description: "Please draw your signature before signing.",
        variant: "destructive",
      });
      return;
    }
    signMutation.mutate("sign");
  };

  const handleDecline = () => {
    if (confirm("Are you sure you want to decline this contract? This action cannot be undone.")) {
      signMutation.mutate("decline");
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#d4af37] mx-auto mb-4" />
          <p className="text-[#d4af37] text-lg">Validating contract link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (validationError || !contractData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#2d2d2d] border-2 border-[#d4af37] rounded-lg p-8 text-center">
          <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#d4af37] mb-4">Link Expired or Invalid</h1>
          <p className="text-gray-300 mb-6">
            {validationError instanceof Error
              ? validationError.message
              : "The contract link you're trying to access is no longer valid."}
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="bg-[#d4af37] text-[#1a1a1a] hover:bg-[#f4d03f] font-semibold"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="Golden Luxury Auto" 
            className="h-[160px] md:h-[200px] w-auto mx-auto object-contain mb-4 drop-shadow-[0_0_12px_rgba(234,235,128,0.4)]"
          />
          <p className="text-gray-300 text-lg">
            Contract Agreement for {contractData.firstNameOwner} {contractData.lastNameOwner}
          </p>
        </div>

        {/* PDF Viewer */}
        <div className="bg-[#2d2d2d] rounded-lg border-2 border-[#d4af37] p-4 mb-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#d4af37] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Document
            </h2>
            {numPages > 1 && (
              <div className="flex items-center gap-4 text-gray-300">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                  disabled={pageNumber <= 1}
                  className="border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#1a1a1a]"
                >
                  Previous
                </Button>
                <span>
                  Page {pageNumber} of {numPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
                  disabled={pageNumber >= numPages}
                  className="border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#1a1a1a]"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-center bg-white rounded-lg p-4 overflow-auto">
            {pdfError ? (
              <div className="text-center py-20 text-red-500">
                <p className="mb-2 font-semibold">Failed to load PDF</p>
                <p className="text-sm text-gray-600 mb-4">{pdfError}</p>
                <Button
                  onClick={() => {
                    setPdfError(null);
                    window.location.reload();
                  }}
                  className="bg-[#d4af37] text-[#1a1a1a] hover:bg-[#f4d03f]"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <Document
                file={contractTemplateUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
                    <span className="ml-3 text-gray-600">Loading contract document...</span>
                  </div>
                }
                error={
                  <div className="text-center py-20 text-red-500">
                    <p className="mb-2 font-semibold">Failed to load contract document</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Please refresh the page or contact support if the problem persists.
                    </p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="bg-[#d4af37] text-[#1a1a1a] hover:bg-[#f4d03f]"
                    >
                      Refresh Page
                    </Button>
                  </div>
                }
                options={{
                  // cMapUrl is optional - only needed for certain fonts
                  // We omit it to avoid CDN dependencies, PDF.js will work without it
                  cMapPacked: true,
                  httpHeaders: {
                    "Accept": "application/pdf",
                  },
                }}
              >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                width={Math.min(800, window.innerWidth - 64)}
              />
            </Document>
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-[#2d2d2d] rounded-lg border-2 border-[#d4af37] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#d4af37] mb-4">Your Signature</h2>
          <p className="text-gray-300 mb-4 text-sm">
            Please sign below using your mouse or touch screen:
          </p>
          <div className="bg-white rounded-lg border-2 border-gray-400 p-4 mb-4">
            <SignatureCanvas
              ref={signatureCanvasRef}
              canvasProps={{
                className: "signature-canvas w-full h-48 md:h-64",
                style: { touchAction: "none" },
              }}
              backgroundColor="white"
              penColor="#000000"
            />
          </div>
          <Button
            onClick={handleClearSignature}
            variant="outline"
            size="sm"
            className="border-gray-400 text-gray-300 hover:bg-gray-700 mb-6"
          >
            Clear Signature
          </Button>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Button
              onClick={handleSign}
              disabled={signMutation.isPending || isSignatureEmpty()}
              className="flex-1 bg-[#d4af37] text-[#1a1a1a] hover:bg-[#f4d03f] font-semibold text-lg py-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Accept & Sign
                </>
              )}
            </Button>
            <Button
              onClick={handleDecline}
              disabled={signMutation.isPending}
              variant="destructive"
              className="flex-1 font-semibold text-lg py-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-5 w-5 mr-2" />
              Decline
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-400 text-sm">
          <p>By signing this contract, you agree to the terms and conditions outlined above.</p>
          <p className="mt-2">If you have any questions, please contact us before signing.</p>
        </div>
      </div>
    </div>
  );
}

