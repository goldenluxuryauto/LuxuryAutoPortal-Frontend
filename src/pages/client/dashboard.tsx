import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Car,
  Calendar,
  ExternalLink,
  FileText,
  HelpCircle,
  Phone,
  Mail,
  Loader2,
  Wrench,
  AlertCircle,
  BarChart3,
  CreditCard,
  MapPin,
  Shield,
  Fuel,
  Gauge,
} from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { Link } from "wouter";
import { differenceInDays } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClientCar {
  id: number;
  vin: string | null;
  makeModel: string;
  make: string | null;
  model: string | null;
  licensePlate: string | null;
  year: number | null;
  mileage: number;
  status: string;
  exteriorColor: string | null;
  interiorColor: string | null;
  tireSize: string | null;
  oilType: string | null;
  lastOilChange: string | null;
  fuelType: string | null;
  registrationExpiration: string | null;
  photo?: string | null;
}

interface ClientProfile {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  cars: ClientCar[];
  onboarding?: {
    firstNameOwner?: string;
    lastNameOwner?: string;
    emailOwner?: string;
    phoneOwner?: string;
    insuranceProvider?: string;
    insuranceExpiration?: string;
    insurancePhone?: string;
    policyNumber?: string;
  } | null;
  bankingInfo?: {
    bankName?: string | null;
    accountNumber?: string | null;
  } | null;
}

interface Payment {
  payments_aid: number;
  payments_year_month: string;
  payments_amount: number;
  payments_amount_payout: number;
  payments_amount_balance: number;
  payments_reference_number: string;
  payments_invoice_id: string;
  payments_invoice_date: string | null;
  payments_remarks: string | null;
  payment_status_name: string;
  payment_status_color: string;
  car_make_model: string;
  car_plate_number: string;
}

interface TuroTrip {
  id: number;
  tripStart: string;
  tripEnd: string;
  earnings: number;
  cancelledEarnings: number;
  status: "booked" | "cancelled" | "completed";
  totalDistance: string | null;
  carName: string | null;
}

interface QuickLink {
  id: number;
  category: string;
  title: string;
  url: string;
  visibleToClients: boolean;
}

interface TotalsData {
  income?: { totalProfit?: number };
  carManagementSplit?: number;
  expenses?: { totalOperatingExpenses?: number };
  payments?: { total?: number };
  history?: { daysRented?: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CHART_GOLD = "#EAEB80";
const CHART_DARK = "#2a2a2a";
const CHART_GREEN = "#4ade80";
const CHART_RED = "#f87171";
const PIE_COLORS = [CHART_GOLD, "#60a5fa", CHART_GREEN, "#c084fc", "#fb923c"];

function fmt(val: number): string {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`;
}

function tripDays(trip: TuroTrip): number {
  try {
    return Math.max(1, differenceInDays(new Date(trip.tripEnd), new Date(trip.tripStart)));
  } catch {
    return 1;
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={`border ${accent ? "border-[#EAEB80]/60 bg-[#EAEB80]/10" : "border-border bg-card"}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${accent ? "bg-[#EAEB80]/20" : "bg-muted"}`}>
          <Icon className={`w-5 h-5 ${accent ? "text-[#EAEB80]" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</p>
          <p className={`text-lg font-bold leading-tight ${accent ? "text-[#EAEB80]" : "text-foreground"}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SidebarLink({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#EAEB80] transition-colors group py-1"
      >
        <span className="flex-1 truncate">{label}</span>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </a>
    );
  }
  return (
    <Link href={href}>
      <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#EAEB80] transition-colors py-1">
        <span>{label}</span>
      </a>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lower = status?.toLowerCase() ?? "";
  const cls = lower.includes("paid") || lower.includes("complete")
    ? "bg-green-900/40 text-green-300 border-green-700"
    : lower.includes("partial")
    ? "bg-yellow-900/40 text-yellow-300 border-yellow-700"
    : lower.includes("cancel") || lower.includes("unpaid") || lower.includes("overdue")
    ? "bg-red-900/40 text-red-300 border-red-700"
    : "bg-gray-800 text-gray-400 border-gray-600";
  return (
    <Badge className={`text-xs border ${cls} bg-transparent`} variant="outline">
      {status}
    </Badge>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  // ── Data Fetching ────────────────────────────────────────────────────────────

  const { data: profileData, isLoading: profileLoading } = useQuery<{
    success: boolean;
    data: ClientProfile;
  }>({
    queryKey: ["/api/client/profile"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/client/profile"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    retry: false,
  });

  const profile = profileData?.data;
  const cars = profile?.cars ?? [];

  // Resolve the active car
  const activeCar = useMemo<ClientCar | undefined>(() => {
    if (!cars.length) return undefined;
    if (selectedCarId) return cars.find((c) => c.id === selectedCarId) ?? cars[0];
    return cars[0];
  }, [cars, selectedCarId]);

  const clientId = profile?.id ?? null;
  const carId = activeCar?.id ?? null;

  // ── Payments ─────────────────────────────────────────────────────────────────

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{
    success: boolean;
    data: Payment[];
  }>({
    queryKey: ["/api/payments/client", clientId],
    queryFn: async () => {
      const res = await fetch(buildApiUrl(`/api/payments/client/${clientId}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: !!clientId,
    retry: false,
  });

  const payments = useMemo<Payment[]>(() => {
    const raw = (paymentsData as any)?.data ?? (paymentsData as any)?.payments ?? [];
    return Array.isArray(raw) ? [...raw].sort((a, b) => b.payments_year_month.localeCompare(a.payments_year_month)) : [];
  }, [paymentsData]);

  // ── Turo Trips ───────────────────────────────────────────────────────────────

  const { data: tripsData, isLoading: tripsLoading } = useQuery<{
    success: boolean;
    data: { trips: TuroTrip[] };
  }>({
    queryKey: ["/api/turo-trips"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/turo-trips"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    retry: false,
  });

  const allTrips = useMemo<TuroTrip[]>(() => {
    const raw = (tripsData as any)?.data?.trips ?? (tripsData as any)?.trips ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [tripsData]);

  // ── Income/Expense Totals ─────────────────────────────────────────────────────

  const { data: totalsData, isLoading: totalsLoading } = useQuery<{
    success: boolean;
    data: TotalsData;
  }>({
    queryKey: ["/api/cars", carId, "totals", selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams({ filter: "Year", from: selectedYear, to: selectedYear });
      const res = await fetch(buildApiUrl(`/api/cars/${carId}/totals?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch totals");
      return res.json();
    },
    enabled: !!carId,
    retry: false,
  });

  const totals: TotalsData = totalsData?.data ?? {};

  // ── Quick Links ───────────────────────────────────────────────────────────────

  const { data: quickLinksData } = useQuery<QuickLink[]>({
    queryKey: ["/api/quick-links"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/quick-links"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quick links");
      const d = await res.json();
      return d.quickLinks ?? [];
    },
    retry: false,
  });

  const quickLinks = (quickLinksData ?? []).filter((l) => l.visibleToClients);
  const groupedLinks = quickLinks.reduce<Record<string, QuickLink[]>>((acc, link) => {
    if (!acc[link.category]) acc[link.category] = [];
    acc[link.category].push(link);
    return acc;
  }, {});

  // ── Computed Chart Data ───────────────────────────────────────────────────────

  // Monthly trips table: group by month label
  const monthlyTrips = useMemo(() => {
    const yearNum = parseInt(selectedYear, 10);
    const map: Record<string, { month: string; days: number; trips: number; miles: number; earnings: number }> = {};

    allTrips
      .filter((t) => {
        if (t.status === "cancelled") return false;
        const d = new Date(t.tripStart);
        return d.getFullYear() === yearNum;
      })
      .forEach((t) => {
        const d = new Date(t.tripStart);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
        if (!map[key]) map[key] = { month: label, days: 0, trips: 0, miles: 0, earnings: 0 };
        map[key].days += tripDays(t);
        map[key].trips += 1;
        map[key].miles += parseFloat(t.totalDistance ?? "0") || 0;
        map[key].earnings += t.earnings || 0;
      });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [allTrips, selectedYear]);

  // Line chart: monthly income from trips
  const lineChartData = useMemo(() => {
    const yearNum = parseInt(selectedYear, 10);
    return MONTHS_SHORT.map((m, i) => {
      const monthNum = i + 1;
      const monthKey = `${yearNum}-${String(monthNum).padStart(2, "0")}`;
      const monthData = monthlyTrips.find((mt) =>
        mt.month.startsWith(`${MONTHS_SHORT[i]} ${yearNum}`)
      );
      // Payment payout for this month
      const monthPayments = payments.filter((p) => p.payments_year_month === monthKey);
      const payout = monthPayments.reduce((s, p) => s + (p.payments_amount_payout || 0), 0);
      const expenses = monthPayments.reduce((s, p) => s + (p.payments_amount || 0), 0);
      return {
        month: m,
        income: monthData?.earnings ?? 0,
        payout: payout,
        expenses: expenses,
      };
    });
  }, [monthlyTrips, payments, selectedYear]);

  // Donut data: full year totals
  const donutTotalData = useMemo(() => {
    const income = totals?.income?.totalProfit ?? 0;
    const expense = (totals?.carManagementSplit ?? 0) + (totals?.expenses?.totalOperatingExpenses ?? 0);
    return income + expense > 0
      ? [
          { name: "Income", value: Math.abs(income) },
          { name: "Expenses", value: Math.abs(expense) },
        ]
      : [];
  }, [totals]);

  // Donut data: current month from payments
  const donutMonthData = useMemo(() => {
    const key = `${selectedYear}-${String(currentMonth).padStart(2, "0")}`;
    const monthPmts = payments.filter((p) => p.payments_year_month === key);
    const payout = monthPmts.reduce((s, p) => s + (p.payments_amount_payout || 0), 0);
    const paid = monthPmts.reduce((s, p) => s + (p.payments_amount || 0), 0);
    return payout + paid > 0
      ? [
          { name: "Car Owner Profit", value: payout },
          { name: "Paid", value: paid },
        ]
      : [];
  }, [payments, selectedYear, currentMonth]);

  // Year options
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = 2020; y <= currentYear + 1; y++) years.push(y);
    return years;
  }, [currentYear]);

  // ── Loading State ─────────────────────────────────────────────────────────────

  const isLoading = profileLoading || totalsLoading || paymentsLoading || tripsLoading;

  if (profileLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
        </div>
      </AdminLayout>
    );
  }

  const ownerName = profile?.onboarding?.firstNameOwner
    ? `${profile.onboarding.firstNameOwner} ${profile.onboarding.lastNameOwner ?? ""}`.trim()
    : [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Client";

  const ownerEmail = profile?.onboarding?.emailOwner || profile?.email || "";
  const ownerPhone = profile?.onboarding?.phoneOwner || profile?.phone || "";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 pb-10">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#EAEB80]">Monthly Update</h1>
            <p className="text-muted-foreground text-sm">Golden Luxury Auto — Client Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            {cars.length > 1 && (
              <Select
                value={String(activeCar?.id ?? "")}
                onValueChange={(v) => setSelectedCarId(parseInt(v, 10))}
              >
                <SelectTrigger className="w-48 h-9 text-sm">
                  <SelectValue placeholder="Select car" />
                </SelectTrigger>
                <SelectContent>
                  {cars.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.makeModel || `Car #${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Main Grid: Sidebar + Content ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">

          {/* ── Left Sidebar ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Report Center */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="w-4 h-4 text-[#EAEB80]" />
                  Report Center
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-0.5">
                <SidebarLink href="/profile" label="My Profile" />
                <SidebarLink href="/tutorial" label="Training Manual" />
                {activeCar?.id && (
                  <>
                    <SidebarLink href={`/admin/cars/${activeCar.id}/payments`} label="Payment History" />
                    <SidebarLink href={`/admin/cars/${activeCar.id}/maintenance`} label="Maintenance" />
                    <SidebarLink href={`/admin/cars/${activeCar.id}/totals`} label="Totals Report" />
                    <SidebarLink href={`/admin/cars/${activeCar.id}/income-expense`} label="Income & Expenses" />
                    <SidebarLink href={`/admin/cars/${activeCar.id}/depreciation`} label="NADA Depreciation" />
                    <SidebarLink href={`/admin/cars/${activeCar.id}/purchase`} label="Purchase Details" />
                    <SidebarLink href={`/admin/cars/${activeCar.id}/graphs`} label="Graphs & Charts" />
                    <SidebarLink href={`/admin/cars/${activeCar.id}/calculator`} label="Payment Calculator" />
                    <SidebarLink href={`/admin/cars/${activeCar.id}/records`} label="Records" />
                  </>
                )}
                <SidebarLink href="/admin/turo-trips" label="Turo Trips" />
                {/* DB quick links for Report Center */}
                {(groupedLinks["Reports Center"] ?? []).map((l) => (
                  <SidebarLink key={l.id} href={l.url} label={l.title} external />
                ))}
              </CardContent>
            </Card>

            {/* Support Center */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <HelpCircle className="w-4 h-4 text-green-400" />
                  Support Center
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-0.5">
                <SidebarLink href="/tutorial" label="Training Manual" />
                <SidebarLink href="/admin/testimonials" label="Client Testimonials" />
                {(groupedLinks["Support Center"] ?? []).map((l) => (
                  <SidebarLink key={l.id} href={l.url} label={l.title} external />
                ))}
                {(groupedLinks["Forms Center"] ?? []).map((l) => (
                  <SidebarLink key={l.id} href={l.url} label={l.title} external />
                ))}
              </CardContent>
            </Card>

          </div>

          {/* ── Main Content ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* ── Car Profile Card ────────────────────────────────────────── */}
            <Card className="border-[#EAEB80]/30 bg-card overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Car photo placeholder */}
                <div className="md:w-48 bg-black/30 flex items-center justify-center min-h-[140px] flex-shrink-0">
                  {activeCar ? (
                    <div className="text-center p-4">
                      <Car className="w-16 h-16 text-[#EAEB80]/50 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-2">{activeCar.makeModel}</p>
                    </div>
                  ) : (
                    <Car className="w-16 h-16 text-muted-foreground/30" />
                  )}
                </div>

                {/* Car details */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {activeCar
                          ? `${activeCar.year ?? ""} ${activeCar.makeModel}`.trim()
                          : "No Vehicle"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {activeCar?.licensePlate && `Plate: ${activeCar.licensePlate}`}
                        {activeCar?.vin && ` · VIN: ${activeCar.vin}`}
                      </p>
                    </div>
                    {activeCar && (
                      <Badge className="bg-[#EAEB80]/20 text-[#EAEB80] border-[#EAEB80]/40 border" variant="outline">
                        {activeCar.status || "Active"}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2 text-sm mb-4">
                    {[
                      { label: "Color", value: activeCar?.exteriorColor },
                      { label: "Fuel Type", value: activeCar?.fuelType },
                      { label: "Tire Size", value: activeCar?.tireSize },
                      { label: "Oil Type", value: activeCar?.oilType },
                      { label: "Last Oil Change", value: activeCar?.lastOilChange },
                      { label: "Reg. Expiry", value: activeCar?.registrationExpiration },
                      { label: "Odometer", value: activeCar ? `${activeCar.mileage?.toLocaleString()} mi` : undefined },
                    ]
                      .filter((f) => f.value)
                      .map((f) => (
                        <div key={f.label}>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">{f.label}</p>
                          <p className="text-foreground font-medium">{f.value}</p>
                        </div>
                      ))}
                  </div>

                  {/* Owner info */}
                  <div className="border-t border-border pt-3 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="text-foreground font-medium">{ownerName}</span>
                    </div>
                    {ownerEmail && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{ownerEmail}</span>
                      </div>
                    )}
                    {ownerPhone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{ownerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── KPI Cards ───────────────────────────────────────────────── */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Income and Expenses — {selectedYear}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard
                  icon={TrendingUp}
                  label="Total Income"
                  value={fmt(totals?.income?.totalProfit ?? 0)}
                  accent
                />
                <KpiCard
                  icon={TrendingDown}
                  label="GLA Management"
                  value={fmt(totals?.carManagementSplit ?? 0)}
                />
                <KpiCard
                  icon={DollarSign}
                  label="Operating Expenses"
                  value={fmt(totals?.expenses?.totalOperatingExpenses ?? 0)}
                />
                <KpiCard
                  icon={CreditCard}
                  label="Total Payments"
                  value={fmt(totals?.payments?.total ?? 0)}
                  sub={`${totals?.history?.daysRented ?? 0} days rented`}
                />
              </div>
            </div>

            {/* ── Charts Row 1: Line + Trips Table ─────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

              {/* Monthly Income Line Chart */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#EAEB80]" />
                    Monthly Car Owner Profit & Expenses — {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {tripsLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-5 h-5 animate-spin text-[#EAEB80]" />
                    </div>
                  ) : lineChartData.some((d) => d.income > 0 || d.payout > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={lineChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                          labelStyle={{ color: "#ccc" }}
                          formatter={(val: number) => fmt(val)}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="income" name="Turo Earnings" stroke={CHART_GOLD} strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="payout" name="Car Owner Payout" stroke={CHART_GREEN} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No income data for {selectedYear}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dates Rented & Trips Table */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#EAEB80]" />
                    Dates Rented &amp; Trips Taken — {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 overflow-auto">
                  {tripsLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="w-5 h-5 animate-spin text-[#EAEB80]" />
                    </div>
                  ) : monthlyTrips.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-xs text-muted-foreground py-2">Month</TableHead>
                          <TableHead className="text-xs text-muted-foreground py-2 text-right">Days</TableHead>
                          <TableHead className="text-xs text-muted-foreground py-2 text-right">Trips</TableHead>
                          <TableHead className="text-xs text-muted-foreground py-2 text-right">Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyTrips.map((row) => (
                          <TableRow key={row.month} className="border-border hover:bg-muted/30">
                            <TableCell className="text-sm py-1.5 font-medium">{row.month}</TableCell>
                            <TableCell className="text-sm py-1.5 text-right">{row.days}</TableCell>
                            <TableCell className="text-sm py-1.5 text-right">{row.trips}</TableCell>
                            <TableCell className="text-sm py-1.5 text-right text-[#EAEB80]">{fmt(row.earnings)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mb-2 opacity-40" />
                      <p className="text-sm">No trips for {selectedYear}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Charts Row 2: Donuts + Bar Chart ─────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">

              {/* Donut: Full Year Totals */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Total Car Owner P&amp;L — {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {totalsLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-5 h-5 animate-spin text-[#EAEB80]" />
                    </div>
                  ) : donutTotalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={donutTotalData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {donutTotalData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                          formatter={(val: number) => fmt(val)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mb-2 opacity-40" />
                      <p className="text-sm">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Donut: Current Month */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {MONTHS_SHORT[currentMonth - 1]} {selectedYear} Car Owner P&amp;L
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {paymentsLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-5 h-5 animate-spin text-[#EAEB80]" />
                    </div>
                  ) : donutMonthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={donutMonthData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {donutMonthData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                          formatter={(val: number) => fmt(val)}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mb-2 opacity-40" />
                      <p className="text-sm">No data for this month</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bar: Monthly Days Rented & Trips */}
              <Card className="border-border bg-card sm:col-span-2 xl:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Monthly Days Rented &amp; Trips — {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {tripsLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-5 h-5 animate-spin text-[#EAEB80]" />
                    </div>
                  ) : monthlyTrips.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={monthlyTrips} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: "#888" }}
                          tickFormatter={(v) => v.split(" ")[0]}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                        <Tooltip
                          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                          labelStyle={{ color: "#ccc" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="days" name="Days Rented" fill={CHART_GOLD} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="trips" name="Trips" fill={CHART_GREEN} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mb-2 opacity-40" />
                      <p className="text-sm">No trip data for {selectedYear}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Payment History ──────────────────────────────────────────── */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#EAEB80]" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 overflow-auto">
                {paymentsLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="w-5 h-5 animate-spin text-[#EAEB80]" />
                  </div>
                ) : payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-xs text-muted-foreground">Period</TableHead>
                        <TableHead className="text-xs text-muted-foreground">Car</TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right">Amount</TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right">Payout</TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right">Balance</TableHead>
                        <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                        <TableHead className="text-xs text-muted-foreground">Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.slice(0, 20).map((p) => (
                        <TableRow key={p.payments_aid} className="border-border hover:bg-muted/30">
                          <TableCell className="text-sm py-2 font-medium">
                            {getMonthLabel(p.payments_year_month)}
                          </TableCell>
                          <TableCell className="text-sm py-2 text-muted-foreground">
                            {p.car_make_model || p.car_plate_number || "—"}
                          </TableCell>
                          <TableCell className="text-sm py-2 text-right">{fmt(p.payments_amount)}</TableCell>
                          <TableCell className="text-sm py-2 text-right text-[#EAEB80]">
                            {fmt(p.payments_amount_payout)}
                          </TableCell>
                          <TableCell className="text-sm py-2 text-right">
                            <span className={p.payments_amount_balance >= 0 ? "text-green-400" : "text-red-400"}>
                              {fmt(p.payments_amount_balance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm py-2">
                            <StatusBadge status={p.payment_status_name} />
                          </TableCell>
                          <TableCell className="text-sm py-2 text-muted-foreground text-xs">
                            {p.payments_reference_number || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                    <AlertCircle className="w-6 h-6 mb-2 opacity-40" />
                    <p className="text-sm">No payment records found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Maintenance Info ─────────────────────────────────────────── */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#EAEB80]" />
                  Maintenance Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {activeCar ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[
                      { icon: Fuel, label: "Fuel Type", value: activeCar.fuelType },
                      { icon: Wrench, label: "Oil Type", value: activeCar.oilType },
                      { icon: Calendar, label: "Last Oil Change", value: activeCar.lastOilChange },
                      { icon: Gauge, label: "Tire Size", value: activeCar.tireSize },
                      { icon: Shield, label: "Reg. Expiration", value: activeCar.registrationExpiration },
                      {
                        icon: Car,
                        label: "Odometer",
                        value: activeCar.mileage ? `${activeCar.mileage.toLocaleString()} mi` : null,
                      },
                    ]
                      .filter((f) => f.value)
                      .map((f) => (
                        <div key={f.label} className="flex items-start gap-2">
                          <div className="p-1.5 bg-muted rounded-md mt-0.5">
                            <f.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{f.label}</p>
                            <p className="text-sm font-medium text-foreground">{f.value}</p>
                          </div>
                        </div>
                      ))}
                    {activeCar.id && (
                      <div className="col-span-full pt-2 border-t border-border">
                        <Link href={`/admin/cars/${activeCar.id}/maintenance`}>
                          <a className="text-sm text-[#EAEB80] hover:underline flex items-center gap-1">
                            View full maintenance history
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                    <AlertCircle className="w-6 h-6 mb-2 opacity-40" />
                    <p className="text-sm">No vehicle data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>{/* end main content */}
        </div>{/* end grid */}
      </div>
    </AdminLayout>
  );
}
