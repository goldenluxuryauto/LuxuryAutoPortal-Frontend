import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, Download, ExternalLink, Edit2, Save, X } from "lucide-react";
import { ProfileSkeleton } from "@/components/ui/skeletons";
import { buildApiUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import QuickLinks from "@/components/admin/QuickLinks";
import { useToast } from "@/hooks/use-toast";

interface ClientProfileResponse {
  success: boolean;
  data: any;
}

export default function ClientProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingBanking, setIsEditingBanking] = useState(false);
  const [ssnValue, setSsnValue] = useState("");
  const [einValue, setEinValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const {
    data,
    isLoading,
    error,
  } = useQuery<ClientProfileResponse>({
    queryKey: ["/api/client/profile"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/client/profile"), {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as any).error || "Failed to load client profile"
        );
      }

      return response.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (error) {
      console.error("❌ [CLIENT PROFILE] Error fetching profile:", error);
      toast({
        title: "Error loading profile",
        description:
          error instanceof Error ? error.message : "Failed to load profile",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const profile = data?.data;
  const onboarding = profile?.onboarding;
  const bankingInfo = profile?.bankingInfo;
  const signedContracts: any[] = profile?.signedContracts || [];
  const cars: any[] = profile?.cars || [];

  // Initialize form values when banking info is loaded
  useEffect(() => {
    if (bankingInfo && !isEditingBanking) {
      setSsnValue(bankingInfo.ssn || "");
      setEinValue(bankingInfo.ein || "");
    }
  }, [bankingInfo, isEditingBanking]);

  const handleSaveBankingInfo = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(buildApiUrl("/api/client/profile/banking-info"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ssn: ssnValue.trim() || "",
          ein: einValue.trim() || "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update banking information");
      }

      toast({
        title: "Success",
        description: "Banking information updated successfully",
      });

      setIsEditingBanking(false);
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
    } catch (error: any) {
      console.error("Error updating banking info:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update banking information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (bankingInfo) {
      setSsnValue(bankingInfo.ssn || "");
      setEinValue(bankingInfo.ein || "");
    }
    setIsEditingBanking(false);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "Not provided";
    }
    return String(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatFullDateTime = (dateStr: string | null | undefined): string => {
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

  if (isLoading) {
    return (
      <AdminLayout>
        <ProfileSkeleton />
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Folder className="w-10 h-10 text-gray-600" />
          <p className="text-gray-400">
            We could not load your profile. Please try again later.
          </p>
        </div>
      </AdminLayout>
    );
  }

                      return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <h1 className="text-4xl font-serif text-[#EAEB80] italic">My Profile</h1>

        {/* Profile Details */}
        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardHeader>
            <CardTitle className="text-[#EAEB80] text-xl">
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!onboarding ? (
              <div className="text-center py-8 text-gray-400">
                No onboarding submission found for this profile
              </div>
            ) : (
                        <>
                          {/* Personal Information */}
                          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                            <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                              Personal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400 block mb-1">Full Name:</span>
                                <span className="text-white font-medium">
                        {formatValue(onboarding.firstNameOwner)}{" "}
                        {formatValue(onboarding.lastNameOwner)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Email:</span>
                      <span className="text-white">
                        {formatValue(onboarding.emailOwner)}
                      </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Phone:</span>
                      <span className="text-white">
                        {formatValue(onboarding.phoneOwner)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">
                        Date of Birth:
                      </span>
                      <span className="text-white">
                        {formatValue(onboarding.birthday)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">
                        T-Shirt Size:
                      </span>
                      <span className="text-white">
                        {formatValue(onboarding.tshirtSize)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">SSN:</span>
                      <span className="text-white font-mono">
                        {formatValue(onboarding.ssn)}
                      </span>
                              </div>
                              <div>
                      <span className="text-gray-400 block mb-1">
                        Representative:
                      </span>
                      <span className="text-white">
                        {formatValue(onboarding.representative)}
                      </span>
                              </div>
                              <div>
                      <span className="text-gray-400 block mb-1">
                        How Did You Hear About Us:
                      </span>
                      <span className="text-white">
                        {formatValue(onboarding.heardAboutUs)}
                      </span>
                              </div>
                              <div>
                      <span className="text-gray-400 block mb-1">
                        Emergency Contact Name:
                      </span>
                      <span className="text-white">
                        {formatValue(onboarding.emergencyContactName)}
                      </span>
                              </div>
                              <div>
                      <span className="text-gray-400 block mb-1">
                        Emergency Contact Phone:
                      </span>
                      <span className="text-white">
                        {formatValue(onboarding.emergencyContactPhone)}
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
                        {formatValue(onboarding.streetAddress)}
                      </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">City:</span>
                      <span className="text-white">
                        {formatValue(onboarding.city)}
                      </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">State:</span>
                      <span className="text-white">
                        {formatValue(onboarding.state)}
                      </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Zip Code:</span>
                      <span className="text-white">
                        {formatValue(onboarding.zipCode)}
                      </span>
                              </div>
                              <div className="md:col-span-2">
                      <span className="text-gray-400 block mb-1">
                        Full Address:
                      </span>
                                <span className="text-white">
                        {formatAddress(
                          onboarding.city,
                          onboarding.state,
                          onboarding.zipCode
                        )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Banking Information */}
                            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#EAEB80]/30">
                                <h3 className="text-lg font-semibold text-[#EAEB80]">
                                  Banking Information (ACH)
                                </h3>
                                {!isEditingBanking && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditingBanking(true)}
                                    className="text-[#EAEB80] hover:text-[#d4d570] hover:bg-[#EAEB80]/10"
                                  >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit SSN/EIN
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400 block mb-1">Bank Name:</span>
                      <span className="text-white">
                        {formatValue(bankingInfo?.bankName || onboarding?.bankName)}
                      </span>
                                  </div>
                                  <div>
                      <span className="text-gray-400 block mb-1">
                        Tax Classification:
                      </span>
                      <span className="text-white">
                        {formatValue(bankingInfo?.taxClassification || onboarding?.taxClassification)}
                      </span>
                                  </div>
                                  <div>
                      <span className="text-gray-400 block mb-1">
                        Routing Number:
                      </span>
                      <span className="text-white font-mono">
                        {formatValue(bankingInfo?.routingNumber || onboarding?.routingNumber)}
                      </span>
                                  </div>
                                  <div>
                      <span className="text-gray-400 block mb-1">
                        Account Number:
                      </span>
                      <span className="text-white font-mono">
                        {formatValue(bankingInfo?.accountNumber || onboarding?.accountNumber)}
                      </span>
                                  </div>
                    {(bankingInfo?.businessName || onboarding?.businessName) && (
                                  <div>
                        <span className="text-gray-400 block mb-1">
                          Business Name:
                        </span>
                        <span className="text-white">
                          {formatValue(bankingInfo?.businessName || onboarding?.businessName)}
                        </span>
                                  </div>
                                )}
                                  {/* SSN Field - Editable */}
                                  <div>
                                    <span className="text-gray-400 block mb-1">SSN:</span>
                                    {isEditingBanking ? (
                                      <Input
                                        type="text"
                                        value={ssnValue}
                                        onChange={(e) => setSsnValue(e.target.value)}
                                        placeholder="Enter SSN"
                                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white font-mono focus:border-[#EAEB80]"
                                        maxLength={11}
                                      />
                                    ) : (
                                      <span className="text-white font-mono">
                                        {formatValue(bankingInfo?.ssn || onboarding?.ssn)}
                                      </span>
                                    )}
                                  </div>
                                  {/* EIN Field - Editable (always visible) */}
                                  <div>
                                    <span className="text-gray-400 block mb-1">EIN:</span>
                                    {isEditingBanking ? (
                                      <Input
                                        type="text"
                                        value={einValue}
                                        onChange={(e) => setEinValue(e.target.value)}
                                        placeholder="Enter EIN"
                                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white font-mono focus:border-[#EAEB80]"
                                        maxLength={10}
                                      />
                                    ) : (
                                      <span className="text-white font-mono">
                                        {formatValue(bankingInfo?.ein || onboarding?.ein)}
                                      </span>
                                    )}
                                  </div>
                              </div>
                              {/* Save/Cancel Buttons */}
                              {isEditingBanking && (
                                <div className="flex gap-2 mt-4 pt-4 border-t border-[#2a2a2a]">
                                  <Button
                                    onClick={handleSaveBankingInfo}
                                    disabled={isSaving}
                                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                                    size="sm"
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    variant="outline"
                                    className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border-[#2a2a2a]"
                                    size="sm"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>

                        </>
                      )}
                    </CardContent>
                  </Card>

        {/* Signed Contracts */}
        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardHeader>
            <CardTitle className="text-[#EAEB80] text-xl">
              Signed Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {signedContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Folder className="w-8 h-8 mb-2 text-gray-600" />
                <p>No signed contracts available yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {signedContracts.map((contract: any, index: number) => (
                  <div
                    key={contract.id ?? index}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111111] border border-[#EAEB80]/20 rounded-lg p-4"
                  >
                    <div className="space-y-1 text-sm">
                      <div className="text-white font-medium">
                        {formatValue(contract.vehicleYear)}{" "}
                        {formatValue(contract.vehicleMake)}{" "}
                        {formatValue(contract.vehicleModel)}
                  </div>
                      <div className="text-gray-400">
                        Plate:{" "}
                        <span className="text-white">
                          {formatValue(contract.licensePlate)}
                        </span>
                        {" · "}
                        VIN:{" "}
                        <span className="text-white font-mono text-xs">
                          {formatValue(contract.vinNumber)}
                        </span>
                  </div>
                      <div className="text-gray-400">
                        Signed on:{" "}
                        <span className="text-white">
                          {formatFullDateTime(
                            contract.contractSignedAt || contract.createdAt
                          )}
                        </span>
                  </div>
                </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          contract.contractStatus === "signed"
                            ? "border-green-500/50 text-green-400 bg-green-500/10"
                            : contract.contractStatus === "declined"
                            ? "border-red-500/50 text-red-400 bg-red-500/10"
                            : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                        )}
                      >
                        {formatValue(contract.contractStatus || "signed")}
                      </Badge>
                      {contract.signedContractUrl && (
                        <a
                          href={contract.signedContractUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-[#EAEB80] text-black hover:bg-[#d4d570] transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      )}
              </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links (Reports / Support / Forms Center) */}
              <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Quick Links</h2>
          <QuickLinks />
              </div>

      </div>

    </AdminLayout>
  );
}


