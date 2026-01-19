import { useState, useEffect, useRef } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ContractManagement from "./ContractManagement";
import CarOnboarding from "./CarOnboarding";
import CarOffboarding from "./CarOffboarding";
import CarOnboardingForm from "@/components/forms/CarOnboardingForm";
import CarOffboardingForm from "@/components/forms/CarOffboardingForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  ClipboardList,
  Car,
  LogOut,
  Search,
  Loader2,
  Eye,
  Send,
  FileCheck,
  ExternalLink,
  Download,
  Share2,
  CheckCircle,
  XCircle,
  X,
  Upload,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import {
  TablePagination,
  ItemsPerPage,
} from "@/components/ui/table-pagination";

interface FormItem {
  id: string;
  title: string;
  icon: any;
  comingSoon?: boolean;
  externalUrl?: string | null;
}

interface FormSection {
  id: string;
  title: string;
  icon: any;
  items: FormItem[];
}

interface OnboardingSubmission {
  id: number;
  firstNameOwner: string;
  lastNameOwner: string;
  emailOwner: string;
  phoneOwner: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vinNumber?: string;
  licensePlate?: string;
  createdAt: string;
  status: string;
  contractStatus?: "pending" | "sent" | "opened" | "signed" | "declined" | null;
  contractSignedAt?: string | null;
  signedContractUrl?: string | null;
  isOffboarded?: boolean;
  carOffboardAt?: string | null;
  carOffboardReason?: string | null;
  [key: string]: any; // For full submission details
}

// QR Code Section Component
function QRCodeSection() {
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get the current URL and remove /admin/forms if present, replace with /onboarding
  const onboardingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/onboarding`
      : "/onboarding";

  /**
   * Copy text to clipboard with a safe fallback for environments where
   * `navigator.clipboard` is unavailable (older browsers / non-secure contexts).
   */
  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback: temporary textarea + execCommand
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  /**
   * Client requirement: button should copy the onboarding link (not share UI).
   */
  const handleShare = async () => {
    try {
      await copyToClipboard(onboardingUrl);
      toast({
        title: "Link copied",
        description: "Onboarding form URL copied to clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy onboarding link:", error);
      toast({
        title: "Copy failed",
        description: "Could not copy the link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;

    const svgElement = qrRef.current.querySelector("svg");
    if (!svgElement) return;

    try {
      // Convert SVG to canvas then to PNG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // Higher resolution for better quality
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Fill with white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the QR code
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = "Golden-Luxury-Auto-Onboarding-QR.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            toast({
              title: "QR Code downloaded",
              description: "The QR code has been saved to your downloads.",
            });
          }
          URL.revokeObjectURL(url);
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast({
          title: "Download failed",
          description: "Failed to generate QR code image.",
          variant: "destructive",
        });
      };

      img.src = url;
    } catch (error) {
      console.error("Error downloading QR code:", error);
      toast({
        title: "Download failed",
        description: "An error occurred while downloading the QR code.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-[#0a0a0a] border-[#EAEB80]/30 border-2">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left side: Title, subtitle, and QR code */}
          <div className="flex-1 flex flex-col items-center lg:items-start">
            <div className="mb-4 text-center lg:text-left">
              <h2 className="text-xl font-semibold text-[#EAEB80] mb-2">
                Client Onboarding Form LYC
              </h2>
              <p className="text-sm text-gray-400">
                Fill out for new clients or share the QR code for them to
                complete
              </p>
            </div>

            {/* QR Code */}
            <div ref={qrRef} className="bg-white p-4 rounded-lg shadow-lg mb-4">
              <QRCodeSVG
                value={onboardingUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownloadQR}
              variant="outline"
              className="w-full lg:w-auto border-[#EAEB80]/50 text-[#EAEB80] hover:bg-[#EAEB80]/10 hover:border-[#EAEB80]"
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </div>

          {/* Right side: Share section */}
          <div className="flex-1 flex flex-col justify-center items-center lg:items-start">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-2">
                Share with New Clients
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Send the onboarding form link directly to your clients via
                email, SMS, or messaging apps.
              </p>

              {/* Client requirement: show the actual link next to the copy button */}
              <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch">
                <Button
                  onClick={handleShare}
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium w-full sm:w-auto whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Click to Copy the Link
                </Button>

                <Input
                  value={onboardingUrl}
                  readOnly
                  className="bg-[#0f0f0f] border-[#2a2a2a] text-[#EAEB80] w-full"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FormsPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "client-onboarding",
  ]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<OnboardingSubmission | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [showAccessConfirmation, setShowAccessConfirmation] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [submissionToDecline, setSubmissionToDecline] = useState<OnboardingSubmission | null>(null);
  const [fullScreenDocument, setFullScreenDocument] = useState<{
    url: string;
    type: 'insurance' | 'license';
    index?: number;
    isPdf?: boolean;
  } | null>(null);
  const [insuranceCardFile, setInsuranceCardFile] = useState<File | null>(null);
  const [insuranceCardPreview, setInsuranceCardPreview] = useState<string | null>(null);
  const [driversLicenseFiles, setDriversLicenseFiles] = useState<File[]>([]);
  const [driversLicensePreviews, setDriversLicensePreviews] = useState<string[]>([]);
  const [page, setPage] = useState(1);


  // Load items per page from localStorage, default to 10
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(() => {
    const saved = localStorage.getItem("submissions_limit");
    return (saved ? parseInt(saved) : 10) as ItemsPerPage;
  });

  // Save to localStorage when itemsPerPage changes
  useEffect(() => {
    localStorage.setItem("submissions_limit", itemsPerPage.toString());
  }, [itemsPerPage]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch form visibility for current user's role
  const { data: formVisibilityData } = useQuery<{
    roleId: number;
    roleName: string;
    isAdmin: boolean;
    isEmployee: boolean;
    isClient: boolean;
    formVisibility: Record<
      string,
      { isVisible: boolean; externalUrl?: string | null }
    >;
  }>({
    queryKey: ["/api/admin/form-visibility"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/admin/form-visibility"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch form visibility");
      return response.json();
    },
    retry: false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleItem = (itemId: string) => {
    if (
      itemId === "lyc" ||
      itemId === "contract" ||
      itemId === "car-on" ||
      itemId === "car-off"
    ) {
      setExpandedItems((prev) =>
        prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId]
      );
    }
  };

  // Fetch submissions for LYC form
  const {
    data: submissionsData,
    isLoading: isLoadingSubmissions,
    error: submissionsError,
  } = useQuery<{
    success: boolean;
    data: OnboardingSubmission[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["onboarding-submissions", searchQuery, page, itemsPerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const url = buildApiUrl(
        `/api/onboarding/submissions?${params.toString()}`
      );
      console.log("🔍 [FORMS PAGE] Fetching submissions from:", url);

      const response = await fetch(url, {
        credentials: "include", // Include cookies for session authentication
      });

      console.log(
        "📥 [FORMS PAGE] Response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to fetch submissions" }));
        console.error("❌ [FORMS PAGE] API error:", errorData);
        throw new Error(
          errorData.error ||
            `Failed to fetch submissions: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      // console.log("✅ [FORMS PAGE] Submissions received:", {
      //   success: data.success,
      //   count: data.data?.length || 0,
      //   total: data.pagination?.total || 0,
      // });
      return data;
    },
    enabled: expandedItems.includes("lyc"), // Only fetch when LYC item is expanded
    retry: 1,
    refetchInterval: 8000, // Poll every 8 seconds for real-time updates
    refetchOnWindowFocus: true,
  });

  // Track signed contract IDs for toast notifications using ref to avoid re-renders
  const previousSignedIdsRef = useRef<Set<number>>(new Set());

  // Check for new signed contracts and show toast (useEffect to prevent infinite re-renders)
  useEffect(() => {
    if (!submissionsData?.data) return;

    const currentSignedIds = new Set(
      submissionsData.data
        .filter((s: OnboardingSubmission) => s.contractStatus === "signed")
        .map((s: OnboardingSubmission) => s.id)
    );

    const previousSignedIds = previousSignedIdsRef.current;

    // Find newly signed contracts
    if (previousSignedIds.size > 0) {
      const newSignedIds = Array.from(currentSignedIds).filter(
        (id) => !previousSignedIds.has(id)
      );

      newSignedIds.forEach((id) => {
        const submission = submissionsData.data.find(
          (s: OnboardingSubmission) => s.id === id
        );
        if (submission) {
          toast({
            title: "🎉 New Contract Signed!",
            description: `${submission.firstNameOwner} ${submission.lastNameOwner} has signed their contract.`,
            duration: 5000,
          });
        }
      });
    }

    // Update ref with current IDs
    previousSignedIdsRef.current = currentSignedIds;
  }, [submissionsData?.data]);

  // Approve/Reject submission mutation
  const approvalMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: number;
      action: "approve" | "reject";
      reason?: string;
    }) => {
      const response = await fetch(
        buildApiUrl(`/api/onboarding/submissions/${id}/${action}`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        }
      );
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: `Failed to ${action} submission` }));
        throw new Error(error.error || `Failed to ${action} submission`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (variables.action === "approve") {
        toast({
          title: "✅ Submission Approved",
          description: "Email and Slack notifications sent. Status updated.",
        });
      } else {
        toast({
          title: "Submission Declined",
          description: "Email and Slack notifications sent. Status updated.",
        });
      }
      // Close decline modal if open
      setShowDeclineModal(false);
      setDeclineReason("");
      setSubmissionToDecline(null);
      // Invalidate and refetch submissions
      queryClient.invalidateQueries({ queryKey: ["onboarding-submissions"] });
      // Also invalidate cars list queries so cars page updates (car status changes when approved)
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      // Invalidate sidebar badges (car counts may change)
      queryClient.invalidateQueries({ queryKey: ["sidebar-badges"] });
    },
    onError: (error: Error, variables) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch full submission details for viewing
  const { data: submissionDetails } = useQuery<{
    success: boolean;
    data: OnboardingSubmission;
  }>({
    queryKey: ["onboarding-submission", selectedSubmission?.id],
    queryFn: async () => {
      const response = await fetch(
        buildApiUrl(`/api/onboarding/submissions/${selectedSubmission?.id}`),
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch submission details");
      return response.json();
    },
    enabled: !!selectedSubmission?.id && isDetailsOpen,
  });

  const handleViewDetails = async (submission: OnboardingSubmission) => {
    setSelectedSubmission(submission);
    setShowSensitiveData(false); // Reset sensitive data visibility
    setIsDetailsOpen(true);
    // Reset file uploads when opening details
    setInsuranceCardFile(null);
    setInsuranceCardPreview(null);
    setDriversLicenseFiles([]);
    setDriversLicensePreviews([]);
  };

  // Handle insurance card file selection
  const handleInsuranceCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInsuranceCardFile(file);
      // Generate preview
      if (file.type === 'application/pdf') {
        setInsuranceCardPreview(null); // PDF preview handled separately
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setInsuranceCardPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Handle drivers license files selection
  const handleDriversLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setDriversLicenseFiles(fileArray);
      // Generate previews
      const previews: string[] = [];
      let loadedCount = 0;
      fileArray.forEach((file) => {
        if (file.type === 'application/pdf') {
          previews.push('');
          loadedCount++;
          if (loadedCount === fileArray.length) {
            setDriversLicensePreviews(previews);
          }
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            previews.push(reader.result as string);
            loadedCount++;
            if (loadedCount === fileArray.length) {
              setDriversLicensePreviews(previews);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // Remove insurance card file
  const handleRemoveInsuranceCard = () => {
    setInsuranceCardFile(null);
    setInsuranceCardPreview(null);
    const input = document.getElementById('insurance-card-input-forms') as HTMLInputElement;
    if (input) input.value = '';
  };

  // Remove drivers license file
  const handleRemoveDriversLicense = (index: number) => {
    const newFiles = driversLicenseFiles.filter((_, i) => i !== index);
    const newPreviews = driversLicensePreviews.filter((_, i) => i !== index);
    setDriversLicenseFiles(newFiles);
    setDriversLicensePreviews(newPreviews);
    if (newFiles.length === 0) {
      const input = document.getElementById('drivers-license-input-forms') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  // Mutation to update documents
  const updateDocumentsMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const formData = new FormData();
      
      if (insuranceCardFile) {
        formData.append("insuranceCard", insuranceCardFile);
      }
      
      if (driversLicenseFiles.length > 0) {
        driversLicenseFiles.forEach((file) => {
          formData.append("driversLicense", file);
        });
      }

      const response = await fetch(
        buildApiUrl(`/api/onboarding/submissions/${submissionId}/documents`),
        {
          method: "PUT",
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update documents");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Documents updated successfully",
      });
      // Reset file uploads
      setInsuranceCardFile(null);
      setInsuranceCardPreview(null);
      setDriversLicenseFiles([]);
      setDriversLicensePreviews([]);
      // Refetch submission details
      queryClient.invalidateQueries({ queryKey: ["onboarding-submission", selectedSubmission?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/submissions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update documents",
        variant: "destructive",
      });
    },
  });

  // Mutation to log sensitive data access
  const logAccessMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await fetch(
        buildApiUrl(`/api/onboarding/submissions/${submissionId}/log-access`),
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to log access");
      return response.json();
    },
    onSuccess: () => {
      setShowSensitiveData(true);
      setShowAccessConfirmation(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log access",
        variant: "destructive",
      });
    },
  });

  const handleRequestSensitiveData = () => {
    setShowAccessConfirmation(true);
  };

  const handleConfirmViewSensitiveData = () => {
    if (selectedSubmission?.id) {
      logAccessMutation.mutate(selectedSubmission.id);
    }
  };

  // Helper function to calculate age from date of birth
  const getAgeOrBirthYear = (birthday: string | null | undefined): string => {
    if (!birthday) return "Not provided";
    try {
      const birthDate = new Date(birthday);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return `Age ${age - 1}`;
      }
      return `Age ${age}`;
    } catch {
      // If parsing fails, try to extract just the year
      const yearMatch = birthday.match(/\d{4}/);
      if (yearMatch) {
        return `Birth Year: ${yearMatch[0]}`;
      }
      return "Not provided";
    }
  };

  // Helper function to format address (city, state ZIP only)
  const formatAddress = (
    city: string | null | undefined,
    state: string | null | undefined,
    zipCode: string | null | undefined
  ): string => {
    const parts: string[] = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (zipCode) parts.push(zipCode);
    return parts.length > 0 ? parts.join(", ") : "Not provided";
  };

  // Helper function to mask SSN (show last 4 or masked)
  const maskSSN = (ssn: string | null | undefined): string => {
    if (!ssn) return "Not provided";
    if (showSensitiveData) return ssn;
    if (ssn.length >= 4) {
      return `•••-••-${ssn.slice(-4)}`;
    }
    return "•••-••-••••";
  };

  // Helper function to mask account/routing number
  const maskAccountInfo = (value: string | null | undefined): string => {
    if (!value) return "Not provided";
    if (showSensitiveData) return value;
    if (value.length >= 3) {
      return `••••••${value.slice(-3)}`;
    }
    return "•••••••••";
  };

  // Filter form items based on visibility
  const getFormSections = (): FormSection[] => {
    const allItems: FormItem[] = [
      { id: "lyc", title: "Client Onboarding Form LYC", icon: FileText },
      { id: "contract", title: "Contract / Agreement", icon: FileText },
      { id: "car-on", title: "Car On-boarding", icon: Car },
      { id: "car-off", title: "Car Off-boarding", icon: LogOut },
    ];

    // If admin, show all forms
    if (formVisibilityData?.isAdmin) {
      return [
        {
          id: "client-onboarding",
          title: "Client Onboarding Form",
          icon: ClipboardList,
          items: allItems,
        },
      ];
    }

    // For non-admin roles, filter based on form visibility
    const visibleItems: FormItem[] = allItems
      .map((item) => {
        // Map form IDs to form names in database
        const formNameMap: Record<string, string> = {
          lyc: "Client Onboarding Form LYC",
          contract: "Contract / Agreement",
          "car-on": "Car On-boarding",
          "car-off": "Car Off-boarding",
        };

        const formName = formNameMap[item.id];
        if (!formName) return null;

        // Check visibility
        const visibility = formVisibilityData?.formVisibility?.[formName];
        if (!visibility || !visibility.isVisible) {
          return null; // Hide form
        }

        // Add external URL if available
        return {
          ...item,
          externalUrl: visibility.externalUrl ?? null,
        } as FormItem;
      })
      .filter((item): item is FormItem => item !== null);

    return [
      {
        id: "client-onboarding",
        title: "Client Onboarding Form",
        icon: ClipboardList,
        items: visibleItems,
      },
    ];
  };

  const formSections = getFormSections();

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-full">
        <Card className="bg-[#111111] border-[#EAEB80]/20 max-w-full overflow-hidden">
          <CardContent className="p-0 max-w-full overflow-hidden">
            {formSections.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.id);

              return (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1a1a1a] transition-colors"
                    data-testid={`button-section-${section.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <SectionIcon className="w-5 h-5 text-[#EAEB80]" />
                      <span className="text-white font-medium">
                        {section.title}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="bg-[#0d0d0d] max-w-full">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemExpanded = expandedItems.includes(item.id);
                        const canExpand =
                          (item.id === "lyc" ||
                            item.id === "contract" ||
                            item.id === "car-on" ||
                            item.id === "car-off") &&
                          !item.comingSoon;

                        return (
                          <div key={item.id}>
                            {item.externalUrl ? (
                              // External link - redirect for clients
                              <a
                                href={item.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "w-full flex items-center justify-between px-5 py-3.5 transition-colors border-t border-[#1a1a1a]",
                                  "hover:bg-[#1a1a1a] cursor-pointer"
                                )}
                                data-testid={`button-form-${item.id}`}
                              >
                                <div className="flex items-center gap-3 pl-6">
                                  <ItemIcon className="w-4 h-4 text-[#EAEB80]" />
                                  <span className="text-sm text-[#EAEB80]">
                                    {item.title}
                                  </span>
                                  <ExternalLink className="w-3 h-3 text-gray-500 ml-1" />
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              </a>
                            ) : (
                              // Internal form - expandable
                              <button
                                className={cn(
                                  "w-full flex items-center justify-between px-5 py-3.5 transition-colors border-t border-[#1a1a1a]",
                                  item.comingSoon
                                    ? "cursor-default"
                                    : "hover:bg-[#1a1a1a] cursor-pointer"
                                )}
                                disabled={item.comingSoon}
                                onClick={() => canExpand && toggleItem(item.id)}
                                data-testid={`button-form-${item.id}`}
                              >
                                <div className="flex items-center gap-3 pl-6">
                                  <ItemIcon
                                    className={cn(
                                      "w-4 h-4",
                                      item.comingSoon
                                        ? "text-gray-600"
                                        : "text-[#EAEB80]"
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "text-sm",
                                      item.comingSoon
                                        ? "text-gray-600"
                                        : "text-[#EAEB80]"
                                    )}
                                  >
                                    {item.title}
                                  </span>
                                  {item.comingSoon && (
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-800/50 text-gray-500 border-gray-700 text-xs ml-2"
                                    >
                                      Coming soon
                                    </Badge>
                                  )}
                                </div>
                                {canExpand ? (
                                  isItemExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  )
                                ) : (
                                  <ChevronRight
                                    className={cn(
                                      "w-4 h-4",
                                      item.comingSoon
                                        ? "text-gray-700"
                                        : "text-gray-500"
                                    )}
                                  />
                                )}
                              </button>
                            )}

                            {/* Expanded content for Contract Management */}
                            {isItemExpanded && item.id === "contract" && (
                              <div className="bg-[#050505] border-t border-[#1a1a1a] px-5 py-4">
                                <ContractManagement />
                              </div>
                            )}

                            {/* Expanded content for Car On-boarding */}
                            {isItemExpanded && item.id === "car-on" && (
                              <div className="bg-[#050505] border-t border-[#1a1a1a] px-3 sm:px-5 py-4 space-y-6 max-w-full">
                                {/* Show form for clients, table for admins */}
                                {formVisibilityData?.isAdmin ||
                                formVisibilityData?.isEmployee ? (
                                  <CarOnboarding />
                                ) : (
                                  <CarOnboardingForm />
                                )}
                              </div>
                            )}

                            {/* Expanded content for Car Off-boarding */}
                            {isItemExpanded && item.id === "car-off" && (
                              <div className="bg-[#050505] border-t border-[#1a1a1a] px-3 sm:px-5 py-4 space-y-6 max-w-full">
                                {/* Show form for clients, table for admins */}
                                {formVisibilityData?.isAdmin ||
                                formVisibilityData?.isEmployee ? (
                                  <CarOffboarding />
                                ) : (
                                  <CarOffboardingForm />
                                )}
                              </div>
                            )}

                            {/* Expanded content for LYC form */}
                            {isItemExpanded && item.id === "lyc" && (
                              <div className="bg-[#050505] border-t border-[#1a1a1a] px-3 sm:px-5 py-4 space-y-6 max-w-full">
                                {/* QR Code Section */}
                                <QRCodeSection />

                                <div className="mb-4">
                                  <h3 className="text-sm font-medium text-white mb-3">
                                    Recent Submissions
                                  </h3>
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <Input
                                      type="text"
                                      placeholder="Search by name, email, phone, or vehicle..."
                                      value={searchQuery}
                                      onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                      }
                                      className="pl-10 bg-[#111111] border-[#1a1a1a] text-white placeholder:text-gray-600"
                                    />
                                  </div>
                                </div>

                                {isLoadingSubmissions ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-[#EAEB80] animate-spin" />
                                  </div>
                                ) : submissionsError ? (
                                  <div className="text-center py-8 text-red-400">
                                    <p className="mb-2">
                                      Error loading submissions
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {submissionsError.message}
                                    </p>
                                  </div>
                                ) : submissionsData?.data &&
                                  submissionsData.data.length > 0 ? (
                                  <div className="w-full overflow-hidden">
                                  <div className="overflow-x-auto">
                                      <table className="w-full text-sm table-auto">
                                      <thead>
                                        <tr className="border-b border-[#1a1a1a]">
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs whitespace-nowrap">
                                            Name
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs hidden md:table-cell whitespace-nowrap">
                                            Email
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs hidden lg:table-cell whitespace-nowrap">
                                            Phone
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs whitespace-nowrap">
                                            Vehicle
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs hidden xl:table-cell whitespace-nowrap">
                                            VIN#
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs hidden xl:table-cell whitespace-nowrap">
                                            Plate #
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs hidden lg:table-cell whitespace-nowrap">
                                            Submitted
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs whitespace-nowrap">
                                            Status
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs hidden md:table-cell whitespace-nowrap">
                                            Contract
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs hidden 2xl:table-cell whitespace-nowrap">
                                            Car Onboarding Date
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs hidden 2xl:table-cell whitespace-nowrap">
                                            Car Offboarding Date
                                          </th>
                                          <th className="text-left py-3 px-2 sm:px-3 text-gray-400 font-medium text-xs whitespace-nowrap">
                                            Actions
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {submissionsData.data.map(
                                          (submission) => (
                                            <tr
                                              key={submission.id}
                                              className="border-b border-[#1a1a1a] hover:bg-[#111111] transition-colors"
                                            >
                                              <td className="py-3 px-2 sm:px-3 text-white text-xs sm:text-sm max-w-[120px] truncate" title={`${submission.firstNameOwner} ${submission.lastNameOwner}`}>
                                                {submission.firstNameOwner}{" "}
                                                {submission.lastNameOwner}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 text-gray-300 text-xs sm:text-sm hidden md:table-cell max-w-[150px] truncate" title={submission.emailOwner}>
                                                {submission.emailOwner}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 text-gray-300 text-xs sm:text-sm hidden lg:table-cell max-w-[120px] truncate" title={submission.phoneOwner}>
                                                {submission.phoneOwner}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 text-gray-300 text-xs sm:text-sm max-w-[150px] truncate" title={`${submission.vehicleMake} ${submission.vehicleModel} ${submission.vehicleYear}`}>
                                                {submission.vehicleMake}{" "}
                                                {submission.vehicleModel}{" "}
                                                {submission.vehicleYear}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 text-gray-300 font-mono text-xs hidden xl:table-cell max-w-[120px] truncate" title={submission.vinNumber || "N/A"}>
                                                {submission.vinNumber || (
                                                  <span className="text-gray-500">
                                                    N/A
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 text-gray-300 font-mono text-xs hidden xl:table-cell max-w-[100px] truncate" title={submission.licensePlate || "N/A"}>
                                                {submission.licensePlate || (
                                                  <span className="text-gray-500">
                                                    N/A
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 text-gray-400 text-xs sm:text-sm hidden lg:table-cell whitespace-nowrap">
                                                {new Date(
                                                  submission.createdAt
                                                ).toLocaleDateString()}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 whitespace-nowrap">
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    "text-xs",
                                                    submission.status ===
                                                      "pending"
                                                      ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                                                      : submission.status ===
                                                        "approved"
                                                      ? "border-green-500/50 text-green-500 bg-green-500/10"
                                                      : submission.status ===
                                                        "rejected"
                                                      ? "border-red-500/50 text-red-500 bg-red-500/10"
                                                      : "border-gray-500/50 text-gray-500 bg-gray-500/10"
                                                  )}
                                                >
                                                  {submission.status ||
                                                    "pending"}
                                                </Badge>
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 hidden md:table-cell whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                  {submission.contractStatus ===
                                                    "sent" && (
                                                    <Badge
                                                      variant="outline"
                                                      className="border-blue-500/50 text-blue-400 bg-blue-500/10 text-xs"
                                                    >
                                                      Sent
                                                    </Badge>
                                                  )}
                                                  {submission.contractStatus ===
                                                    "opened" && (
                                                    <Badge
                                                      variant="outline"
                                                      className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10 text-xs"
                                                    >
                                                      Opened
                                                    </Badge>
                                                  )}
                                                  {submission.contractStatus ===
                                                    "signed" && (
                                                    <>
                                                      <Badge
                                                        variant="outline"
                                                        className="border-green-500/50 text-green-400 bg-green-500/10 text-xs"
                                                      >
                                                        Signed
                                                      </Badge>
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                                                        onClick={() => {
                                                          // Use signed_contract_url from database if available
                                                          if (
                                                            submission.signedContractUrl
                                                          ) {
                                                            window.open(
                                                              submission.signedContractUrl,
                                                              "_blank"
                                                            );
                                                          } else {
                                                            // Fallback to old pattern if URL not in database
                                                            window.open(
                                                              buildApiUrl(
                                                                `/signed-contracts/submission_${submission.id}.pdf`
                                                              ),
                                                              "_blank"
                                                            );
                                                          }
                                                        }}
                                                      >
                                                        <ExternalLink className="w-3 h-3 mr-1" />
                                                        View PDF
                                                      </Button>
                                                    </>
                                                  )}
                                                  {submission.contractStatus ===
                                                    "declined" && (
                                                    <Badge
                                                      variant="outline"
                                                      className="border-red-500/50 text-red-400 bg-red-500/10 text-xs"
                                                    >
                                                      Declined
                                                    </Badge>
                                                  )}
                                                  {(!submission.contractStatus ||
                                                    submission.contractStatus ===
                                                      "pending") && (
                                                    <Badge
                                                      variant="outline"
                                                      className="bg-gray-800/50 text-gray-400 border-gray-700 text-xs"
                                                    >
                                                      Not Sent
                                                    </Badge>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 text-gray-300 text-xs sm:text-sm hidden 2xl:table-cell whitespace-nowrap">
                                                {submission.contractSignedAt ? (
                                                  new Date(
                                                    submission.contractSignedAt
                                                  ).toLocaleDateString()
                                                ) : (
                                                  <span className="text-gray-500">
                                                    Not signed
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 text-gray-300 text-xs sm:text-sm hidden 2xl:table-cell whitespace-nowrap">
                                                {submission.carOffboardAt ? (
                                                  new Date(
                                                    submission.carOffboardAt
                                                  ).toLocaleDateString()
                                                ) : (
                                                  <span className="text-gray-500">
                                                    N/A
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-2 sm:px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 hover:bg-gray-800"
                                                    onClick={() =>
                                                      handleViewDetails(
                                                        submission
                                                      )
                                                    }
                                                    title="View Details"
                                                  >
                                                    <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                                                  </Button>

                                                  {/* Always show Approve/Decline buttons for consistent layout */}
                                                  {/* Allow approval if contract is signed OR if contract status is null/empty (imported submissions) */}
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-[#d4af37]"
                                                    onClick={() => {
                                                      approvalMutation.mutate({
                                                        id: submission.id,
                                                        action: "approve",
                                                      });
                                                    }}
                                                    disabled={
                                                      (submission.contractStatus !== "signed" && 
                                                       submission.contractStatus !== null && 
                                                       submission.contractStatus !== undefined) ||
                                                      submission.status ===
                                                        "approved" ||
                                                      submission.status ===
                                                        "rejected" ||
                                                      approvalMutation.isPending
                                                    }
                                                    title={
                                                      (submission.contractStatus !== "signed" && 
                                                       submission.contractStatus !== null && 
                                                       submission.contractStatus !== undefined)
                                                        ? "Contract must be signed before approval"
                                                        : submission.status ===
                                                          "approved"
                                                        ? "Already approved"
                                                        : submission.status ===
                                                          "rejected"
                                                        ? "Already rejected"
                                                        : "Approve submission"
                                                    }
                                                  >
                                                    <CheckCircle className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-red-400"
                                                    onClick={() => {
                                                      setSubmissionToDecline(submission);
                                                      setShowDeclineModal(true);
                                                    }}
                                                    disabled={
                                                      (submission.contractStatus !== "signed" && 
                                                       submission.contractStatus !== null && 
                                                       submission.contractStatus !== undefined) ||
                                                      submission.status ===
                                                        "approved" ||
                                                      submission.status ===
                                                        "rejected" ||
                                                      approvalMutation.isPending
                                                    }
                                                    title={
                                                      (submission.contractStatus !== "signed" && 
                                                       submission.contractStatus !== null && 
                                                       submission.contractStatus !== undefined)
                                                        ? "Contract must be signed before decline"
                                                        : submission.status ===
                                                          "approved"
                                                        ? "Already approved"
                                                        : submission.status ===
                                                          "rejected"
                                                        ? "Already declined"
                                                        : "Decline submission"
                                                    }
                                                  >
                                                    <XCircle className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        )}
                                      </tbody>
                                    </table>
                                    </div>

                                    {/* Pagination */}
                                    {submissionsData.pagination && (
                                      <TablePagination
                                        totalItems={
                                          submissionsData.pagination.total
                                        }
                                        itemsPerPage={itemsPerPage}
                                        currentPage={page}
                                        onPageChange={(newPage) => {
                                          setPage(newPage);
                                          window.scrollTo({
                                            top: 0,
                                            behavior: "smooth",
                                          });
                                          window.scrollTo({
                                            top: 0,
                                            behavior: "smooth",
                                          });
                                        }}
                                        onItemsPerPageChange={(newLimit) => {
                                          setItemsPerPage(newLimit);
                                          setPage(1); // Reset to first page when changing limit
                                        }}
                                        isLoading={isLoadingSubmissions}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    No submissions found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Submission Details Dialog */}
      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setShowSensitiveData(false);
            setShowAccessConfirmation(false);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#111111] border-[#EAEB80]/30 border-2 text-white">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
            <DialogTitle className="text-white text-2xl">
              Complete Submission Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Full onboarding form submission information - All data from
              database
            </DialogDescription>
              </div>
              {!showSensitiveData && (
                <Button
                  onClick={handleRequestSensitiveData}
                  variant="outline"
                  className="bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                >
                  View Full Sensitive Information
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Confirmation Dialog for Sensitive Data Access */}
          <Dialog open={showAccessConfirmation} onOpenChange={setShowAccessConfirmation}>
            <DialogContent className="bg-[#111111] border-[#EAEB80]/30 border-2 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">
                  Access Sensitive Data
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-2">
                  This action is logged. Continue?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  onClick={() => setShowAccessConfirmation(false)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmViewSensitiveData}
                  disabled={logAccessMutation.isPending}
                  className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30"
                >
                  {logAccessMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {submissionDetails?.data ? (
            <div className="space-y-6 mt-4">
              {/* Helper function to display value or "Not provided" */}
              {(() => {
                const formatValue = (value: any): string => {
                  if (value === null || value === undefined || value === "")
                    return "Not provided";
                  return String(value);
                };

                const formatDate = (
                  dateStr: string | null | undefined
                ): string => {
                  if (!dateStr) return "Not provided";
                  try {
                    return new Date(dateStr).toLocaleString();
                  } catch {
                    return String(dateStr);
                  }
                };

                const formatCurrency = (value: string | null): string => {
                  if (!value) return "Not provided";
                  const num = parseFloat(value);
                  if (isNaN(num)) return value;
                  return `$${num.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                };

                const data = submissionDetails.data;

                // Helper function to check if a URL is a PDF
                const isPdfDocument = (url: string): boolean => {
                  if (!url) return false;
                  const lowerUrl = url.toLowerCase();
                  return lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf');
                };

                // Parse driversLicenseUrls if it's a string
                let driversLicenseUrlsArray: string[] = [];
                if (data.driversLicenseUrls) {
                  if (typeof data.driversLicenseUrls === 'string') {
                    try {
                      const parsed = JSON.parse(data.driversLicenseUrls);
                      driversLicenseUrlsArray = Array.isArray(parsed) ? parsed : [];
                    } catch {
                      driversLicenseUrlsArray = [];
                    }
                  } else if (Array.isArray(data.driversLicenseUrls)) {
                    driversLicenseUrlsArray = data.driversLicenseUrls;
                  }
                }

                return (
                  <>
                    {/* Personal Information */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Full Name:
                          </span>
                          <span className="text-white font-medium">
                            {formatValue(data.firstNameOwner)}{" "}
                            {formatValue(data.lastNameOwner)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Email:
                          </span>
                          <span className="text-white">
                            {formatValue(data.emailOwner)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Phone:
                          </span>
                          <span className="text-white">
                            {formatValue(data.phoneOwner)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Date of Birth:
                          </span>
                          <span className="text-white">
                            {showSensitiveData
                              ? formatValue(data.birthday)
                              : getAgeOrBirthYear(data.birthday)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            T-Shirt Size:
                          </span>
                          <span className="text-white">
                            {formatValue(data.tshirtSize)}
                          </span>
                        </div>
                        {showSensitiveData && (
                        <div>
                          <span className="text-gray-400 block mb-1">
                              SSN:
                          </span>
                            <span className="text-white font-mono">
                              {maskSSN(data.ssn)}
                          </span>
                        </div>
                        )}
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Representative:
                          </span>
                          <span className="text-white">
                            {formatValue(data.representative)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            How Did You Hear About Us:
                          </span>
                          <span className="text-white">
                            {formatValue(data.heardAboutUs)}
                          </span>
                        </div>
                        {showSensitiveData && (
                          <>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Emergency Contact Name:
                          </span>
                          <span className="text-white">
                            {formatValue(data.emergencyContactName)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Emergency Contact Phone:
                          </span>
                          <span className="text-white">
                            {formatValue(data.emergencyContactPhone)}
                          </span>
                        </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Address Information */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Address Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">
                            T-Shirt Size:
                          </span>
                          <span className="text-white">
                            {formatValue(data.tshirtSize)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            First Name:
                          </span>
                          <span className="text-white font-medium">
                            {formatValue(data.firstNameOwner)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Last Name:
                          </span>
                          <span className="text-white font-medium">
                            {formatValue(data.lastNameOwner)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Phone:
                          </span>
                          <span className="text-white">
                            {formatValue(data.phoneOwner)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Email:
                          </span>
                          <span className="text-white">
                            {formatValue(data.emailOwner)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Representative:
                          </span>
                          <span className="text-white">
                            {formatValue(data.representative)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            How Did You Hear About Us:
                          </span>
                          <span className="text-white">
                            {formatValue(data.heardAboutUs)}
                          </span>
                        </div>
                        {showSensitiveData && (
                          <div>
                            <span className="text-gray-400 block mb-1">
                              Date of Birth:
                            </span>
                            <span className="text-white">
                              {formatValue(data.birthday)}
                            </span>
                          </div>
                        )}
                        {showSensitiveData && (
                          <div className="md:col-span-2">
                            <span className="text-gray-400 block mb-1">
                              Street Address:
                            </span>
                            <span className="text-white">
                              {formatValue(data.streetAddress)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400 block mb-1">
                            City:
                          </span>
                          <span className="text-white">
                            {formatValue(data.city)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            State:
                          </span>
                          <span className="text-white">
                            {formatValue(data.state)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Zip Code:
                          </span>
                          <span className="text-white">
                            {formatValue(data.zipCode)}
                          </span>
                        </div>
                        {showSensitiveData && (
                          <>
                            <div>
                              <span className="text-gray-400 block mb-1">
                                Emergency Contact Name:
                              </span>
                              <span className="text-white">
                                {formatValue(data.emergencyContactName)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block mb-1">
                                Emergency Contact Phone:
                              </span>
                              <span className="text-white">
                                {formatValue(data.emergencyContactPhone)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Vehicle Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Year:
                          </span>
                          <span className="text-white">
                            {formatValue(data.vehicleYear)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Make:
                          </span>
                          <span className="text-white">
                            {formatValue(data.vehicleMake)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Model:
                          </span>
                          <span className="text-white">
                            {formatValue(data.vehicleModel)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Trim:
                          </span>
                          <span className="text-white">
                            {formatValue(data.vehicleTrim)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            VIN Number:
                          </span>
                          <span className="text-white font-mono text-xs">
                            {formatValue(data.vinNumber)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            License Plate:
                          </span>
                          <span className="text-white">
                            {formatValue(data.licensePlate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Mileage:
                          </span>
                          <span className="text-white">
                            {formatValue(data.vehicleMiles)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Exterior Color:
                          </span>
                          <span className="text-white">
                            {formatValue(data.exteriorColor)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Interior Color:
                          </span>
                          <span className="text-white">
                            {formatValue(data.interiorColor)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Title Type:
                          </span>
                          <span className="text-white">
                            {formatValue(data.titleType)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Registration Expiration:
                          </span>
                          <span className="text-white">
                            {formatValue(data.registrationExpiration)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Fuel Type:
                          </span>
                          <span className="text-white">
                            {formatValue(data.fuelType)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Vehicle Recall:
                          </span>
                          <span className="text-white">
                            {formatValue(data.vehicleRecall)}
                          </span>
                        </div>
                        {data.vehicleFeatures && (
                          <div className="md:col-span-2">
                            <span className="text-gray-400 block mb-2">
                              Features:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                let featuresArray: string[] = [];
                                try {
                                  if (typeof data.vehicleFeatures === 'string') {
                                    const parsed = JSON.parse(data.vehicleFeatures);
                                    featuresArray = Array.isArray(parsed) ? parsed : [];
                                  } else if (Array.isArray(data.vehicleFeatures)) {
                                    featuresArray = data.vehicleFeatures;
                                  }
                                } catch {
                                  featuresArray = [];
                                }
                                return featuresArray.length > 0 ? (
                                  featuresArray.map((feature: string, index: number) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="border-[#EAEB80]/50 text-[#EAEB80] bg-[#EAEB80]/10 text-xs"
                                    >
                                      {feature}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-500 text-sm">No features selected</span>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Does Your Vehicle Have Free Dealership Oil Changes?:
                          </span>
                          <span className="text-white">
                            {formatValue(data.freeDealershipOilChanges)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            If Yes, For How Many Years of Oil Changes OR What Oil Package:
                          </span>
                          <span className="text-white">
                            {data.freeDealershipOilChanges === "Yes" 
                              ? formatValue(data.oilPackageDetails)
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Recall Missing Error - Prominent overlay */}
                    {(!data.vehicleRecall || data.vehicleRecall.trim() === '' || data.vehicleRecall === 'Not provided') && (
                      <div className="relative my-4 z-20">
                        <div className="bg-white border-4 border-red-500 rounded-lg p-6 shadow-2xl flex items-center justify-center">
                          <p className="text-red-500 text-xl font-semibold text-center m-0">
                            Vehicle Recall is missing
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Financial Information */}
                    <div className={`bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20 ${(!data.vehicleRecall || data.vehicleRecall.trim() === '' || data.vehicleRecall === 'Not provided') ? 'opacity-30' : ''}`}>
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Financial Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Plate #:
                          </span>
                          <span className="text-white font-medium">
                            {formatCurrency(data.purchasePrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Down Payment:
                          </span>
                          <span className="text-white font-medium">
                            {formatCurrency(data.downPayment)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Monthly Payment:
                          </span>
                          <span className="text-white font-medium">
                            {formatCurrency(data.monthlyPayment)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Interest Rate:
                          </span>
                          <span className="text-white">
                            {formatValue(data.interestRate)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Transport City to City:
                          </span>
                          <span className="text-white">
                            {formatValue(data.transportCityToCity)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Ultimate Goal:
                          </span>
                          <span className="text-white">
                            {formatValue(data.ultimateGoal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Banking Information */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Banking Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Bank Name:
                          </span>
                          <span className="text-white">
                            {formatValue(data.bankName)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Tax Classification:
                          </span>
                          <span className="text-white">
                            {formatValue(data.taxClassification)}
                          </span>
                        </div>
                        {showSensitiveData && (
                          <>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Routing Number:
                          </span>
                          <span className="text-white font-mono">
                                {maskAccountInfo(data.routingNumber)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Account Number:
                          </span>
                          <span className="text-white font-mono">
                                {maskAccountInfo(data.accountNumber)}
                          </span>
                        </div>
                          </>
                        )}
                        {data.businessName && (
                          <div>
                            <span className="text-gray-400 block mb-1">
                              Business Name:
                            </span>
                            <span className="text-white">
                              {formatValue(data.businessName)}
                            </span>
                          </div>
                        )}
                        {data.ein && (
                          <div>
                            <span className="text-gray-400 block mb-1">
                              EIN:
                            </span>
                            <span className="text-white font-mono">
                              {showSensitiveData ? formatValue(data.ein) : maskAccountInfo(data.ein)}
                            </span>
                          </div>
                        )}
                        {data.ssn && (
                          <div>
                            <span className="text-gray-400 block mb-1">
                              SSN:
                            </span>
                            <span className="text-white font-mono">
                              {showSensitiveData ? formatValue(data.ssn) : maskAccountInfo(data.ssn)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Insurance Information */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Insurance Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Provider:
                          </span>
                          <span className="text-white">
                            {formatValue(data.insuranceProvider)}
                          </span>
                        </div>
                        {showSensitiveData && (
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Policy Number:
                          </span>
                          <span className="text-white">
                            {formatValue(data.policyNumber)}
                          </span>
                        </div>
                        )}
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Insurance Phone:
                          </span>
                          <span className="text-white">
                            {formatValue(data.insurancePhone)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Insurance Expiration:
                          </span>
                          <span className="text-white">
                            {formatValue(data.insuranceExpiration)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contract Status */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Contract Status & Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Contract Status:
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-1",
                              data.contractStatus === "signed"
                                ? "border-green-500/50 text-green-400 bg-green-500/10"
                                : data.contractStatus === "sent"
                                ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                                : data.contractStatus === "opened"
                                ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                : data.contractStatus === "declined"
                                ? "border-red-500/50 text-red-400 bg-red-500/10"
                                : "border-gray-500/50 text-gray-400 bg-gray-500/10"
                            )}
                          >
                            {formatValue(data.contractStatus || "Not sent")}
                          </Badge>
                        </div>
                        {showSensitiveData && (
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Contract Token:
                          </span>
                          <span className="text-white font-mono text-xs break-all">
                            {formatValue(data.contractToken)}
                          </span>
                        </div>
                        )}
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Contract Sent At:
                          </span>
                          <span className="text-white">
                            {formatDate(data.contractSentAt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Contract Signed At:
                          </span>
                          <span className="text-white">
                            {formatDate(data.contractSignedAt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Reminder Count:
                          </span>
                          <span className="text-white font-medium">
                            {data.reminderCount || 0} / 3
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Last Reminder Sent:
                          </span>
                          <span className="text-white">
                            {formatDate(data.lastReminderSentAt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Next Reminder Due:
                          </span>
                          <span className="text-white">
                            {formatDate(data.nextReminderDueAt)}
                          </span>
                        </div>
                        {data.contractStatus === "signed" && (
                          <div className="md:col-span-2">
                            <Button
                              onClick={() => {
                                if (data.signedContractUrl) {
                                  // signedContractUrl is a full URL, use it directly
                                  window.open(data.signedContractUrl, "_blank");
                                } else {
                                  // Fallback to old pattern if URL not in database
                                  window.open(
                                    buildApiUrl(
                                      `/signed-contracts/submission_${data.id}.pdf`
                                    ),
                                    "_blank"
                                  );
                                  window.open(
                                    buildApiUrl(
                                      `/signed-contracts/submission_${data.id}.pdf`
                                    ),
                                    "_blank"
                                  );
                                }
                              }}
                              className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Signed PDF
                            </Button>
                          </div>
                        )}
                      </div>
                      </div>

                    {/* Health Insurance Card & Driver's License */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#EAEB80]/30">
                        <h3 className="text-lg font-semibold text-[#EAEB80]">
                          Documents
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Health Insurance Card */}
                        <div className="space-y-4">
                          <h4 className="text-base font-semibold text-gray-200">Insurance Card</h4>
                          
                          {/* Insurance Card Display */}
                          {data.insuranceCardUrl ? (() => {
                            const documentUrl = data.insuranceCardUrl.startsWith('http') 
                              ? data.insuranceCardUrl 
                              : buildApiUrl(data.insuranceCardUrl);
                            const isPdf = isPdfDocument(data.insuranceCardUrl);
                            
                            return (
                              <div 
                                className="relative group cursor-pointer"
                                onClick={() => {
                                  setFullScreenDocument({ url: documentUrl, type: 'insurance', isPdf });
                                }}
                              >
                                <div className={`relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border-2 transition-all overflow-hidden shadow-lg ${
                                  isPdf 
                                    ? 'border-[#EAEB80]/50 hover:border-[#EAEB80] shadow-[#EAEB80]/20' 
                                    : 'border-[#EAEB80]/30 hover:border-[#EAEB80] shadow-[#EAEB80]/20'
                                }`}>
                                  {isPdf ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                      <FileText className="w-16 h-16 text-[#EAEB80] mb-2" />
                                      <p className="text-[#EAEB80] text-sm font-semibold">PDF Document</p>
                                      <p className="text-gray-400 text-xs mt-1">Click to open in PDF viewer</p>
                                    </div>
                                  ) : (
                                    <img
                                      src={documentUrl}
                                      alt="Insurance Card"
                                      className="w-full h-full object-contain p-2"
                                      onError={(e) => {
                                        console.error('Failed to load insurance card image:', data.insuranceCardUrl);
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        const parent = target.parentElement?.parentElement;
                                        if (parent && !parent.querySelector(".error-message")) {
                                          const errorDiv = document.createElement("div");
                                          errorDiv.className = "error-message text-sm text-gray-500 absolute inset-0 flex items-center justify-center";
                                          errorDiv.textContent = "Failed to load image";
                                          parent.appendChild(errorDiv);
                                        }
                                      }}
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                      {isPdf ? 'Click to open PDF' : 'Click to view full screen'}
                            </div>
                                  </div>
                                  {isPdf && (
                                    <div className="absolute top-2 right-2 bg-[#EAEB80]/90 text-black text-xs px-2 py-1 rounded font-semibold">
                                      PDF
                          </div>
                        )}
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border border-gray-700 flex items-center justify-center">
                              <p className="text-sm text-gray-500">No insurance card uploaded</p>
                            </div>
                          )}
                        </div>

                        {/* Driver's License */}
                        <div className="space-y-4">
                          <h4 className="text-base font-semibold text-gray-200">Driver License</h4>
                          
                          {/* Driver's License Display */}
                          {driversLicenseUrlsArray.length > 0 ? (
                            <div className="space-y-4">
                              {driversLicenseUrlsArray.map((url: string, index: number) => {
                                const documentUrl = url.startsWith('http') ? url : buildApiUrl(url);
                                const isPdf = isPdfDocument(url);
                                
                                return (
                                  <div 
                                    key={index}
                                    className="relative group cursor-pointer"
                                    onClick={() => setFullScreenDocument({ url: documentUrl, type: 'license', index, isPdf })}
                                  >
                                    <div className={`relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border-2 transition-all overflow-hidden shadow-lg ${
                                      isPdf 
                                        ? 'border-[#EAEB80]/50 hover:border-[#EAEB80] shadow-[#EAEB80]/20' 
                                        : 'border-[#EAEB80]/30 hover:border-[#EAEB80] shadow-[#EAEB80]/20'
                                    }`}>
                                      {isPdf ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                          <FileText className="w-16 h-16 text-[#EAEB80] mb-2" />
                                          <p className="text-[#EAEB80] text-sm font-semibold">PDF Document</p>
                                          <p className="text-gray-400 text-xs mt-1">Click to open in PDF viewer</p>
                                        </div>
                                      ) : (
                                        <img
                                          src={documentUrl}
                                          alt={`Driver's License ${index + 1}`}
                                          className="w-full h-full object-contain p-2"
                                          onError={(e) => {
                                            console.error('Failed to load drivers license image:', url);
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = "none";
                                            const parent = target.parentElement?.parentElement;
                                            if (parent && !parent.querySelector(".error-message")) {
                                              const errorDiv = document.createElement("div");
                                              errorDiv.className = "error-message text-sm text-gray-500 absolute inset-0 flex items-center justify-center";
                                              errorDiv.textContent = "Failed to load image";
                                              parent.appendChild(errorDiv);
                                            }
                                          }}
                                        />
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                          {isPdf ? 'Click to open PDF' : 'Click to view full screen'}
                                        </div>
                                      </div>
                                      {isPdf && (
                                        <div className="absolute top-2 right-2 bg-[#EAEB80]/90 text-black text-xs px-2 py-1 rounded font-semibold">
                                          PDF
                                        </div>
                                      )}
                                      {driversLicenseUrlsArray.length > 1 && (
                                        <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                          {index + 1} / {driversLicenseUrlsArray.length}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border border-gray-700 flex items-center justify-center">
                              <p className="text-sm text-gray-500">No driver's license uploaded</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Timestamps
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Created At:
                          </span>
                          <span className="text-white">
                            {formatDate(data.createdAt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Last Updated:
                          </span>
                          <span className="text-white">
                            {formatDate(data.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#EAEB80] animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Decline Reason Modal */}
      <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#EAEB80]">
              Decline Submission
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide a reason for declining this submission. The client will receive an email with this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {submissionToDecline && (
              <div className="text-sm text-gray-300">
                <p>
                  <span className="text-gray-500">Client:</span>{" "}
                  {submissionToDecline.firstNameOwner}{" "}
                  {submissionToDecline.lastNameOwner}
                </p>
                <p>
                  <span className="text-gray-500">Email:</span>{" "}
                  {submissionToDecline.emailOwner}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="decline-reason" className="text-gray-300">
                Reason for Decline <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter reason for declining this submission..."
                className="bg-[#111111] border-[#1a1a1a] text-white placeholder:text-gray-600 min-h-[100px]"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                  setSubmissionToDecline(null);
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!declineReason.trim()) {
                    toast({
                      title: "Reason Required",
                      description: "Please provide a reason for declining.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (submissionToDecline) {
                    approvalMutation.mutate({
                      id: submissionToDecline.id,
                      action: "reject",
                      reason: declineReason.trim(),
                    });
                  }
                }}
                disabled={!declineReason.trim() || approvalMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {approvalMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Declining...
                  </>
                ) : (
                  "Decline Submission"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Document Viewer Dialog */}
      {fullScreenDocument && (
        <div 
          className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center"
          onClick={() => setFullScreenDocument(null)}
        >
          {/* Close Button - Top Right Corner */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setFullScreenDocument(null);
            }}
            className="fixed top-4 right-4 z-[9999] h-14 w-14 bg-red-600/90 hover:bg-red-600 text-white border-2 border-white rounded-full shadow-2xl backdrop-blur-sm transition-all hover:scale-110 flex items-center justify-center"
            aria-label="Close full screen view"
            style={{
              position: 'fixed',
              top: '1rem',
              right: '1rem',
              zIndex: 9999,
            }}
          >
            <X className="w-8 h-8" strokeWidth={3} />
          </Button>

          <div className="relative w-full h-full flex items-center justify-center p-8">
            {/* Image Counter - Bottom Center (for multiple drivers licenses) */}
            {fullScreenDocument.type === 'license' && 
             submissionDetails?.data?.driversLicenseUrls && 
             fullScreenDocument.index !== undefined && (() => {
               let driversLicenseUrlsArray: string[] = [];
               if (submissionDetails.data.driversLicenseUrls) {
                 if (typeof submissionDetails.data.driversLicenseUrls === 'string') {
                   try {
                     const parsed = JSON.parse(submissionDetails.data.driversLicenseUrls);
                     driversLicenseUrlsArray = Array.isArray(parsed) ? parsed : [];
                   } catch {
                     driversLicenseUrlsArray = [];
                   }
                 } else if (Array.isArray(submissionDetails.data.driversLicenseUrls)) {
                   driversLicenseUrlsArray = submissionDetails.data.driversLicenseUrls;
                 }
               }
               return driversLicenseUrlsArray.length > 1 ? (
                 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[101] bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-white/40 shadow-2xl">
                   <span className="text-white text-base font-semibold tracking-wide">
                     {fullScreenDocument.index + 1} / {driversLicenseUrlsArray.length}
                   </span>
                 </div>
               ) : null;
             })()}

            {/* Navigation Buttons (for multiple drivers licenses) */}
            {fullScreenDocument.type === 'license' && 
             submissionDetails?.data?.driversLicenseUrls && 
             fullScreenDocument.index !== undefined && (() => {
               let driversLicenseUrlsArray: string[] = [];
               if (submissionDetails.data.driversLicenseUrls) {
                 if (typeof submissionDetails.data.driversLicenseUrls === 'string') {
                   try {
                     const parsed = JSON.parse(submissionDetails.data.driversLicenseUrls);
                     driversLicenseUrlsArray = Array.isArray(parsed) ? parsed : [];
                   } catch {
                     driversLicenseUrlsArray = [];
                   }
                 } else if (Array.isArray(submissionDetails.data.driversLicenseUrls)) {
                   driversLicenseUrlsArray = submissionDetails.data.driversLicenseUrls;
                 }
               }
               return driversLicenseUrlsArray.length > 1 ? (
                 <>
                   {/* Previous Button */}
                   {fullScreenDocument.index > 0 && (
                     <Button
                       variant="ghost"
                       size="icon"
                       onClick={(e) => {
                         e.stopPropagation();
                         const prevIndex = fullScreenDocument.index! - 1;
                         const prevUrl = driversLicenseUrlsArray[prevIndex];
                         const imageUrl = prevUrl.startsWith('http') ? prevUrl : buildApiUrl(prevUrl);
                         const isPdf = prevUrl.toLowerCase().endsWith('.pdf') || prevUrl.toLowerCase().includes('.pdf');
                         setFullScreenDocument({ 
                           url: imageUrl, 
                           type: 'license', 
                           index: prevIndex,
                           isPdf
                         });
                       }}
                       className="fixed left-6 top-1/2 -translate-y-1/2 z-[200] h-14 w-14 bg-black/90 hover:bg-[#EAEB80]/20 text-white border-2 border-white/60 rounded-full shadow-2xl backdrop-blur-sm transition-all hover:scale-110"
                       aria-label="Previous image"
                     >
                       <ChevronLeft className="w-6 h-6" />
                     </Button>
                   )}

                   {/* Next Button */}
                   {fullScreenDocument.index < driversLicenseUrlsArray.length - 1 && (
                     <Button
                       variant="ghost"
                       size="icon"
                       onClick={(e) => {
                         e.stopPropagation();
                         const nextIndex = fullScreenDocument.index! + 1;
                         const nextUrl = driversLicenseUrlsArray[nextIndex];
                         const imageUrl = nextUrl.startsWith('http') ? nextUrl : buildApiUrl(nextUrl);
                         const isPdf = nextUrl.toLowerCase().endsWith('.pdf') || nextUrl.toLowerCase().includes('.pdf');
                         setFullScreenDocument({ 
                           url: imageUrl, 
                           type: 'license', 
                           index: nextIndex,
                           isPdf
                         });
                       }}
                       className="fixed right-6 top-1/2 -translate-y-1/2 z-[200] h-14 w-14 bg-black/90 hover:bg-[#EAEB80]/20 text-white border-2 border-white/60 rounded-full shadow-2xl backdrop-blur-sm transition-all hover:scale-110"
                       aria-label="Next image"
                     >
                       <ChevronRight className="w-6 h-6" />
                     </Button>
                   )}
                 </>
               ) : null;
             })()}

            {/* Full Screen Document Display - PDF or Image */}
            {fullScreenDocument.isPdf ? (
              <iframe
                src={fullScreenDocument.url}
                className="w-full h-full border-0"
                style={{
                  maxWidth: '100vw',
                  maxHeight: '100vh',
                }}
                onClick={(e) => e.stopPropagation()}
                title={fullScreenDocument.type === 'insurance' ? 'Insurance Card PDF' : `Driver's License PDF ${fullScreenDocument.index !== undefined ? fullScreenDocument.index + 1 : ''}`}
              />
            ) : (
              <img
                src={fullScreenDocument.url}
                alt={fullScreenDocument.type === 'insurance' ? 'Insurance Card' : `Driver's License ${fullScreenDocument.index !== undefined ? fullScreenDocument.index + 1 : ''}`}
                className="w-full h-full object-contain"
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '100vw',
                  maxHeight: '100vh',
                }}
                onError={(e) => {
                  console.error('Failed to load image in full screen viewer:', fullScreenDocument.url);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}