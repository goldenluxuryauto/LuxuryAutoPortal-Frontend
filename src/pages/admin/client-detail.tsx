import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Car,
  FileText,
  Mail,
  Phone,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  Download,
  Wrench,
  DollarSign,
  Eye,
  Loader2,
  Link as LinkIcon,
  ExternalLink,
  Folder,
  ChevronUp,
  Plus,
  Minus,
} from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import QuickLinks from "@/components/admin/QuickLinks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

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
  onboarding?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    contractStatus?: "pending" | "sent" | "opened" | "signed" | "declined" | null;
    contractSignedAt?: string | null;
    contractToken?: string | null;
    createdAt: string;
  } | null;
}

type Section = "profile" | "cars" | "totals" | "maintenance";

export default function ClientDetailPage() {
  const [, params] = useRoute("/admin/clients/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const clientId = params?.id ? parseInt(params.id, 10) : null;
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(
    new Set(["profile"])
  );
  const [expandedTotals, setExpandedTotals] = useState<Set<string>>(new Set());
  const [quickLinksExpanded, setQuickLinksExpanded] = useState(true);
  const [viewMyCarExpanded, setViewMyCarExpanded] = useState(true);
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] = useState<string>("all");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<string>("all");
  const [maintenanceDateFilter, setMaintenanceDateFilter] = useState<string>("");
  
  // Totals filters
  const [selectedCar, setSelectedCar] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [fromYear, setFromYear] = useState<string>("2025");
  const [toYear, setToYear] = useState<string>("2025");

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: ClientDetail;
  }>({
    queryKey: ["/api/clients", clientId],
    queryFn: async () => {
      if (!clientId) throw new Error("Invalid client ID");
      const url = buildApiUrl(`/api/clients/${clientId}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch client: ${response.statusText}`);
      }
      const result = await response.json();
      console.log("✅ [CLIENT DETAIL] Fetched client data:", result);
      return result;
    },
    enabled: !!clientId,
    retry: false,
  });

  // Show error toast when query fails
  useEffect(() => {
    if (error) {
      console.error("❌ [CLIENT DETAIL] Error fetching client:", error);
      toast({
        title: "Error loading client",
        description: error instanceof Error ? error.message : "Failed to load client details",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const client = data?.data;

  // Fetch totals data
  const { data: totalsData, isLoading: totalsLoading } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/clients", clientId, "totals", selectedCar, selectedYear, fromYear, toYear],
    queryFn: async () => {
      if (!clientId) throw new Error("Invalid client ID");
      const url = buildApiUrl(`/api/clients/${clientId}/totals?car=${selectedCar}&year=${selectedYear}&from=${fromYear}&to=${toYear}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        // Return empty data if endpoint doesn't exist yet
        return { success: true, data: null };
      }
      return response.json();
    },
    enabled: !!clientId && activeSection === "totals",
    retry: false,
  });

  const totals = totalsData?.data || null;

  const toggleSection = (section: Section) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const toggleTotalsCategory = (category: string) => {
    setExpandedTotals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
        </div>
      </AdminLayout>
    );
  }

  // Test DB connection handler
  const handleTestDB = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/test-db?clientId=${clientId}`), {
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "✅ Database Connection Successful",
          description: result.message || "Successfully connected to database",
        });
      } else {
        toast({
          title: "❌ Database Connection Failed",
          description: result.error || "Failed to connect to database",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Database Connection Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (error || !client) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-red-400 mb-4">
            {error ? `Failed to load client details: ${error.message}` : "Client not found"}
          </p>
          {clientId && (
            <Button
              onClick={handleTestDB}
              className="bg-blue-500 text-white hover:bg-blue-600 mb-2"
            >
              Test DB Connection
            </Button>
          )}
          <Button
            onClick={() => setLocation("/admin/clients")}
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const sections: Array<{ id: Section; label: string; icon: any }> = [
    { id: "profile", label: "Profile", icon: User },
    { id: "cars", label: "Cars", icon: Car },
    { id: "totals", label: "Totals", icon: DollarSign },
    { id: "maintenance", label: "Car Maintenance", icon: Wrench },
  ];

  const primaryCar = client.cars && client.cars.length > 0 ? client.cars[0] : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <button
            onClick={() => setLocation("/admin/clients")}
            className="hover:text-[#EAEB80] transition-colors"
          >
            Clients
          </button>
          <span>/</span>
          <span className="text-[#EAEB80]">View Info</span>
        </div>

        {/* Header */}
        <h1 className="text-4xl font-serif text-[#EAEB80] italic">
          {client.firstName} {client.lastName}
        </h1>

        {/* Main Layout: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
              <CardContent className="p-0">
                <nav className="space-y-1 p-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isExpanded = expandedSections.has(section.id);
                    const isActive = activeSection === section.id;

                    return (
                      <div key={section.id}>
                        <button
                          onClick={() => {
                            toggleSection(section.id);
                            setActiveSection(section.id);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors",
                            isActive
                              ? "bg-[#EAEB80]/10 text-[#EAEB80]"
                              : "text-gray-400 hover:bg-[#1a1a1a] hover:text-[#EAEB80]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{section.label}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-3">
            {activeSection === "profile" && (
              <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#EAEB80] text-xl">Profile Information</CardTitle>
                    <Button
                      onClick={handleTestDB}
                      variant="outline"
                      size="sm"
                      className="text-[#EAEB80] border-[#EAEB80]/30 hover:bg-[#EAEB80]/10"
                    >
                      Test DB Connection
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="text-sm font-medium text-[#EAEB80] mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">First Name</p>
                        <p className="text-white">{client.firstName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Last Name</p>
                        <p className="text-white">{client.lastName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Contact</p>
                        <p className="text-white">{client.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-white">{client.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bank Information */}
                  <div className="pt-4 border-t border-[#2a2a2a]">
                    <h3 className="text-sm font-medium text-[#EAEB80] mb-4">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Bank Name</p>
                        <p className="text-white">{client.bankName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Routing Number</p>
                        <p className="text-white">{client.bankRoutingNumber || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Account Number</p>
                        <p className="text-white">{client.bankAccountNumber || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Access - 3-Card Section */}
                  <div className="pt-6 border-t border-[#2a2a2a]">
                    <h3 className="text-lg font-semibold text-[#EAEB80] mb-4">Quick Access</h3>
                    <QuickLinks />
                  </div>

                  {/* View My Car */}
                  <div className="pt-4 border-t border-[#2a2a2a]">
                    <button
                      onClick={() => setViewMyCarExpanded(!viewMyCarExpanded)}
                      className="w-full flex items-center justify-between mb-4"
                    >
                      <h3 className="text-sm font-medium text-[#EAEB80]">View My Car</h3>
                      {viewMyCarExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#EAEB80]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#EAEB80]" />
                      )}
                    </button>
                    {viewMyCarExpanded && (
                      <div className="space-y-2">
                        {client.cars && client.cars.length > 0 ? (
                          client.cars.map((car) => {
                            const carName = `${car.make || ""} ${car.model || ""} ${car.year || ""}`.trim();
                            return (
                              <button
                                key={car.id}
                                onClick={() => setLocation(`/admin/cars/${car.id}`)}
                                className="w-full flex items-center gap-2 text-gray-300 hover:text-[#EAEB80] transition-colors text-sm py-1 text-left"
                              >
                                <ChevronRight className="w-4 h-4" />
                                <span>{carName || "Unknown Car"}</span>
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-gray-400 text-sm">No cars assigned</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "cars" && (
              <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
                <CardHeader>
                  <CardTitle className="text-[#EAEB80] text-xl">
                    Assigned Cars ({client.cars.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {client.cars.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No cars assigned to this client</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                            <TableHead className="text-center text-[#EAEB80] font-medium px-4 py-3 w-12">#</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Status</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Stats</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Management</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Make</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Year</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Model/Specs</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">VIN #</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Plate #</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Lic/Reg Date</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Gas</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Tire Size</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Oil Type</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Last Oil Change</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Turo Link</TableHead>
                            <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Admin Turo Link</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {client.cars.map((car, index) => (
                            <TableRow
                              key={car.id}
                              className="border-[#2a2a2a] hover:bg-gray-800/50 cursor-pointer transition-colors"
                              onClick={() => setLocation(`/admin/cars/${car.id}`)}
                            >
                              <TableCell className="text-center text-[#EAEB80] px-4 py-3 align-middle">
                                {index + 1}
                              </TableCell>
                              <TableCell className="text-left px-4 py-3 align-middle">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    car.status === "available"
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                  )}
                                >
                                  {car.status === "available" ? "Available" : "Off Fleet"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-left text-white px-4 py-3 align-middle">
                                {car.mileage.toLocaleString()} mi
                              </TableCell>
                              <TableCell className="text-left text-white px-4 py-3 align-middle">
                                -
                              </TableCell>
                              <TableCell className="text-left text-white px-4 py-3 align-middle">
                                {car.make || "N/A"}
                              </TableCell>
                              <TableCell className="text-left text-white px-4 py-3 align-middle">
                                {car.year || "N/A"}
                              </TableCell>
                              <TableCell className="text-left text-white px-4 py-3 align-middle">
                                {car.model || "N/A"}
                              </TableCell>
                              <TableCell className="text-left text-white font-mono text-sm px-4 py-3 align-middle">
                                {car.vin}
                              </TableCell>
                              <TableCell className="text-left text-gray-400 px-4 py-3 align-middle">
                                {car.licensePlate || "N/A"}
                              </TableCell>
                              <TableCell className="text-left text-gray-400 px-4 py-3 align-middle">
                                {formatDate(car.registrationExpiration)}
                              </TableCell>
                              <TableCell className="text-left text-gray-400 px-4 py-3 align-middle">
                                {car.fuelType || "N/A"}
                              </TableCell>
                              <TableCell className="text-left text-gray-400 px-4 py-3 align-middle">
                                {car.tireSize || "N/A"}
                              </TableCell>
                              <TableCell className="text-left text-gray-400 px-4 py-3 align-middle">
                                {car.oilType || "N/A"}
                              </TableCell>
                              <TableCell className="text-left text-gray-400 px-4 py-3 align-middle">
                                {formatDate(car.lastOilChange)}
                              </TableCell>
                              <TableCell className="text-left px-4 py-3 align-middle">
                                <a
                                  href="#"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#EAEB80] hover:underline"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </TableCell>
                              <TableCell className="text-left px-4 py-3 align-middle">
                                <a
                                  href="#"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#EAEB80] hover:underline"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === "totals" && (
              <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#EAEB80] text-xl">Totals</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#EAEB80] hover:bg-[#EAEB80]/20"
                      onClick={() => {
                        // Export functionality
                        console.log("Export totals");
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <Select value={selectedCar} onValueChange={setSelectedCar}>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="Car" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectItem value="all">All cars</SelectItem>
                        {client?.cars?.map((car) => (
                          <SelectItem key={car.id} value={car.id.toString()}>
                            {car.make || ""} {car.model || ""} {car.year || ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={fromYear} onValueChange={setFromYear}>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="From" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={toYear} onValueChange={setToYear}>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="To" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {totalsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
                    </div>
                  ) : !totals ? (
                    <div className="text-center py-12 text-gray-400">
                      <Folder className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p>No data available</p>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full space-y-2">
                      {/* CAR MANAGEMENT AND CAR OWNER SPLIT */}
                      <AccordionItem value="split" className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a]">
                        <AccordionTrigger className="px-4 py-3 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                          <div className="flex items-center gap-2 w-full">
                            <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                            <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                            <span className="text-white font-medium">CAR MANAGEMENT AND CAR OWNER SPLIT</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 bg-[#0a0a0a]">
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Car Management Split</span>
                              <span className="text-white font-medium">
                                ${totals?.carManagementSplit?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Car Owner Split</span>
                              <span className="text-white font-medium">
                                ${totals?.carOwnerSplit?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* INCOME */}
                      <AccordionItem value="income" className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a]">
                        <AccordionTrigger className="px-4 py-3 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                          <div className="flex items-center gap-2 w-full">
                            <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                            <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                            <span className="text-white font-medium">INCOME</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 bg-[#0a0a0a]">
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Rental Income</span>
                              <span className="text-white">${totals?.income?.rentalIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Delivery Income</span>
                              <span className="text-white">${totals?.income?.deliveryIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Electric Prepaid Income</span>
                              <span className="text-white">${totals?.income?.electricPrepaidIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Smoking Fines</span>
                              <span className="text-white">${totals?.income?.smokingFines?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Gas Prepaid Income</span>
                              <span className="text-white">${totals?.income?.gasPrepaidIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Miles Income</span>
                              <span className="text-white">${totals?.income?.milesIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Ski Racks Income</span>
                              <span className="text-white">${totals?.income?.skiRacksIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Child Seat Income</span>
                              <span className="text-white">${totals?.income?.childSeatIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Coolers Income</span>
                              <span className="text-white">${totals?.income?.coolersIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Income Insurance and Client Wrecks</span>
                              <span className="text-white">${totals?.income?.incomeInsurance?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Other Income</span>
                              <span className="text-white">${totals?.income?.otherIncome?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Negative Balance Carry Over</span>
                              <span className="text-white">${totals?.income?.negativeBalance?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm pt-2 border-t border-[#2a2a2a]">
                              <span className="font-medium">Car Management Total Expenses</span>
                              <span className="text-white font-semibold">
                                ${totals?.income?.carManagementTotalExpenses?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span className="font-medium">Car Owner Total Expenses</span>
                              <span className="text-white font-semibold">
                                ${totals?.income?.carOwnerTotalExpenses?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span className="font-medium">Car Payment</span>
                              <span className="text-white font-semibold">
                                ${totals?.income?.carPayment?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            <div className="flex justify-between text-[#EAEB80] text-sm font-bold pt-2 border-t border-[#2a2a2a]">
                              <span>Total Expenses</span>
                              <span>${totals?.income?.totalExpenses?.toFixed(2) || "0.00"}</span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* OPERATING EXPENSES */}
                      <AccordionItem value="expenses" className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a]">
                        <AccordionTrigger className="px-4 py-3 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                          <div className="flex items-center gap-2 w-full">
                            <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                            <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                            <span className="text-white font-medium">OPERATING EXPENSES (COGS - Per Vehicle)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 bg-[#0a0a0a]">
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Auto Body Shop / Wreck</span>
                              <span className="text-white">${totals?.expenses?.autoBodyShop?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Alignment</span>
                              <span className="text-white">${totals?.expenses?.alignment?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Battery</span>
                              <span className="text-white">${totals?.expenses?.battery?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Brakes</span>
                              <span className="text-white">${totals?.expenses?.brakes?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Car Payment</span>
                              <span className="text-white">${totals?.expenses?.carPayment?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Car Insurance</span>
                              <span className="text-white">${totals?.expenses?.carInsurance?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Car Seats</span>
                              <span className="text-white">${totals?.expenses?.carSeats?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Cleaning Supplies / Tools</span>
                              <span className="text-white">${totals?.expenses?.cleaningSupplies?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Emissions</span>
                              <span className="text-white">${totals?.expenses?.emissions?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>GPS System</span>
                              <span className="text-white">${totals?.expenses?.gpsSystem?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Keys & Fob</span>
                              <span className="text-white">${totals?.expenses?.keysFob?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Labor - Detailing</span>
                              <span className="text-white">${totals?.expenses?.laborDetailing?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Parking Airport (Reimbursed - GLA - Client Owner Rentals)</span>
                              <span className="text-white">${totals?.expenses?.parkingAirport?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Uber/Lyft/Lime - Not Reimbursed</span>
                              <span className="text-white">${totals?.expenses?.uberNotReimbursed?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Uber/Lyft/Lime - Reimbursed</span>
                              <span className="text-white">${totals?.expenses?.uberReimbursed?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Gas - Service Run</span>
                              <span className="text-white">${totals?.expenses?.gasServiceRun?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-[#EAEB80] text-sm font-bold pt-2 border-t border-[#2a2a2a]">
                              <span>Total Operating Expenses (COGS - Per Vehicle)</span>
                              <span>${totals?.expenses?.totalOperatingExpenses?.toFixed(2) || "0.00"}</span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* GLA PARKING FEE & LABOR CLEANING */}
                      <AccordionItem value="gla" className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a]">
                        <AccordionTrigger className="px-4 py-3 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                          <div className="flex items-center gap-2 w-full">
                            <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                            <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                            <span className="text-white font-medium">GLA PARKING FEE & LABOR CLEANING</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 bg-[#0a0a0a]">
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>GLA Labor - Cleaning</span>
                              <span className="text-white">${totals?.gla?.laborCleaning?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>GLA Parking Fee</span>
                              <span className="text-white">${totals?.gla?.parkingFee?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-[#EAEB80] text-sm font-bold pt-2 border-t border-[#2a2a2a]">
                              <span>Total GLA Parking Fee & Labor Cleaning</span>
                              <span>${totals?.gla?.total?.toFixed(2) || "0.00"}</span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* HISTORY OF THE CARS */}
                      <AccordionItem value="history" className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a]">
                        <AccordionTrigger className="px-4 py-3 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                          <div className="flex items-center gap-2 w-full">
                            <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                            <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                            <span className="text-white font-medium">HISTORY OF THE CARS</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 bg-[#0a0a0a]">
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Days Rented</span>
                              <span className="text-white font-medium">{totals?.history?.daysRented || 0}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Trips Taken</span>
                              <span className="text-white font-medium">{totals?.history?.tripsTaken || 0}</span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* PAYMENT HISTORY */}
                      <AccordionItem value="payments" className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a]">
                        <AccordionTrigger className="px-4 py-3 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                          <div className="flex items-center gap-2 w-full">
                            <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                            <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                            <span className="text-white font-medium">PAYMENT HISTORY</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 bg-[#0a0a0a]">
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>{fromYear} - {toYear}</span>
                              <span className="text-white font-semibold">
                                ${totals?.payments?.total?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === "maintenance" && (
              <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
                <CardHeader>
                  <CardTitle className="text-[#EAEB80] text-xl">Car Maintenance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select value={maintenanceTypeFilter} onValueChange={setMaintenanceTypeFilter}>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="Select a Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="oil">Oil Change</SelectItem>
                        <SelectItem value="tire">Tire Service</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={maintenanceStatusFilter} onValueChange={setMaintenanceStatusFilter}>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="date"
                      value={maintenanceDateFilter}
                      onChange={(e) => setMaintenanceDateFilter(e.target.value)}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                      placeholder="Date to Filter"
                    />
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                          <TableHead className="text-center text-[#EAEB80] font-medium px-4 py-3 w-12">#</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Make</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Model</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Year</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Plate #</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">VIN #</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Tire Size</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Oil Type</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Oil Miles/Fuel/Gas</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Maintenance Type</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Status</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Schedule Date</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Date Completed</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Price</TableHead>
                          <TableHead className="text-left text-[#EAEB80] font-medium px-4 py-3">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={15} className="text-center py-12">
                            <div className="flex flex-col items-center gap-3">
                              <Folder className="w-12 h-12 text-gray-600" />
                              <p className="text-gray-400">No data</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
