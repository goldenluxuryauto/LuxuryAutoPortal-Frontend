import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Edit,
  Loader2,
} from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import QuickLinks from "@/components/admin/QuickLinks";

interface ClientDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bankName?: string;
  bankRoutingNumber?: string;
  bankAccountNumber?: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  createdAt: string;
  carCount: number;
  cars: Array<{
    id: number;
    vin: string;
    makeModel: string;
    make?: string;
    model?: string;
    licensePlate?: string;
    year?: number;
    mileage: number;
    status: string;
    createdAt: string;
    tireSize?: string | null;
    oilType?: string | null;
    lastOilChange?: string | null;
    fuelType?: string | null;
    registrationExpiration?: string | null;
  }>;
  onboarding?: any;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  // Fetch logged-in client's profile data
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: ClientDetail;
  }>({
    queryKey: ["/api/client/profile"],
    queryFn: async () => {
      const url = buildApiUrl("/api/client/profile");
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch profile: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false,
  });

  const client = data?.data;

  // Update mutation for editing onboarding data
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(buildApiUrl(`/api/clients/${client?.id}/onboarding`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update onboarding data");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEditClick = () => {
    if (client?.onboarding) {
      const data = client.onboarding;
      setEditFormData({
        firstNameOwner: data.firstNameOwner || "",
        lastNameOwner: data.lastNameOwner || "",
        emailOwner: data.emailOwner || "",
        phoneOwner: data.phoneOwner || "",
        birthday: data.birthday || "",
        tshirtSize: data.tshirtSize || "",
        streetAddress: data.streetAddress || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zipCode || "",
        vehicleYear: data.vehicleYear || "",
        vehicleMake: data.vehicleMake || "",
        vehicleModel: data.vehicleModel || "",
        vinNumber: data.vinNumber || "",
        licensePlate: data.licensePlate || "",
        vehicleMiles: data.vehicleMiles || "",
        bankName: data.bankName || "",
        routingNumber: data.routingNumber || "",
        accountNumber: data.accountNumber || "",
      });
      setIsEditModalOpen(true);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(editFormData);
  };

  const formatDate = (dateString: string | null | undefined): string => {
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !client) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-red-400 mb-4">
            {error ? `Failed to load profile: ${error.message}` : "Profile not found"}
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <h1 className="text-4xl font-serif text-[#EAEB80] italic">
          My Profile
        </h1>

        {/* Main Content */}
        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#EAEB80] text-xl">Profile Information</CardTitle>
                    {client.onboarding && (
                      <Button
                        onClick={handleEditClick}
                        variant="outline"
                        size="sm"
                        className="text-[#EAEB80] border-[#EAEB80]/30 hover:bg-[#EAEB80]/10"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {client.onboarding ? (
                    (() => {
                      const formatValue = (value: any): string => {
                        if (value === null || value === undefined || value === "")
                          return "Not provided";
                        return String(value);
                      };

                      const formatDate = (dateStr: string | null | undefined): string => {
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

                      const data = client.onboarding;

                      return (
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
                                  {formatValue(data.firstNameOwner)} {formatValue(data.lastNameOwner)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Email:</span>
                                <span className="text-white">{formatValue(data.emailOwner)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Phone:</span>
                                <span className="text-white">{formatValue(data.phoneOwner)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Date of Birth:</span>
                                <span className="text-white">{formatValue(data.birthday)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">T-Shirt Size:</span>
                                <span className="text-white">{formatValue(data.tshirtSize)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Representative:</span>
                                <span className="text-white">{formatValue(data.representative)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">How Did You Hear About Us:</span>
                                <span className="text-white">{formatValue(data.heardAboutUs)}</span>
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
                                <span className="text-gray-400 block mb-1">Street Address:</span>
                                <span className="text-white">{formatValue(data.streetAddress)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">City:</span>
                                <span className="text-white">{formatValue(data.city)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">State:</span>
                                <span className="text-white">{formatValue(data.state)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Zip Code:</span>
                                <span className="text-white">{formatValue(data.zipCode)}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-gray-400 block mb-1">Full Address:</span>
                                <span className="text-white">
                                  {formatAddress(data.city, data.state, data.zipCode)}
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
                                <span className="text-gray-400 block mb-1">Year:</span>
                                <span className="text-white">{formatValue(data.vehicleYear)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Make:</span>
                                <span className="text-white">{formatValue(data.vehicleMake)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Model:</span>
                                <span className="text-white">{formatValue(data.vehicleModel)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Trim:</span>
                                <span className="text-white">{formatValue(data.vehicleTrim)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">VIN Number:</span>
                                <span className="text-white font-mono text-xs">{formatValue(data.vinNumber)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">License Plate:</span>
                                <span className="text-white">{formatValue(data.licensePlate)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Mileage:</span>
                                <span className="text-white">{formatValue(data.vehicleMiles)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Exterior Color:</span>
                                <span className="text-white">{formatValue(data.exteriorColor)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Interior Color:</span>
                                <span className="text-white">{formatValue(data.interiorColor)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Fuel Type:</span>
                                <span className="text-white">{formatValue(data.fuelType)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Tire Size:</span>
                                <span className="text-white">{formatValue(data.tireSize)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Oil Type:</span>
                                <span className="text-white">{formatValue(data.oilType)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Last Oil Change:</span>
                                <span className="text-white">{formatValue(data.lastOilChange)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Financial Information */}
                          {(data.purchasePrice || data.downPayment || data.monthlyPayment) && (
                            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                              <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                                Financial Information
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {data.purchasePrice && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Purchase Price:</span>
                                    <span className="text-white font-medium">{formatCurrency(data.purchasePrice)}</span>
                                  </div>
                                )}
                                {data.downPayment && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Down Payment:</span>
                                    <span className="text-white font-medium">{formatCurrency(data.downPayment)}</span>
                                  </div>
                                )}
                                {data.monthlyPayment && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Monthly Payment:</span>
                                    <span className="text-white font-medium">{formatCurrency(data.monthlyPayment)}</span>
                                  </div>
                                )}
                                {data.interestRate && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Interest Rate:</span>
                                    <span className="text-white">{formatValue(data.interestRate)}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Banking Information */}
                          {(data.bankName || data.routingNumber || data.accountNumber) && (
                            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                              <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                                Banking Information (ACH)
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {data.bankName && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Bank Name:</span>
                                    <span className="text-white">{formatValue(data.bankName)}</span>
                                  </div>
                                )}
                                {data.taxClassification && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Tax Classification:</span>
                                    <span className="text-white">{formatValue(data.taxClassification)}</span>
                                  </div>
                                )}
                                {data.routingNumber && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Routing Number:</span>
                                    <span className="text-white font-mono">{formatValue(data.routingNumber)}</span>
                                  </div>
                                )}
                                {data.accountNumber && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Account Number:</span>
                                    <span className="text-white font-mono">{formatValue(data.accountNumber)}</span>
                                  </div>
                                )}
                                {data.businessName && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Business Name:</span>
                                    <span className="text-white">{formatValue(data.businessName)}</span>
                                  </div>
                                )}
                                {data.ein && data.taxClassification === "business" && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">EIN:</span>
                                    <span className="text-white font-mono">{formatValue(data.ein)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Insurance Information */}
                          {(data.insuranceProvider || data.policyNumber) && (
                            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                              <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                                Insurance Information
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {data.insuranceProvider && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Provider:</span>
                                    <span className="text-white">{formatValue(data.insuranceProvider)}</span>
                                  </div>
                                )}
                                {data.insurancePhone && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Phone:</span>
                                    <span className="text-white">{formatValue(data.insurancePhone)}</span>
                                  </div>
                                )}
                                {data.policyNumber && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Policy Number:</span>
                                    <span className="text-white font-mono">{formatValue(data.policyNumber)}</span>
                                  </div>
                                )}
                                {data.insuranceExpiration && (
                                  <div>
                                    <span className="text-gray-400 block mb-1">Expiration:</span>
                                    <span className="text-white">{formatValue(data.insuranceExpiration)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Status */}
                          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                            <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                              Status
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400 block mb-1">Submission Status:</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    data.status === "approved"
                                      ? "border-green-500/50 text-green-400 bg-green-500/10"
                                      : data.status === "rejected"
                                      ? "border-red-500/50 text-red-400 bg-red-500/10"
                                      : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                  )}
                                >
                                  {formatValue(data.status || "pending")}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Contract Status:</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    data.contractStatus === "signed"
                                      ? "border-green-500/50 text-green-400 bg-green-500/10"
                                      : data.contractStatus === "declined"
                                      ? "border-red-500/50 text-red-400 bg-red-500/10"
                                      : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                  )}
                                >
                                  {formatValue(data.contractStatus || "pending")}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Submitted Date:</span>
                                <span className="text-white">{formatDate(data.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No onboarding submission found. Please complete your onboarding form.
                    </div>
                  )}
                </CardContent>
              </Card>

        {/* Quick Links */}
        <QuickLinks />

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#111111] border-[#EAEB80]/30 border-2 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl">Edit Profile Information</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update your profile information
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-6 mt-4">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">First Name</Label>
                    <Input
                      value={editFormData.firstNameOwner || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, firstNameOwner: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Last Name</Label>
                    <Input
                      value={editFormData.lastNameOwner || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, lastNameOwner: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Email</Label>
                    <Input
                      type="email"
                      value={editFormData.emailOwner || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, emailOwner: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Phone</Label>
                    <Input
                      value={editFormData.phoneOwner || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, phoneOwner: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-gray-400">Street Address</Label>
                    <Input
                      value={editFormData.streetAddress || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, streetAddress: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">City</Label>
                    <Input
                      value={editFormData.city || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">State</Label>
                    <Input
                      value={editFormData.state || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Zip Code</Label>
                    <Input
                      value={editFormData.zipCode || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">
                  Vehicle Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Year</Label>
                    <Input
                      value={editFormData.vehicleYear || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, vehicleYear: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Make</Label>
                    <Input
                      value={editFormData.vehicleMake || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, vehicleMake: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Model</Label>
                    <Input
                      value={editFormData.vehicleModel || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, vehicleModel: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">VIN Number</Label>
                    <Input
                      value={editFormData.vinNumber || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, vinNumber: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">License Plate</Label>
                    <Input
                      value={editFormData.licensePlate || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, licensePlate: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Mileage</Label>
                    <Input
                      value={editFormData.vehicleMiles || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, vehicleMiles: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">
                  Banking Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Bank Name</Label>
                    <Input
                      value={editFormData.bankName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Routing Number</Label>
                    <Input
                      value={editFormData.routingNumber || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, routingNumber: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Account Number</Label>
                    <Input
                      value={editFormData.accountNumber || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, accountNumber: e.target.value })}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
