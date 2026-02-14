import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildApiUrl } from "@/lib/queryClient";
import { EmployeeDocumentImage } from "@/components/admin/EmployeeDocumentImage";
import { ArrowLeft, ChevronRight, Image, List, Loader2, User } from "lucide-react";

type ProfileSection =
  | "personal-information"
  | "job-and-pay"
  | "rate-history"
  | "job-history"
  | "earnings"
  | "deduction"
  | "payslip";

const PROFILE_SECTIONS: { id: ProfileSection; label: string }[] = [
  { id: "personal-information", label: "Personal Information" },
  { id: "job-and-pay", label: "Job and Pay" },
  { id: "rate-history", label: "Rate History" },
  { id: "job-history", label: "Job History" },
  { id: "earnings", label: "Earnings" },
  { id: "deduction", label: "Deduction" },
  { id: "payslip", label: "Payslip" },
];

interface Employee {
  employee_aid: number;
  employee_number: string;
  employee_first_name: string;
  employee_last_name: string;
  employee_middle_name: string;
  employee_email: string;
  employee_birthday: string;
  employee_marital_status: string;
  employee_street: string;
  employee_city: string;
  employee_state: string;
  employee_country: string;
  employee_zip_code: string;
  employee_mobile_number: string;
  employee_telephone: string;
  employee_mother_name: string;
  employee_father_name: string;
  employee_home_contact: string;
  employee_home_address: string;
  employee_emergency_contact_person: string;
  employee_emergency_relationship: string;
  employee_emergency_address: string;
  employee_emergency_number: string;
  employee_ssn_ein: string;
  employee_shirt_size: string;
  employee_photo?: string | null;
  employee_driver_license_photo?: string | null;
  employee_car_insurance?: string | null;
  employee_hear_about_gla?: string | null;
  employee_job_pay_work_email?: string | null;
  employee_job_pay_department_name?: string | null;
  employee_job_pay_job_title_name?: string | null;
  employee_job_pay_hired?: string | null;
  employee_job_pay_regular_on?: string | null;
  employee_job_pay_separated?: string | null;
  employee_job_pay_comment?: string | null;
  employee_job_pay_eligible?: number | null;
  employee_job_pay_salary_rate?: string | null;
  employee_job_pay_bank_acc?: string | null;
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function unspecified(val: string | null | undefined): string {
  return (val ?? "").trim() || "Unspecified";
}

function formatCurrency(val: string | number | null | undefined): string {
  const n = parseFloat(String(val ?? 0));
  return isNaN(n) ? "$0.00" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function StaffMyInfoSection() {
  const [, params] = useRoute("/staff/my-info/:section");
  const section = (params?.section as ProfileSection) || "personal-information";
  const isValidSection = PROFILE_SECTIONS.some((s) => s.id === section);

  const { data: empRes, isLoading: empLoading, error: empError } = useQuery<{ success: boolean; data: Employee }>({
    queryKey: ["/api/me/employee"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/me/employee"), { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load your employee record");
      }
      return res.json();
    },
  });

  const employee = empRes?.data;

  const { data: rateHistoryData, isLoading: rateHistoryLoading } = useQuery<{ success: boolean; data: { rate_history_aid: number; rate_history_amount: string; rate_history_date: string; rate_history_created?: string; rate_history_pay_type?: string; rate_history_effective_start?: string; rate_history_effective_end?: string | null }[] }>({
    queryKey: ["/api/me/rate-history"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/me/rate-history"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rate history");
      return res.json();
    },
    enabled: section === "rate-history",
  });

  const { data: jobHistoryData, isLoading: jobHistoryLoading } = useQuery<{ success: boolean; data: { employment_history_aid: number; employment_history_company_name: string; employment_history_years_deployed: string; employment_history_start_date: string; employment_history_end_date: string; employment_history_is_active: number }[] }>({
    queryKey: ["/api/me/employment-history"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/me/employment-history"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employment history");
      return res.json();
    },
    enabled: section === "job-history",
  });

  const { data: earningsData, isLoading: earningsLoading } = useQuery<{ success: boolean; data: { hris_earning_deduction_aid: number; hris_earning_deduction_amount: string; hris_earning_deduction_date: string; hris_earning_deduction_is_paid: number; payitem_name?: string }[] }>({
    queryKey: ["/api/me/earnings"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/me/earnings"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch earnings");
      return res.json();
    },
    enabled: section === "earnings",
  });

  const { data: deductionsData, isLoading: deductionsLoading } = useQuery<{ success: boolean; data: { hris_earning_deduction_aid: number; hris_earning_deduction_amount: string; hris_earning_deduction_date: string; hris_earning_deduction_is_paid: number; payitem_name?: string }[] }>({
    queryKey: ["/api/me/deductions"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/me/deductions"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deductions");
      return res.json();
    },
    enabled: section === "deduction",
  });

  const { data: payslipsData, isLoading: payslipsLoading } = useQuery<{ success: boolean; data: { payrun_list_aid: number; payrun_number?: string; payrun_status?: number; payrun_list_gross: string; payrun_list_deduction: string; payrun_list_net: string }[] }>({
    queryKey: ["/api/me/payslips"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/me/payslips"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payslips");
      return res.json();
    },
    enabled: section === "payslip",
  });

  if (!isValidSection) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-muted-foreground">
          <p>Invalid section.</p>
          <Link href="/staff/my-info">
            <Button variant="outline" className="mt-4 border-primary/30 text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Info
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (empLoading || !empRes) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (empError || !employee) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <p className="text-red-700">We couldn’t load your employee record. You may not have an HR profile linked to this account.</p>
          <Link href="/staff/my-info">
            <Button variant="outline" className="mt-4 border-primary/30 text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Info
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const fullName = `${employee.employee_last_name}, ${employee.employee_first_name}`;

  const renderSectionContent = () => {
    if (section === "personal-information") {
      return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 text-sm xl:items-stretch">
          <Card className="bg-card border-border xl:h-full flex flex-col">
            <CardContent className="p-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <span className="font-bold uppercase text-[13px] text-primary">Basic Information</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-3">
                  <p className="font-bold text-foreground mb-1">Profile Photo <span className="font-normal text-muted-foreground">(Optional)</span></p>
                  {employee.employee_photo ? (
                    <EmployeeDocumentImage
                      value={employee.employee_photo}
                      alt="Profile"
                      className="h-20 w-20 rounded-full object-cover object-center"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full border-2 border-border flex items-center justify-center" title="No photo uploaded (optional)">
                      <Image className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <ul className="grid grid-cols-[150px,1fr] md:grid-cols-[200px,1fr] gap-x-4 gap-y-1 text-muted-foreground capitalize">
                  <li className="font-bold text-foreground">First Name:</li><li>{unspecified(employee.employee_first_name)}</li>
                  <li className="font-bold text-foreground">Middle Name:</li><li>{unspecified(employee.employee_middle_name)}</li>
                  <li className="font-bold text-foreground">Last Name:</li><li>{unspecified(employee.employee_last_name)}</li>
                  <li className="font-bold text-foreground">Birth Date:</li><li>{employee.employee_birthday ? formatDate(employee.employee_birthday) : "Unspecified"}</li>
                  <li className="font-bold text-foreground">Marital Status:</li><li>{unspecified(employee.employee_marital_status)}</li>
                  <li className="font-bold text-foreground">Social Security Number or EIN:</li><li>{unspecified(employee.employee_ssn_ein)}</li>
                  <li className="font-bold text-foreground">Street:</li><li>{unspecified(employee.employee_street)}</li>
                  <li className="font-bold text-foreground">City:</li><li>{unspecified(employee.employee_city)}</li>
                  <li className="font-bold text-foreground">State:</li><li>{unspecified(employee.employee_state)}</li>
                  <li className="font-bold text-foreground">Zip Code:</li><li>{unspecified(employee.employee_zip_code)}</li>
                  <li className="font-bold text-foreground">Country:</li><li>{unspecified(employee.employee_country)}</li>
                  <li className="font-bold text-foreground">Mobile Number:</li><li>{unspecified(employee.employee_mobile_number)}</li>
                  <li className="font-bold text-foreground">Telephone Number:</li><li>{unspecified(employee.employee_telephone)}</li>
                  <li className="font-bold text-foreground">Personal Email:</li><li className="break-words">{unspecified(employee.employee_email)}</li>
                  <li className="font-bold text-foreground">Shirt Size:</li><li>{unspecified(employee.employee_shirt_size)}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border xl:h-full flex flex-col">
            <CardContent className="p-4 flex flex-col flex-1">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <span className="font-bold uppercase text-[13px] text-primary">Other Information</span>
                </div>
              </div>
              <div className="mt-3 space-y-4 flex-1">
                <div>
                  <p className="font-bold text-foreground mb-2">Driver&apos;s License <span className="font-normal text-muted-foreground">(Optional)</span></p>
                  <div className="w-full max-w-[20rem] h-[9.7rem] border border-border rounded-md overflow-hidden bg-background">
                    {employee.employee_driver_license_photo ? (
                      <EmployeeDocumentImage value={employee.employee_driver_license_photo} alt="Driver's license" className="w-full h-full object-cover object-center" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1" title="No document uploaded">
                        <Image className="h-12 w-12 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">No document uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-foreground mb-2">Car Insurance <span className="font-normal text-muted-foreground">(Optional)</span></p>
                  <div className="w-full max-w-[20rem] h-[9.7rem] border border-border rounded-md overflow-hidden bg-background">
                    {employee.employee_car_insurance ? (
                      <EmployeeDocumentImage value={employee.employee_car_insurance} alt="Car insurance" className="w-full h-full object-cover object-center" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1" title="No document uploaded">
                        <Image className="h-12 w-12 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">No document uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[18rem,1fr] gap-2">
                  <p className="font-bold text-foreground">How did you hear about Golden Luxury Auto?</p>
                  <p className="text-muted-foreground">{unspecified(employee.employee_hear_about_gla)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <span className="font-bold uppercase text-[13px] text-primary">Family Information</span>
                </div>
              </div>
              <div className="mt-3">
                <ul className="grid grid-cols-[150px,1fr] md:grid-cols-[200px,1fr] gap-x-4 gap-y-1 text-muted-foreground capitalize">
                  <li className="font-bold text-foreground">Mother&apos;s First Name:</li><li>{unspecified(employee.employee_mother_name)}</li>
                  <li className="font-bold text-foreground">Father&apos;s First Name:</li><li>{unspecified(employee.employee_father_name)}</li>
                  <li className="font-bold text-foreground">Home Contact:</li><li>{unspecified(employee.employee_home_contact)}</li>
                  <li className="font-bold text-foreground">Family Home Address:</li><li className="break-words">{unspecified(employee.employee_home_address)}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <span className="font-bold uppercase text-[13px] text-primary">Emergency Contact</span>
                </div>
              </div>
              <div className="mt-3">
                <ul className="grid grid-cols-[150px,1fr] md:grid-cols-[200px,1fr] gap-x-4 gap-y-1 text-muted-foreground capitalize">
                  <li className="font-bold text-foreground">Name:</li><li>{unspecified(employee.employee_emergency_contact_person)}</li>
                  <li className="font-bold text-foreground">Relationship:</li><li>{unspecified(employee.employee_emergency_relationship)}</li>
                  <li className="font-bold text-foreground">Number:</li><li>{unspecified(employee.employee_emergency_number)}</li>
                  <li className="font-bold text-foreground">Address:</li><li className="break-words">{unspecified(employee.employee_emergency_address)}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (section === "job-and-pay") {
      return (
        <div className="space-y-4 max-w-[50rem]">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <span className="font-bold uppercase text-[13px] text-primary">Job Information</span>
                </div>
              </div>
              <ul className="grid grid-cols-[150px,1fr] md:grid-cols-[200px,1fr] gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <li className="font-bold text-foreground">Employee Number:</li><li>{unspecified(employee.employee_number)}</li>
                <li className="font-bold text-foreground">Department:</li><li>{unspecified(employee.employee_job_pay_department_name)}</li>
                <li className="font-bold text-foreground">Job Title:</li><li>{unspecified(employee.employee_job_pay_job_title_name)}</li>
                <li className="font-bold text-foreground">Work Email:</li><li className="break-words">{unspecified(employee.employee_job_pay_work_email ?? employee.employee_email)}</li>
                <li className="font-bold text-foreground">Date Hired:</li><li>{employee.employee_job_pay_hired ? formatDate(employee.employee_job_pay_hired) : "Unspecified"}</li>
                <li className="font-bold text-foreground">Regularized On:</li><li>{employee.employee_job_pay_regular_on ? formatDate(employee.employee_job_pay_regular_on) : "Unspecified"}</li>
                <li className="font-bold text-foreground">Date Separated:</li><li>{employee.employee_job_pay_separated ? formatDate(employee.employee_job_pay_separated) : "Unspecified"}</li>
                <li className="font-bold text-foreground">Comment:</li><li>{unspecified(employee.employee_job_pay_comment)}</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <span className="font-bold uppercase text-[13px] text-primary">Pay Information</span>
                </div>
              </div>
              <ul className="grid grid-cols-[150px,1fr] md:grid-cols-[200px,1fr] gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <li className="font-bold text-foreground">Payroll Eligibility:</li><li>{Number(employee.employee_job_pay_eligible) === 1 ? "Eligible" : "Not Eligible"}</li>
                <li className="font-bold text-foreground">Employee rate per hour:</li><li>{formatCurrency(employee.employee_job_pay_salary_rate)}</li>
                <li className="font-bold text-foreground">Bank Account:</li><li>{unspecified(employee.employee_job_pay_bank_acc)}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (section === "rate-history") {
      const loading = rateHistoryLoading;
      const rows = rateHistoryData?.data ?? [];
      return (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-primary font-semibold mb-3 border-b border-border pb-2">Rate History</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card">
                      <th className="text-center py-3 w-12 text-foreground font-medium">#</th>
                      <th className="text-left py-3 min-w-[5rem] text-foreground font-medium">Status</th>
                      <th className="text-left py-3 min-w-[6rem] text-foreground font-medium">Pay Type</th>
                      <th className="text-left py-3 min-w-[10rem] text-foreground font-medium">Effective Start</th>
                      <th className="text-left py-3 min-w-[10rem] text-foreground font-medium">Effective End</th>
                      <th className="text-right py-3 min-w-[6rem] text-foreground font-medium">Amount</th>
                      <th className="text-left py-3 min-w-[12rem] text-foreground font-medium">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.rate_history_aid} className="border-b border-border/50 hover:bg-card/50">
                        <td className="py-3 text-center text-muted-foreground">{i + 1}.</td>
                        <td className="py-3 pl-2">
                          <span className={`inline-block w-5 h-5 rounded-full flex-shrink-0 ${!row.rate_history_effective_end || row.rate_history_effective_end === "" ? "bg-green-500" : "bg-gray-500/50"}`} title={!row.rate_history_effective_end || row.rate_history_effective_end === "" ? "Current rate" : "Previous rate"} />
                        </td>
                        <td className="py-3 text-muted-foreground capitalize">{row.rate_history_pay_type || "Hourly"}</td>
                        <td className="py-3 text-muted-foreground">{formatDate(row.rate_history_effective_start || row.rate_history_date)}</td>
                        <td className="py-3 text-muted-foreground">{row.rate_history_effective_end ? formatDate(row.rate_history_effective_end) : "—"}</td>
                        <td className="py-3 text-right text-muted-foreground">{formatCurrency(row.rate_history_amount)}</td>
                        <td className="py-3 text-muted-foreground">{formatDateTime(row.rate_history_created)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-center text-sm text-foreground py-4">End of list.</p>
              </div>
            ) : (
              <p className="text-sm text-foreground">No rate history recorded yet.</p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (section === "job-history") {
      const loading = jobHistoryLoading;
      const rows = jobHistoryData?.data ?? [];
      return (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-primary font-semibold mb-3 border-b border-border pb-2">Job History</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-foreground font-medium">#</th>
                      <th className="text-left py-2 text-foreground font-medium">Status</th>
                      <th className="text-left py-2 text-foreground font-medium">Company Name</th>
                      <th className="text-left py-2 text-foreground font-medium">Years Deployed</th>
                      <th className="text-left py-2 text-foreground font-medium">From</th>
                      <th className="text-left py-2 text-foreground font-medium">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.employment_history_aid} className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">{i + 1}.</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${row.employment_history_is_active === 1 ? "bg-green-500/20 text-green-700" : "bg-gray-500/20 text-muted-foreground"}`}>
                            {row.employment_history_is_active === 1 ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground">{row.employment_history_company_name || "—"}</td>
                        <td className="py-2 text-muted-foreground">{row.employment_history_years_deployed || "—"}</td>
                        <td className="py-2 text-muted-foreground">{formatDate(row.employment_history_start_date)}</td>
                        <td className="py-2 text-muted-foreground">{formatDate(row.employment_history_end_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-foreground">No job history recorded yet.</p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (section === "earnings") {
      const loading = earningsLoading;
      const rows = earningsData?.data ?? [];
      return (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-primary font-semibold mb-3 border-b border-border pb-2">Earnings</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-foreground font-medium">#</th>
                      <th className="text-left py-2 text-foreground font-medium">Status</th>
                      <th className="text-left py-2 text-foreground font-medium">Date</th>
                      <th className="text-left py-2 text-foreground font-medium">Payitem</th>
                      <th className="text-right py-2 text-foreground font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.hris_earning_deduction_aid} className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">{i + 1}.</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${row.hris_earning_deduction_is_paid === 1 ? "bg-green-500/20 text-green-700" : "bg-yellow-500/20 text-yellow-700"}`}>
                            {row.hris_earning_deduction_is_paid === 1 ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground">{formatDate(row.hris_earning_deduction_date)}</td>
                        <td className="py-2 text-muted-foreground">{row.payitem_name || "—"}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(row.hris_earning_deduction_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-foreground">No earnings recorded yet.</p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (section === "deduction") {
      const loading = deductionsLoading;
      const rows = deductionsData?.data ?? [];
      return (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-primary font-semibold mb-3 border-b border-border pb-2">Deduction</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-foreground font-medium">#</th>
                      <th className="text-left py-2 text-foreground font-medium">Status</th>
                      <th className="text-left py-2 text-foreground font-medium">Date</th>
                      <th className="text-left py-2 text-foreground font-medium">Payitem</th>
                      <th className="text-right py-2 text-foreground font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.hris_earning_deduction_aid} className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">{i + 1}.</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${row.hris_earning_deduction_is_paid === 1 ? "bg-green-500/20 text-green-700" : "bg-yellow-500/20 text-yellow-700"}`}>
                            {row.hris_earning_deduction_is_paid === 1 ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground">{formatDate(row.hris_earning_deduction_date)}</td>
                        <td className="py-2 text-muted-foreground">{row.payitem_name || "—"}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(row.hris_earning_deduction_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-foreground">No deductions recorded yet.</p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (section === "payslip") {
      const loading = payslipsLoading;
      const rows = payslipsData?.data ?? [];
      return (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-primary font-semibold mb-3 border-b border-border pb-2">Payslip</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-foreground font-medium">#</th>
                      <th className="text-left py-2 text-foreground font-medium">Status</th>
                      <th className="text-left py-2 text-foreground font-medium">Payroll ID</th>
                      <th className="text-right py-2 text-foreground font-medium">Gross</th>
                      <th className="text-right py-2 text-foreground font-medium">Deduction</th>
                      <th className="text-right py-2 text-foreground font-medium">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.payrun_list_aid} className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">{i + 1}.</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${row.payrun_status === 1 ? "bg-green-500/20 text-green-700" : "bg-yellow-500/20 text-yellow-700"}`}>
                            {row.payrun_status === 1 ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground">{row.payrun_number || "—"}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(row.payrun_list_gross)}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(row.payrun_list_deduction)}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(row.payrun_list_net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-foreground">No payslips available yet.</p>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const currentLabel = PROFILE_SECTIONS.find((s) => s.id === section)?.label ?? section;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/staff/my-info">
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-serif text-primary italic">{fullName}</h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-72 shrink-0">
            <ul className="rounded-lg border border-border bg-card overflow-hidden">
              {PROFILE_SECTIONS.map((s) => {
                const isActive = section === s.id;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/staff/my-info/${s.id}`}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-card ${isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
                    >
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0" />
                        <span>{s.label}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                    </Link>
                    {s.id !== "payslip" && <div className="h-px bg-muted" aria-hidden />}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex-1 min-w-0">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
