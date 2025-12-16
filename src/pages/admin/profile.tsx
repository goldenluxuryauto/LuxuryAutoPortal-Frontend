import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
} from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import QuickLinks from "@/components/admin/QuickLinks";

interface SignedContract {
  id: number;
  signedContractUrl: string;
  contractSignedAt: string | null;
  contractStatus: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  licensePlate?: string;
  vinNumber?: string;
  createdAt: string;
}

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
  signedContracts?: SignedContract[];
}

export default function ProfilePage() {
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
                    <CardTitle className="text-[#EAEB80] text-xl">Profile Information</CardTitle>
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

                          {/* Signed Contracts */}
                          {client.signedContracts && client.signedContracts.length > 0 && (
                            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
                              <h3 className="text-lg font-semibold text-[#EAEB80] mb-4 pb-2 border-b border-[#EAEB80]/30">
                                Signed Contracts ({client.signedContracts.length})
                              </h3>
                              <div className="space-y-4">
                                {client.signedContracts.map((contract, index) => (
                                  <div
                                    key={contract.id}
                                    className="bg-[#0a0a0a] p-4 rounded-lg border border-[#EAEB80]/10"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div>
                                        <h4 className="text-[#EAEB80] font-medium mb-1">
                                          Contract #{index + 1}
                                        </h4>
                                        {(contract.vehicleMake || contract.vehicleModel || contract.vehicleYear) && (
                                          <p className="text-gray-400 text-sm">
                                            {[contract.vehicleYear, contract.vehicleMake, contract.vehicleModel]
                                              .filter(Boolean)
                                              .join(" ")}
                                            {contract.licensePlate && ` • ${contract.licensePlate}`}
                                          </p>
                                        )}
                                      </div>
                                      {contract.contractSignedAt && (
                                        <span className="text-gray-500 text-xs">
                                          {formatDate(contract.contractSignedAt)}
                                        </span>
                                      )}
                                    </div>
                                    <a
                                      href={contract.signedContractUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#EAEB80] text-black hover:bg-[#d4d570] rounded-md font-medium transition-colors"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                      View/Download Contract PDF
                                    </a>
                                  </div>
                                ))}
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
      </div>
    </AdminLayout>
  );
}
