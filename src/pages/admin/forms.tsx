import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Check,
  X,
  Send,
  FileCheck,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";

interface FormItem {
  id: string;
  title: string;
  icon: any;
  comingSoon?: boolean;
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
  createdAt: string;
  status: string;
  contractStatus?: "pending" | "sent" | "opened" | "signed" | "declined" | null;
  contractSignedAt?: string | null;
  [key: string]: any; // For full submission details
}

export default function FormsPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>(["client-onboarding"]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<OnboardingSubmission | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleItem = (itemId: string) => {
    if (itemId === "lyc") {
      setExpandedItems(prev =>
        prev.includes(itemId)
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
    }
  };

  // Fetch submissions for LYC form
  const { data: submissionsData, isLoading: isLoadingSubmissions, error: submissionsError } = useQuery<{
    success: boolean;
    data: OnboardingSubmission[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["onboarding-submissions", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
      });
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const url = buildApiUrl(`/api/onboarding/submissions?${params.toString()}`);
      console.log("🔍 [FORMS PAGE] Fetching submissions from:", url);
      
      const response = await fetch(url, {
        credentials: "include", // Include cookies for session authentication
      });
      
      console.log("📥 [FORMS PAGE] Response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch submissions" }));
        console.error("❌ [FORMS PAGE] API error:", errorData);
        throw new Error(errorData.error || `Failed to fetch submissions: ${response.status} ${response.statusText}`);
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
      const newSignedIds = Array.from(currentSignedIds).filter(id => !previousSignedIds.has(id));
      
      newSignedIds.forEach((id) => {
        const submission = submissionsData.data.find((s: OnboardingSubmission) => s.id === id);
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

  // Fetch full submission details for viewing
  const { data: submissionDetails } = useQuery<{ success: boolean; data: OnboardingSubmission }>({
    queryKey: ["onboarding-submission", selectedSubmission?.id],
    queryFn: async () => {
      const response = await fetch(buildApiUrl(`/api/onboarding/submissions/${selectedSubmission?.id}`), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch submission details");
      return response.json();
    },
    enabled: !!selectedSubmission?.id && isDetailsOpen,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "rejected" }) => {
      const response = await fetch(buildApiUrl(`/api/onboarding/submissions/${id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-submissions"] });
      toast({
        title: "Status updated",
        description: "Submission status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = async (submission: OnboardingSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailsOpen(true);
  };

  const handleApprove = (id: number) => {
    updateStatusMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    updateStatusMutation.mutate({ id, status: "rejected" });
  };

  const formSections: FormSection[] = [
    {
      id: "client-onboarding",
      title: "Client Onboarding Form",
      icon: ClipboardList,
      items: [
        { id: "lyc", title: "Client Onboarding Form LYC", icon: FileText },
        { id: "contract", title: "Contract / Agreement", icon: FileText, comingSoon: true },
        { id: "car-on", title: "Car On-boarding", icon: Car, comingSoon: true },
        { id: "car-off", title: "Car Off-boarding", icon: LogOut, comingSoon: true },
      ],
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Forms</h1>
          <p className="text-gray-500 text-sm">Manage client and vehicle forms</p>
        </div>

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
                      <span className="text-white font-medium">{section.title}</span>
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
                        const canExpand = item.id === "lyc" && !item.comingSoon;

                        return (
                          <div key={item.id}>
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
                              <ItemIcon className={cn(
                                "w-4 h-4",
                                item.comingSoon ? "text-gray-600" : "text-[#EAEB80]"
                              )} />
                              <span className={cn(
                                "text-sm",
                                item.comingSoon ? "text-gray-600" : "text-[#EAEB80]"
                              )}>
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
                            <ChevronRight className={cn(
                              "w-4 h-4",
                              item.comingSoon ? "text-gray-700" : "text-gray-500"
                            )} />
                              )}
                          </button>

                            {/* Expanded content for LYC form */}
                            {isItemExpanded && item.id === "lyc" && (
                              <div className="bg-[#050505] border-t border-[#1a1a1a] px-5 py-4">
                                <div className="mb-4">
                                  <h3 className="text-sm font-medium text-white mb-3">Recent Submissions</h3>
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <Input
                                      type="text"
                                      placeholder="Search by name, email, phone, or vehicle..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
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
                                    <p className="mb-2">Error loading submissions</p>
                                    <p className="text-sm text-gray-500">{submissionsError.message}</p>
                                  </div>
                                ) : submissionsData?.data && submissionsData.data.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-[#1a1a1a]">
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Phone</th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Vehicle</th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Submitted</th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Contract</th>
                                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {submissionsData.data.map((submission) => (
                                          <tr
                                            key={submission.id}
                                            className="border-b border-[#1a1a1a] hover:bg-[#111111] transition-colors"
                                          >
                                            <td className="py-3 px-4 text-white">
                                              {submission.firstNameOwner} {submission.lastNameOwner}
                                            </td>
                                            <td className="py-3 px-4 text-gray-300">{submission.emailOwner}</td>
                                            <td className="py-3 px-4 text-gray-300">{submission.phoneOwner}</td>
                                            <td className="py-3 px-4 text-gray-300">
                                              {submission.vehicleYear} {submission.vehicleMake} {submission.vehicleModel}
                                            </td>
                                            <td className="py-3 px-4 text-gray-400">
                                              {new Date(submission.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4">
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "text-xs",
                                                  submission.status === "pending"
                                                    ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                                                    : submission.status === "approved"
                                                    ? "border-green-500/50 text-green-500 bg-green-500/10"
                                                    : submission.status === "rejected"
                                                    ? "border-red-500/50 text-red-500 bg-red-500/10"
                                                    : "border-gray-500/50 text-gray-500 bg-gray-500/10"
                                                )}
                                              >
                                                {submission.status || "pending"}
                                              </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                              <div className="flex items-center gap-2">
                                                {submission.contractStatus === "sent" && (
                                                  <Badge
                                                    variant="outline"
                                                    className="border-blue-500/50 text-blue-400 bg-blue-500/10 text-xs"
                                                  >
                                                    Sent
                                                  </Badge>
                                                )}
                                                {submission.contractStatus === "opened" && (
                                                  <Badge
                                                    variant="outline"
                                                    className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10 text-xs"
                                                  >
                                                    Opened
                                                  </Badge>
                                                )}
                                                {submission.contractStatus === "signed" && (
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
                                                        window.open(buildApiUrl(`/signed-contracts/submission_${submission.id}.pdf`), "_blank");
                                                      }}
                                                    >
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      View PDF
                                                    </Button>
                                                  </>
                                                )}
                                                {submission.contractStatus === "declined" && (
                                                  <Badge
                                                    variant="outline"
                                                    className="border-red-500/50 text-red-400 bg-red-500/10 text-xs"
                                                  >
                                                    Declined
                                                  </Badge>
                                                )}
                                                {(!submission.contractStatus || submission.contractStatus === "pending") && (
                                                  <Badge
                                                    variant="outline"
                                                    className="bg-gray-800/50 text-gray-400 border-gray-700 text-xs"
                                                  >
                                                    Not Sent
                                                  </Badge>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-3 px-4">
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-8 w-8 p-0 hover:bg-gray-800"
                                                  onClick={() => handleViewDetails(submission)}
                                                  title="View Details"
                                                >
                                                  <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-8 w-8 p-0 hover:bg-green-500/20"
                                                  onClick={() => handleApprove(submission.id)}
                                                  disabled={updateStatusMutation.isPending || submission.status === "approved"}
                                                  title="Approve"
                                                >
                                                  <Check className="w-4 h-4 text-green-500" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-8 w-8 p-0 hover:bg-red-500/20"
                                                  onClick={() => handleReject(submission.id)}
                                                  disabled={updateStatusMutation.isPending || submission.status === "rejected"}
                                                  title="Reject"
                                                >
                                                  <X className="w-4 h-4 text-red-500" />
                                                </Button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {submissionsData.pagination.totalPages > 1 && (
                                      <div className="mt-4 text-center text-sm text-gray-400">
                                        Showing {submissionsData.data.length} of {submissionsData.pagination.total} submissions
                                      </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#111111] border-[#1a1a1a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Submission Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Full onboarding form submission information
            </DialogDescription>
          </DialogHeader>
          
          {submissionDetails?.data ? (
            <div className="space-y-6 mt-4">
              {/* Owner Information */}
              <div>
                <h3 className="text-lg font-semibold text-[#EAEB80] mb-3">Owner Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.firstNameOwner} {submissionDetails.data.lastNameOwner}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.emailOwner}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.phoneOwner}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Birthday:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.birthday}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">T-Shirt Size:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.tshirtSize}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Representative:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.representative}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-[#EAEB80] mb-3">Address</h3>
                <div className="text-sm text-white">
                  {submissionDetails.data.streetAddress}<br />
                  {submissionDetails.data.city}, {submissionDetails.data.state} {submissionDetails.data.zipCode}
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h3 className="text-lg font-semibold text-[#EAEB80] mb-3">Vehicle Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Year:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.vehicleYear}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Make:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.vehicleMake}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Model:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.vehicleModel}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Trim:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.vehicleTrim}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">VIN:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.vinNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">License Plate:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.licensePlate}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Miles:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.vehicleMiles}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Exterior Color:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.exteriorColor}</span>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-semibold text-[#EAEB80] mb-3">Financial Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Purchase Price:</span>
                    <span className="ml-2 text-white">${submissionDetails.data.purchasePrice}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Monthly Payment:</span>
                    <span className="ml-2 text-white">${submissionDetails.data.monthlyPayment}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Down Payment:</span>
                    <span className="ml-2 text-white">${submissionDetails.data.downPayment}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Interest Rate:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.interestRate}%</span>
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              <div>
                <h3 className="text-lg font-semibold text-[#EAEB80] mb-3">Banking Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Bank Name:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.bankName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tax Classification:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.taxClassification}</span>
                  </div>
                </div>
              </div>

              {/* Insurance Information */}
              <div>
                <h3 className="text-lg font-semibold text-[#EAEB80] mb-3">Insurance Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Provider:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.insuranceProvider}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Policy Number:</span>
                    <span className="ml-2 text-white">{submissionDetails.data.policyNumber}</span>
                  </div>
                </div>
              </div>
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
