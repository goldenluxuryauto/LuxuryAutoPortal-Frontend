import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import { TablePagination, ItemsPerPage } from "@/components/ui/table-pagination";

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Client Onboarding Form LYC",
          text: "Fill out the Golden Luxury Auto client onboarding form",
          url: onboardingUrl,
        });
        toast({
          title: "Shared successfully",
          description: "The form link has been shared.",
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          // Copy to clipboard as fallback
          navigator.clipboard.writeText(onboardingUrl);
          toast({
            title: "Link copied",
            description: "Onboarding form URL copied to clipboard.",
          });
        }
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(onboardingUrl);
      toast({
        title: "Link copied",
        description: "Onboarding form URL copied to clipboard.",
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
              <Button
                onClick={handleShare}
                className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium w-full lg:w-auto"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share with Client
              </Button>
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
      console.log("✅ [FORMS PAGE] Submissions received:", {
        success: data.success,
        count: data.data?.length || 0,
        total: data.pagination?.total || 0,
      });
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
    mutationFn: async ({ id, action }: { id: number; action: "approve" | "reject" }) => {
      const response = await fetch(buildApiUrl(`/api/onboarding/submissions/${id}/${action}`), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `Failed to ${action} submission` }));
        throw new Error(error.error || `Failed to ${action} submission`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.action === "approve" ? "Submission Approved" : "Submission Rejected",
        description: variables.action === "approve" 
          ? "Create account email has been sent to the client."
          : "Submission has been rejected.",
      });
      // Invalidate and refetch submissions
      queryClient.invalidateQueries({ queryKey: ["onboarding-submissions"] });
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
    setIsDetailsOpen(true);
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
      <div className="space-y-6">
        <Card className="bg-[#111111] border-[#EAEB80]/20">
          <CardContent className="p-0">
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
                    <div className="bg-[#0d0d0d]">
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
                              <div className="bg-[#050505] border-t border-[#1a1a1a] px-5 py-4 space-y-6">
                                {/* Show form for clients, table for admins */}
                                {formVisibilityData?.isAdmin || formVisibilityData?.isEmployee ? (
                                  <CarOnboarding />
                                ) : (
                                  <CarOnboardingForm />
                                )}
                              </div>
                            )}

                            {/* Expanded content for Car Off-boarding */}
                            {isItemExpanded && item.id === "car-off" && (
                              <div className="bg-[#050505] border-t border-[#1a1a1a] px-5 py-4 space-y-6">
                                {/* Show form for clients, table for admins */}
                                {formVisibilityData?.isAdmin || formVisibilityData?.isEmployee ? (
                                  <CarOffboarding />
                                ) : (
                                  <CarOffboardingForm />
                                )}
                              </div>
                            )}

                            {/* Expanded content for LYC form */}
                            {isItemExpanded && item.id === "lyc" && (
                              <div className="bg-[#050505] border-t border-[#1a1a1a] px-5 py-4 space-y-6">
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
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-[#1a1a1a]">
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Name
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Email
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Phone
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Vehicle
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            VIN#
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Plate #
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Submitted
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Status
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Contract
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Car Onboarding Date
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Car Offboarding Date
                                          </th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">
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
                                              <td className="py-3 px-4 text-white">
                                                {submission.firstNameOwner}{" "}
                                                {submission.lastNameOwner}
                                              </td>
                                              <td className="py-3 px-4 text-gray-300">
                                                {submission.emailOwner}
                                              </td>
                                              <td className="py-3 px-4 text-gray-300">
                                                {submission.phoneOwner}
                                              </td>
                                              <td className="py-3 px-4 text-gray-300">
                                                {submission.vehicleMake}{" "}
                                                {submission.vehicleModel}{" "}
                                                {submission.vehicleYear}
                                              </td>
                                              <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                                                {submission.vinNumber || (
                                                  <span className="text-gray-500">
                                                    N/A
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                                                {submission.licensePlate || (
                                                  <span className="text-gray-500">
                                                    N/A
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-4 text-gray-400">
                                                {new Date(
                                                  submission.createdAt
                                                ).toLocaleDateString()}
                                              </td>
                                              <td className="py-3 px-4">
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
                                              <td className="py-3 px-4">
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
                                              <td className="py-3 px-4 text-gray-300">
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
                                              <td className="py-3 px-4">
                                                {submission.isOffboarded ? (
                                                  <div className="flex flex-col gap-1">
                                                    <Badge
                                                      variant="outline"
                                                      className="border-red-500/50 text-red-400 bg-red-500/10 text-xs"
                                                    >
                                                      Offboarded
                                                    </Badge>
                                                    {submission.carOffboardAt && (
                                                      <span className="text-xs text-gray-500">
                                                        {new Date(
                                                          submission.carOffboardAt
                                                        ).toLocaleDateString()}
                                                      </span>
                                                    )}
                                                    {submission.carOffboardReason && (
                                                      <span className="text-xs text-gray-500 capitalize">
                                                        {submission.carOffboardReason.replace(
                                                          "_",
                                                          " "
                                                        )}
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <Badge
                                                    variant="outline"
                                                    className="border-green-500/50 text-green-400 bg-green-500/10 text-xs"
                                                  >
                                                    Active
                                                  </Badge>
                                                )}
                                              </td>
                                              <td className="py-3 px-4">
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
                                                  
                                                  {/* Always show Approve/Reject buttons for consistent layout */}
                                                  {/* Disable them if contract is not signed or already approved/rejected */}
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 hover:bg-green-500/20"
                                                    onClick={() => {
                                                      if (confirm(`Approve ${submission.firstNameOwner} ${submission.lastNameOwner}?\n\nThis will send them the create account email.`)) {
                                                        approvalMutation.mutate({ id: submission.id, action: "approve" });
                                                      }
                                                    }}
                                                    disabled={
                                                      submission.contractStatus !== "signed" || 
                                                      submission.status === "approved" || 
                                                      submission.status === "rejected" ||
                                                      approvalMutation.isPending
                                                    }
                                                    title={
                                                      submission.contractStatus !== "signed"
                                                        ? "Contract must be signed before approval"
                                                        : submission.status === "approved"
                                                        ? "Already approved"
                                                        : submission.status === "rejected"
                                                        ? "Already rejected"
                                                        : "Approve and send create account email"
                                                    }
                                                  >
                                                    <CheckCircle className={cn(
                                                      "w-4 h-4",
                                                      submission.contractStatus === "signed" && 
                                                      submission.status !== "approved" && 
                                                      submission.status !== "rejected"
                                                        ? "text-green-400 hover:text-green-300"
                                                        : "text-gray-600"
                                                    )} />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 hover:bg-red-500/20"
                                                    onClick={() => {
                                                      if (confirm(`Reject ${submission.firstNameOwner} ${submission.lastNameOwner}?`)) {
                                                        approvalMutation.mutate({ id: submission.id, action: "reject" });
                                                      }
                                                    }}
                                                    disabled={
                                                      submission.contractStatus !== "signed" || 
                                                      submission.status === "approved" || 
                                                      submission.status === "rejected" ||
                                                      approvalMutation.isPending
                                                    }
                                                    title={
                                                      submission.contractStatus !== "signed"
                                                        ? "Contract must be signed before rejection"
                                                        : submission.status === "approved"
                                                        ? "Already approved"
                                                        : submission.status === "rejected"
                                                        ? "Already rejected"
                                                        : "Reject submission"
                                                    }
                                                  >
                                                    <XCircle className={cn(
                                                      "w-4 h-4",
                                                      submission.contractStatus === "signed" && 
                                                      submission.status !== "approved" && 
                                                      submission.status !== "rejected"
                                                        ? "text-red-400 hover:text-red-300"
                                                        : "text-gray-600"
                                                    )} />
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        )}
                                      </tbody>
                                    </table>
                                    
                                    {/* Pagination */}
                                    {submissionsData.pagination && (
                                      <TablePagination
                                        totalItems={submissionsData.pagination.total}
                                        itemsPerPage={itemsPerPage}
                                        currentPage={page}
                                        onPageChange={(newPage) => {
                                          setPage(newPage);
                                          window.scrollTo({ top: 0, behavior: "smooth" });
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
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#111111] border-[#EAEB80]/30 border-2 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              Complete Submission Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Full onboarding form submission information - All data from
              database
            </DialogDescription>
          </DialogHeader>

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
                            {formatValue(data.birthday)}
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
                        <div>
                          <span className="text-gray-400 block mb-1">
                            SSN (Last 4):
                          </span>
                          <span className="text-white">
                            {formatValue(data.ssn)
                              ? data.ssn?.slice(-4) || "Not provided"
                              : "Not provided"}
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
                      </div>
                    </div>

                    {/* Address Information */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                      <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                        Address Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="md:col-span-2">
                          <span className="text-gray-400 block mb-1">
                            Street Address:
                          </span>
                          <span className="text-white">
                            {formatValue(data.streetAddress)}
                          </span>
                        </div>
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
                      </div>
                    </div>

                    {/* Financial Information */}
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
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
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Routing Number:
                          </span>
                          <span className="text-white font-mono">
                            {formatValue(data.routingNumber)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Account Number:
                          </span>
                          <span className="text-white font-mono">
                            {formatValue(data.accountNumber)}
                          </span>
                        </div>
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
                              {formatValue(data.ein)}
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
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Policy Number:
                          </span>
                          <span className="text-white">
                            {formatValue(data.policyNumber)}
                          </span>
                        </div>
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
                        <div>
                          <span className="text-gray-400 block mb-1">
                            Contract Token:
                          </span>
                          <span className="text-white font-mono text-xs break-all">
                            {formatValue(data.contractToken)}
                          </span>
                        </div>
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

                      {/* Signature Image */}
                      {data.contractStatus === "signed" &&
                        data.signatureData && (
                          <div className="mt-4 pt-4 border-t border-[#EAEB80]/30">
                            <span className="text-gray-400 block mb-2">
                              Digital Signature:
                            </span>
                            <div className="bg-white p-4 rounded border border-[#EAEB80]/30">
                              <img
                                src={data.signatureData}
                                alt="Client Signature"
                                className="max-w-full h-auto"
                                style={{ maxHeight: "200px" }}
                              />
                            </div>
                          </div>
                        )}
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
    </AdminLayout>
  );
}
