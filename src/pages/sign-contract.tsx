import { useState, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Check } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { PDFEditor } from "@/components/pdf-editor/PDFEditor";
import { ContractFormFiller } from "@/components/contract/ContractFormFiller";

interface ContractData {
  id: number;
  firstNameOwner: string;
  lastNameOwner: string;
  emailOwner: string;
  phoneOwner?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vinNumber?: string;
  contractStatus: string;
}

export default function SignContract() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sign-contract/:token");

  // Extract token from URL
  const token =
    params?.token ||
    (() => {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const signContractIndex = pathParts.indexOf("sign-contract");
      if (signContractIndex >= 0 && pathParts[signContractIndex + 1]) {
        return pathParts[signContractIndex + 1];
      }
      return "";
    })();

  const contractTemplateUrl = buildApiUrl(
    "/contracts/GoldenLuxuryAuto_Contract_Template.pdf"
  );
  const { toast } = useToast();
  const signPdfFnRef = useRef<(() => Promise<Blob>) | null>(null);

  // Validate token
  const {
    data: contractData,
    isLoading: isValidating,
    error: validationError,
  } = useQuery<ContractData>({
    queryKey: ["validateContract", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const response = await fetch(
        buildApiUrl(`/api/contract/validate/${token}`),
        {
          credentials: "include",
        }
      );
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
    mutationFn: async (data: { action: "sign" | "decline"; signedPdfBlob?: Blob; signatureType?: "typed" | "drawn" }) => {
      if (data.action === "sign") {
        const signedPdfBlob = data.signedPdfBlob || (signPdfFnRef.current ? await signPdfFnRef.current() : null);
        
        if (signedPdfBlob) {
          // Generate flattened PDF with all annotations
          
          // Send PDF as FormData with signature type
          const formData = new FormData();
          formData.append('pdfFile', signedPdfBlob, 'signed-contract.pdf');
          formData.append('isFlattenedPdf', 'true');
          if (data.signatureType) {
            formData.append('signatureType', data.signatureType);
          }

          const response = await fetch(buildApiUrl(`/api/contract/sign/${token}`), {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to sign contract");
          }
          return result;
        } else {
          // If PDF editor not ready, send empty signature (backend will use template)
          const response = await fetch(
            buildApiUrl(`/api/contract/sign/${token}`),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                signatureData: "",
                isFlattenedPdf: false,
              }),
              credentials: "include",
            }
          );

          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to sign contract");
          }
          return result;
        }
      } else {
        // Decline
        const response = await fetch(
          buildApiUrl(`/api/contract/decline/${token}`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to decline contract");
        }
        return result;
      }
    },
    onSuccess: (result, data) => {
      if (data.action === "sign") {
        toast({
          title: "Contract signed successfully!",
          description: result.signedPdfUrl
            ? `Your signed contract is available. You will receive a confirmation email shortly.`
            : "Thank you for signing. You will receive a confirmation email shortly.",
        });
        // Optionally open the signed PDF in a new tab
        if (result.signedPdfUrl) {
          setTimeout(() => {
            // signedPdfUrl is already a full URL from backend, don't wrap with buildApiUrl
            window.open(result.signedPdfUrl, "_blank");
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
    signMutation.mutate({ action: "sign" });
  };

  const handleFormSubmit = async (signedPdfBlob: Blob, signatureType: "typed" | "drawn") => {
    await signMutation.mutateAsync({ action: "sign", signedPdfBlob, signatureType });
  };

  const handleDecline = () => {
    if (confirm("Are you sure you want to decline this contract? This action cannot be undone.")) {
      signMutation.mutate({ action: "decline" });
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
          <h1 className="text-2xl font-bold text-[#d4af37] mb-4">
            Link Expired or Invalid
          </h1>
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
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] py-8 px-4 md:px-8">
      {/* Container - Centered with max width */}
      <div className="max-w-[900px] w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img 
            src="/logo.png" 
            alt="Golden Luxury Auto" 
            className="h-20 md:h-24 w-auto mx-auto object-contain mb-3 drop-shadow-[0_0_12px_rgba(234,235,128,0.4)]"
          />
          <p className="text-gray-300 text-lg">
            Contract Agreement for {contractData.firstNameOwner} {contractData.lastNameOwner}
          </p>
        </div>

        {/* Contract Form Filler - New Component */}
        <ContractFormFiller
          pdfUrl={contractTemplateUrl}
          onboardingData={contractData}
          onSubmit={handleFormSubmit}
        />

        {/* Decline Option - Minimal */}
        <div className="text-center mt-6">
          <Button
            onClick={handleDecline}
            disabled={signMutation.isPending}
            variant="ghost"
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="h-4 w-4 mr-2" />
            Decline Contract
          </Button>
        </div>
      </div>
    </div>
  );
}
