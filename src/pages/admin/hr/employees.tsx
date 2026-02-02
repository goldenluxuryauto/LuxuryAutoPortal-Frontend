import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { TableRowSkeleton } from "@/components/ui/skeletons";
import { TablePagination, ItemsPerPage } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";

interface Employee {
  employee_aid: number;
  employee_status: string;
  employee_is_active: number;
  employee_number: string;
  employee_first_name: string;
  employee_last_name: string;
  employee_middle_name: string;
  employee_email: string;
  employee_mobile_number: string;
  employee_telephone: string;
  employee_ssn_ein: string;
  employee_shirt_size: string;
  employee_street: string;
  employee_city: string;
  employee_state: string;
  employee_country: string;
  employee_zip_code: string;
  employee_mother_name: string;
  employee_father_name: string;
  employee_home_contact: string;
  employee_home_address: string;
  employee_emergency_contact_person: string;
  employee_emergency_relationship: string;
  employee_emergency_address: string;
  employee_emergency_number: string;
  employee_birthday: string;
  employee_marital_status: string;
  employee_created: string;
  employee_updated: string;
  employee_hear_about_gla?: string;
  employee_job_pay_work_email?: string | null;
  employee_job_pay_department_name?: string | null;
  employee_job_pay_job_title_name?: string | null;
  fullname?: string;
}

const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  personalEmail: z.string().email("Invalid email address"),
  workEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  mobileNumber: z.string().optional(),
  telephone: z.string().optional(),
  ssnEin: z.string().optional(),
  shirtSize: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  departmentName: z.string().optional(),
  jobTitleName: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

function statusBadge(employee: Employee) {
  if (employee.employee_status === "pending") {
    return { text: "Pending", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" };
  }
  if (employee.employee_is_active === 1) {
    return { text: "Active", className: "bg-green-500/20 text-green-300 border-green-500/30" };
  }
  return { text: "Inactive", className: "bg-gray-500/20 text-gray-300 border-gray-500/30" };
}

export default function EmployeesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all | pending | active | inactive
  const [page, setPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(() => {
    const saved = localStorage.getItem("employees_limit");
    return (saved ? parseInt(saved) : 10) as ItemsPerPage;
  });

  useEffect(() => {
    localStorage.setItem("employees_limit", itemsPerPage.toString());
  }, [itemsPerPage]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [showImportErrors, setShowImportErrors] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeToApprove, setEmployeeToApprove] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const formLink = useMemo(() => `${window.location.origin}/employee-form`, []);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);
  const { data, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: Employee[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["/api/employees", searchQuery, statusFilter, page, itemsPerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery && searchQuery.trim()) params.append("search", searchQuery.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", page.toString());
      params.append("limit", itemsPerPage.toString());
      const url = buildApiUrl(`/api/employees?${params.toString()}`);
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const err = await response.json().catch(() => ({ error: "Failed to fetch employees" }));
          throw new Error(err.error || err.message || "Failed to fetch employees");
        }
        throw new Error(`Failed to fetch employees (${response.status})`);
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
  });

  const employees = data?.data || [];
  const pagination = data?.pagination;

  useEffect(() => {
    if (pagination && pagination.totalPages > 0) {
      if (page > pagination.totalPages) setPage(pagination.totalPages);
      if (page < 1) setPage(1);
    }
  }, [pagination, page]);

  const addForm = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: "",
      personalEmail: "",
      workEmail: "",
      mobileNumber: "",
      telephone: "",
      ssnEin: "",
      shirtSize: "",
      street: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
      departmentName: "",
      jobTitleName: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: EmployeeFormData) => {
      const response = await fetch(buildApiUrl("/api/employees"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: payload.firstName,
          lastName: payload.lastName,
          middleName: payload.middleName || "",
          personalEmail: payload.personalEmail,
          workEmail: payload.workEmail || payload.personalEmail,
          mobileNumber: payload.mobileNumber || "",
          telephone: payload.telephone || "",
          ssnEin: payload.ssnEin || "",
          shirtSize: payload.shirtSize || "",
          street: payload.street || "",
          city: payload.city || "",
          state: payload.state || "",
          country: payload.country || "",
          zipCode: payload.zipCode || "",
          departmentName: payload.departmentName || "",
          jobTitleName: payload.jobTitleName || "",
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to create employee" }));
        throw new Error(err.error || err.message || "Failed to create employee");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Success", description: "Employee created successfully." });
      setIsAddModalOpen(false);
      addForm.reset();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to create employee", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      const response = await fetch(buildApiUrl(`/api/employees/${employeeId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "" }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to approve employee" }));
        throw new Error(err.error || err.message || "Failed to approve employee");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Approved", description: "Employee approved successfully." });
      setEmployeeToApprove(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to approve employee", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      const response = await fetch(buildApiUrl(`/api/employees/${employeeId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to delete employee" }));
        throw new Error(err.error || err.message || "Failed to delete employee");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Deleted", description: "Employee deleted successfully." });
      setEmployeeToDelete(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to delete employee", variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(buildApiUrl("/api/admin/employees/import"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to import employees" }));
        throw new Error(err.error || err.message || "Failed to import employees");
      }
      return response.json();
    },
    onSuccess: (resp: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      const payload = resp?.data || resp;
      const total = payload.total || 0;
      const successful = payload.successful || 0;
      const failed = payload.failed || 0;
      const errors = payload.errors || [];

      toast({
        title: "Import Completed",
        description: `${successful} of ${total} records imported successfully${failed > 0 ? `. ${failed} failed.` : ""}`,
      });

      if (failed > 0 && errors.length > 0) {
        setImportErrors(errors);
        setShowImportErrors(true);
      } else {
        setIsImportModalOpen(false);
        setImportFile(null);
        setImportErrors([]);
      }
    },
    onError: (e: any) => {
      toast({ title: "Import Failed", description: e.message || "Failed to import employees", variant: "destructive" });
    },
  });

  const handleCopyFormLink = async () => {
    try {
      await navigator.clipboard.writeText(formLink);
      toast({ title: "Copied", description: "Employee onboarding form link copied to clipboard." });
    } catch {
      toast({ title: "Copy Failed", description: "Could not copy link. Please copy manually.", variant: "destructive" });
    }
  };

  // Open QR dialog
  const openQRDialog = () => setIsQRDialogOpen(true);

  // View button opens the form link in a new tab
  const handleViewForm = () => {
    window.open(formLink, "_blank", "noopener,noreferrer");
  };

  // Print QR using standard Google-style print pattern
  const handlePrintQR = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector("svg");
    if (!svgElement) {
      toast({ title: "Print failed", description: "QR code not found.", variant: "destructive" });
      return;
    }

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // Remove any existing print container (cleanup from earlier attempts)
      const existing = document.getElementById("print-qr-container-gla");
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      // Create a temporary container div for printing
      const printContainer = document.createElement("div");
      printContainer.id = "print-qr-container-gla";
      // keep hidden on screen explicitly and mark aria-hidden
      printContainer.style.display = "none";
      printContainer.setAttribute("aria-hidden", "true");

      // Create the print content with proper structure
      const printContent = document.createElement("div");
      printContent.className = "print-qr-content";

      // Add CSS for print styling (embedded directly)
      const styleSheet = document.createElement("style");
      styleSheet.type = "text/css";
      styleSheet.media = "print";
      styleSheet.textContent = `
        @media print {
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body {
            width: 100%;
            height: 100%;
            background: white;
          }

          body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }

          /* Hide everything by default during print */
          body > * {
            display: none !important;
          }

          /* Show only the print container */
          #print-qr-container-gla {
            display: flex !important;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: auto;
            background: white;
          }

          /* Show all children of print container */
          #print-qr-container-gla > * {
            display: block !important;
            visibility: visible !important;
          }

          .print-qr-content {
            text-align: center;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
          }

          .print-qr-logo {
            display: block;
            margin: 10px auto 8px;
            width: 260px;
            height: auto;
          }

          .print-qr-content svg {
            display: block !important;
            margin: 10px auto;
            width: 420px;
            height: 420px;
            background: white;
            border: none;
            page-break-inside: avoid;
          }

          .print-qr-title {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: #111;
            margin: 8px 0 6px;
            text-align: center;
          }

          .print-qr-caption {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            color: #111;
            font-weight: 600;
            margin-top: 8px;
            margin-bottom: 8px;
            text-align: center;
          }

          .print-qr-url-label {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #666;
            margin-top: 12px;
            text-align: center;
          }

          .print-qr-url {
            font-family: "Courier New", monospace;
            font-size: 11px;
            color: #000;
            margin: 6px 0 24px;
            word-break: break-all;
            max-width: 700px;
            text-align: center;
            line-height: 1.4;
          }

          /* Ensure page breaks and sizing work properly */
          @page {
            size: letter;
            margin: 0.5in;
          }
        }

        @media screen {
          #print-qr-container-gla {
            display: none !important;
          }
        }
      `;

      // Build print content structure matching requested design
      const logoImg = document.createElement("img");
      logoImg.src = "/logo.svg";
      logoImg.alt = "Golden Luxury Auto";
      logoImg.className = "print-qr-logo";

      const title = document.createElement("div");
      title.className = "print-qr-title";
      title.textContent = "Golden Luxury Auto System";

      const qrWrapper = document.createElement("div");
      qrWrapper.className = "print-qr-wrapper";
      qrWrapper.appendChild(clonedSvg);

      const caption = document.createElement("div");
      caption.className = "print-qr-caption";
      caption.textContent = "Scan to view Employee Form";

      const urlLabel = document.createElement("div");
      urlLabel.className = "print-qr-url-label";
      urlLabel.textContent = "Url link:";

      const urlText = document.createElement("div");
      urlText.className = "print-qr-url";
      urlText.textContent = formLink;

      // Append in the desired order (logo, title, QR, caption, url label, url)
      printContent.appendChild(logoImg);
      printContent.appendChild(title);
      printContent.appendChild(qrWrapper);
      printContent.appendChild(caption);
      printContent.appendChild(urlLabel);
      printContent.appendChild(urlText);

      printContainer.appendChild(styleSheet);
      printContainer.appendChild(printContent);

      // Append to body temporarily
      document.body.appendChild(printContainer);

      // Trigger print dialog
      window.print();

      // Clean up after print dialog closes or after a delay
      // Use setTimeout to allow print dialog to complete
      const cleanupTimeout = setTimeout(() => {
        if (printContainer && printContainer.parentNode) {
          document.body.removeChild(printContainer);
        }
      }, 1000);

      // Also try to clean up when print dialog closes (if browser supports beforeprint/afterprint)
      const afterPrintHandler = () => {
        clearTimeout(cleanupTimeout);
        if (printContainer && printContainer.parentNode) {
          document.body.removeChild(printContainer);
        }
        window.removeEventListener("afterprint", afterPrintHandler);
      };

      window.addEventListener("afterprint", afterPrintHandler);

      toast({
        title: "Print dialog opened",
        description: "Select your printer and click Print.",
      });
    } catch (error) {
      console.error("Error printing QR:", error);
      toast({
        title: "Print failed",
        description: "An unexpected error occurred while preparing the print.",
        variant: "destructive",
      });
    }
  };

  const downloadExport = async (format: "xlsx" | "csv", mode: "template" | "data") => {
    try {
      const url = buildApiUrl(`/api/admin/employees/export?format=${format}&mode=${mode}`);
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const err = await response.json().catch(() => ({ error: "Failed to export" }));
          throw new Error(err.error || err.message || "Failed to export");
        }
        throw new Error(`Failed to export (${response.status})`);
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `employees_${mode}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
      toast({ title: "Download Started", description: `Employees ${mode} ${format.toUpperCase()} downloaded.` });
    } catch (e: any) {
      toast({ title: "Export Failed", description: e.message || "Failed to export", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#EAEB80] italic mb-1 sm:mb-2">
              Employees
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">
              Manage employees and employee onboarding submissions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570] w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              Add
            </Button>

            <Button
              onClick={openQRDialog}
              variant="outline"
              className="border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10 w-full sm:w-auto"
            >
              <Copy className="w-4 h-4 sm:mr-2" />
              Form Link
            </Button>

            <Button
              onClick={() => setIsImportModalOpen(true)}
              variant="outline"
              className="border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10 w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              Import
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 sm:mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#111111] border-[#2a2a2a] text-white">
                <DropdownMenuItem onClick={() => downloadExport("xlsx", "template")}>
                  Template (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadExport("csv", "template")}>
                  Template (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadExport("xlsx", "data")}>
                  Data (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadExport("csv", "data")}>
                  Data (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>

            {/* QR Code Dialog */}
            <Dialog open={isQRDialogOpen} onOpenChange={(open) => !open && setIsQRDialogOpen(false)}>
              <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Employee Onboarding Form</DialogTitle>
                </DialogHeader>

                <div className="p-4 text-center">
                  <div ref={qrRef} className="bg-white p-4 rounded-lg inline-block mb-4">
                    <QRCodeSVG value={formLink} size={220} level="H" includeMargin={false} />
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-400 break-words">{formLink}</p>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button onClick={handlePrintQR} className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
                      Print
                    </Button>
                    <Button onClick={handleViewForm} variant="outline" className="border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10">
                      View
                    </Button>
                    <Button onClick={handleCopyFormLink} variant="ghost" className="text-gray-400 hover:text-white">
                      Copy Link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </DropdownMenu>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="bg-[#111111] border-[#2a2a2a]">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search by name, email, employee #..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[220px] bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
          <CardContent className="p-0">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                    <TableHead className="text-center text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 w-16 text-[10px] sm:text-xs">
                      No
                    </TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 min-w-[140px] text-[10px] sm:text-xs">
                      Status
                    </TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 min-w-[140px] text-[10px] sm:text-xs">
                      Employee #
                    </TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 min-w-[220px] text-[10px] sm:text-xs">
                      Employee Name
                    </TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 min-w-[240px] text-[10px] sm:text-xs hidden lg:table-cell">
                      Work Email
                    </TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 min-w-[180px] text-[10px] sm:text-xs hidden xl:table-cell">
                      Department
                    </TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 min-w-[180px] text-[10px] sm:text-xs hidden xl:table-cell">
                      Job Title
                    </TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 min-w-[140px] text-[10px] sm:text-xs hidden md:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="text-center text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 w-28 text-[10px] sm:text-xs">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRowSkeleton colSpan={9} rows={5} />
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-3">
                          <p className="text-red-400">
                            {error instanceof Error ? error.message : "Failed to fetch employees"}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="border-[#EAEB80] text-[#EAEB80] hover:bg-[#EAEB80]/10"
                          >
                            Retry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                        No employees found. Try adjusting your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp, index) => {
                      const rowNumber =
                        (pagination ? (pagination.page - 1) * pagination.limit : 0) + index + 1;
                      const badge = statusBadge(emp);
                      return (
                        <TableRow key={emp.employee_aid} className="border-[#2a2a2a] group">
                          <TableCell className="text-center text-[#EAEB80] font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle text-xs sm:text-sm">
                            {rowNumber}
                          </TableCell>
                          <TableCell className="text-left px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", badge.className)}
                            >
                              {badge.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left text-gray-200 px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle text-xs sm:text-sm">
                            {emp.employee_number || <span className="text-gray-600">N/A</span>}
                          </TableCell>
                          <TableCell className="text-left text-white font-medium px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle text-xs sm:text-sm">
                            {emp.employee_last_name}, {emp.employee_first_name}
                          </TableCell>
                          <TableCell className="text-left text-gray-300 px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle text-xs sm:text-sm hidden lg:table-cell">
                            {emp.employee_job_pay_work_email || emp.employee_email || (
                              <span className="text-gray-600">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-left text-gray-400 px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle text-xs sm:text-sm hidden xl:table-cell">
                            {emp.employee_job_pay_department_name || <span className="text-gray-600">—</span>}
                          </TableCell>
                          <TableCell className="text-left text-gray-400 px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle text-xs sm:text-sm hidden xl:table-cell">
                            {emp.employee_job_pay_job_title_name || <span className="text-gray-600">—</span>}
                          </TableCell>
                          <TableCell className="text-left text-gray-400 px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle text-xs sm:text-sm hidden md:table-cell">
                            {formatDate(emp.employee_created)}
                          </TableCell>
                          <TableCell className="text-center px-2 sm:px-4 md:px-6 py-3 sm:py-4 align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-[#EAEB80] hover:text-[#EAEB80] hover:bg-[#EAEB80]/10 rounded-full"
                                onClick={() => setSelectedEmployee(emp)}
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {emp.employee_status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-full"
                                  onClick={() => setEmployeeToApprove(emp)}
                                  title="Approve"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full"
                                onClick={() => setEmployeeToDelete(emp)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {pagination && pagination.total > 0 && (
              <TablePagination
                totalItems={pagination.total}
                itemsPerPage={itemsPerPage}
                currentPage={Math.min(page, pagination.totalPages)}
                onPageChange={(newPage) => {
                  const validPage = Math.max(1, Math.min(newPage, pagination.totalPages));
                  setPage(validPage);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onItemsPerPageChange={(newLimit) => {
                  setItemsPerPage(newLimit);
                  setPage(1);
                }}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        {/* Add Employee Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-[#EAEB80]">Add New Employee</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create an employee record (this does not submit the public onboarding form)
              </DialogDescription>
            </DialogHeader>

            <Form {...addForm}>
              <form
                onSubmit={addForm.handleSubmit((values) => createMutation.mutate(values))}
                className="space-y-6 mt-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Middle Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="personalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Personal Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="workEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Work Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Mobile #</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="departmentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Department</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="jobTitleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Job Title</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      addForm.reset();
                    }}
                    className="text-gray-400 hover:text-white"
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Import Modal */}
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-[95vw] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-[#EAEB80] flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Import Employees
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Upload an Excel (.xlsx, .xls) or CSV file. Use Export → Template to download the correct format.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label
                  htmlFor="import-file"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#EAEB80]/40 rounded-xl bg-[#0a0a0a]/50 hover:border-[#EAEB80]/60 hover:bg-[#EAEB80]/5 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-[#EAEB80] mb-3 group-hover:scale-110 transition-transform" />
                    <p className="mb-2 text-sm font-semibold text-gray-300 group-hover:text-[#EAEB80] transition-colors">
                      {importFile ? importFile.name : "Click to Upload or Drag and Drop"}
                    </p>
                    <p className="text-xs text-gray-500">Excel (.xlsx, .xls) or CSV file (Max 100MB)</p>
                  </div>
                  <input
                    id="import-file"
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setImportFile(file);
                    }}
                    className="hidden"
                  />
                </label>

                {importFile && (
                  <div className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-[#EAEB80]" />
                      <span className="text-sm text-gray-300">{importFile.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImportFile(null)}
                      className="text-gray-400 hover:text-white h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFile(null);
                    setImportErrors([]);
                  }}
                  className="text-gray-400 hover:text-white"
                  disabled={importMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!importFile) {
                      toast({
                        title: "No File Selected",
                        description: "Please select an Excel or CSV file to import",
                        variant: "destructive",
                      });
                      return;
                    }
                    importMutation.mutate(importFile);
                  }}
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                  disabled={!importFile || importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Errors */}
        <Dialog open={showImportErrors} onOpenChange={setShowImportErrors}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-[95vw] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-yellow-400">
                Import Warning ({importErrors.length})
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                The following rows failed to import. Please review and fix the issues.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {importErrors.map((err, idx) => (
                <div key={idx} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-semibold text-sm">
                      {err.row}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300 break-words">
                        <span className="font-medium text-white">Row {err.row}:</span> {err.error}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[#2a2a2a]">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportErrors(false);
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportErrors([]);
                }}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve confirmation */}
        <Dialog open={employeeToApprove !== null} onOpenChange={(open) => !open && setEmployeeToApprove(null)}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-green-400">Approve Employee</DialogTitle>
              <DialogDescription className="text-gray-400">
                {employeeToApprove ? (
                  <>
                    Approve <strong className="text-white">{employeeToApprove.employee_last_name}, {employeeToApprove.employee_first_name}</strong>?
                    <br />
                    This will change the employee status from Pending to Approved.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setEmployeeToApprove(null)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={approveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => employeeToApprove && approveMutation.mutate(employeeToApprove.employee_aid)}
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={employeeToDelete !== null} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-red-400">Delete Employee</DialogTitle>
              <DialogDescription className="text-gray-400">
                {employeeToDelete ? (
                  <>
                    Are you sure you want to delete <strong className="text-white">{employeeToDelete.employee_last_name}, {employeeToDelete.employee_first_name}</strong>?
                    <br />
                    This action cannot be undone.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setEmployeeToDelete(null)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => employeeToDelete && deleteMutation.mutate(employeeToDelete.employee_aid)}
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Details modal */}
        <Dialog open={selectedEmployee !== null} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-[#EAEB80]">Employee Details</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedEmployee ? `${selectedEmployee.employee_last_name}, ${selectedEmployee.employee_first_name}` : ""}
              </DialogDescription>
            </DialogHeader>

            {selectedEmployee && (
              <div className="space-y-6 mt-2 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <h3 className="text-[#EAEB80] font-semibold mb-3">Basic</h3>
                    <div className="space-y-1 text-gray-300">
                      <div><span className="text-gray-500">Employee #:</span> {selectedEmployee.employee_number || "—"}</div>
                      <div><span className="text-gray-500">Personal Email:</span> {selectedEmployee.employee_email || "—"}</div>
                      <div><span className="text-gray-500">Work Email:</span> {selectedEmployee.employee_job_pay_work_email || "—"}</div>
                      <div><span className="text-gray-500">Mobile:</span> {selectedEmployee.employee_mobile_number || "—"}</div>
                      <div><span className="text-gray-500">SSN/EIN:</span> {selectedEmployee.employee_ssn_ein || "—"}</div>
                      <div><span className="text-gray-500">Shirt Size:</span> {selectedEmployee.employee_shirt_size || "—"}</div>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <h3 className="text-[#EAEB80] font-semibold mb-3">Job</h3>
                    <div className="space-y-1 text-gray-300">
                      <div><span className="text-gray-500">Department:</span> {selectedEmployee.employee_job_pay_department_name || "—"}</div>
                      <div><span className="text-gray-500">Job Title:</span> {selectedEmployee.employee_job_pay_job_title_name || "—"}</div>
                      <div><span className="text-gray-500">Status:</span> {selectedEmployee.employee_status || "Approved"}</div>
                      <div><span className="text-gray-500">Created:</span> {formatDate(selectedEmployee.employee_created)}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <h3 className="text-[#EAEB80] font-semibold mb-3">Address</h3>
                  <div className="text-gray-300">
                    {[selectedEmployee.employee_street, selectedEmployee.employee_city, selectedEmployee.employee_state, selectedEmployee.employee_zip_code, selectedEmployee.employee_country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <h3 className="text-[#EAEB80] font-semibold mb-3">Family</h3>
                    <div className="space-y-1 text-gray-300">
                      <div><span className="text-gray-500">Mother:</span> {selectedEmployee.employee_mother_name || "—"}</div>
                      <div><span className="text-gray-500">Father:</span> {selectedEmployee.employee_father_name || "—"}</div>
                      <div><span className="text-gray-500">Home Contact:</span> {selectedEmployee.employee_home_contact || "—"}</div>
                      <div><span className="text-gray-500">Home Address:</span> {selectedEmployee.employee_home_address || "—"}</div>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <h3 className="text-[#EAEB80] font-semibold mb-3">Emergency</h3>
                    <div className="space-y-1 text-gray-300">
                      <div><span className="text-gray-500">Contact:</span> {selectedEmployee.employee_emergency_contact_person || "—"}</div>
                      <div><span className="text-gray-500">Relationship:</span> {selectedEmployee.employee_emergency_relationship || "—"}</div>
                      <div><span className="text-gray-500">Number:</span> {selectedEmployee.employee_emergency_number || "—"}</div>
                      <div><span className="text-gray-500">Address:</span> {selectedEmployee.employee_emergency_address || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

