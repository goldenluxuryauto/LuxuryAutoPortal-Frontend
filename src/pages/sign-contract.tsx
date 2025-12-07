import { useState, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Check } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { PDFEditor } from "@/components/pdf-editor/PDFEditor";

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
  
  // Extract token from URL
  const token = params?.token || (() => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const signContractIndex = pathParts.indexOf("sign-contract");
    if (signContractIndex >= 0 && pathParts[signContractIndex + 1]) {
      return pathParts[signContractIndex + 1];
    }
    return "";
  })();

  const contractTemplateUrl = buildApiUrl("/contracts/GoldenLuxuryAuto_Contract_Template.pdf");
  const { toast } = useToast();
  const signPdfFnRef = useRef<(() => Promise<Blob>) | null>(null);

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

  // Sign contract mutation
  const signMutation = useMutation({
    mutationFn: async (action: "sign" | "decline") => {
      if (action === "sign") {
        let pdfDataUrl: string;
        
        if (signPdfFnRef.current) {
          // Generate flattened PDF with all annotations
          const signedPdfBlob = await signPdfFnRef.current();
          
          // Convert blob to base64 for backend compatibility
          const arrayBuffer = await signedPdfBlob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          pdfDataUrl = `data:application/pdf;base64,${base64}`;
        } else {
          // If PDF editor not ready, send empty signature (backend will use template)
          pdfDataUrl = "";
        }

        const response = await fetch(buildApiUrl(`/api/contract/sign/${token}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            signatureData: pdfDataUrl, // Send flattened PDF as signature data
            isFlattenedPdf: true, // Flag to indicate this is a full PDF, not just signature
        }),
        credentials: "include",
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to sign contract");
        }
        return result;
      } else {
        // Decline
        const response = await fetch(buildApiUrl(`/api/contract/decline/${token}`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to decline contract");
      }
      return result;
      }
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
    // Always allow signing - PDF editor will handle empty annotations gracefully
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
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] flex flex-col">
        {/* Header */}
      <div className="text-center py-6 px-4 border-b border-[#EAEB80]/20">
          <img 
            src="/logo.png" 
            alt="Golden Luxury Auto" 
          className="h-24 md:h-32 w-auto mx-auto object-contain mb-2 drop-shadow-[0_0_12px_rgba(234,235,128,0.4)]"
          />
          <p className="text-gray-300 text-lg">
            Contract Agreement for {contractData.firstNameOwner} {contractData.lastNameOwner}
          </p>
        </div>

      {/* PDF Editor - Full Height */}
      <div className="flex-1 relative" style={{ height: "calc(100vh - 200px)" }}>
        <PDFEditor
          pdfUrl={contractTemplateUrl}
          contractId={contractData.id}
          onSignReady={(signFn) => {
            signPdfFnRef.current = signFn;
          }}
        />
        </div>

      {/* Action Buttons - Fixed Bottom */}
      <div className="bg-[#1a1a1a] border-t border-[#EAEB80]/20 p-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <Button
              onClick={handleSign}
            disabled={signMutation.isPending}
            className="w-full h-16 px-12 bg-[#EAEB80] text-black text-lg font-bold uppercase tracking-wider rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-[#d4d56a] hover:shadow-[0_0_20px_rgba(234,235,128,0.6)] disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100"
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
            className="w-full h-16 px-12 bg-gray-700 text-white text-lg font-bold uppercase tracking-wider rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-gray-600 hover:shadow-[0_0_20px_rgba(107,114,128,0.6)] disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100"
            >
              <X className="h-5 w-5 mr-2" />
              Decline
            </Button>
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-400 text-sm mt-4">
          <p>By signing this contract, you agree to the terms and conditions outlined above.</p>
          <p className="mt-2">If you have any questions, please contact us before signing.</p>
        </div>
      </div>
    </div>
  );
}
