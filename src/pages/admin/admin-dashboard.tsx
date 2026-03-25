import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { SectionHeader } from "@/components/admin/dashboard";
import IncomeExpensesSection from "@/components/admin/dashboard/IncomeExpensesSection";
import AirportParkingSection from "@/components/admin/dashboard/AirportParkingSection";
import CommissionsSection from "@/components/admin/dashboard/CommissionsSection";
import OperationsSection from "@/components/admin/dashboard/OperationsSection";
import TuroInspectionsSection from "@/components/admin/dashboard/TuroInspectionsSection";

const SECTIONS = [
  "CAR ISSUES / INSPECTIONS",
  "MAINTENANCE",
  "TASK MANAGEMENT",
  "NOTICE BOARD",
] as const;

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <SectionHeader title={title} />
      <div className="mt-2 rounded-md border border-gray-200 bg-white px-6 py-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Coming Soon
        </p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    document.title = "Admin Dashboard | GLA";
  }, []);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background">
        {/* Brand Header */}
        <div className="mb-8 bg-black px-6 py-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
            {/* Left — Logo */}
            <div className="flex flex-col items-center gap-1">
              <img
                src="/logo.png"
                alt="Golden Luxury Auto"
                className="h-20 object-contain"
              />
            </div>

            {/* Center — Hero Fleet Image */}
            <div className="hidden flex-1 justify-center md:flex">
              <div className="overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Golden Luxury Auto Fleet"
                  className="h-28 w-72 object-cover"
                />
              </div>
            </div>

            {/* Right — Monthly Update Badge */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-center font-serif text-sm italic text-[#FFD700]">
                Golden Luxury Auto
              </p>
              <p className="text-center text-lg font-bold uppercase tracking-wide text-[#FFD700]">
                Monthly Update!!!
              </p>
            </div>
          </div>

          {/* Subtitle */}
          <p className="mt-4 text-center text-sm uppercase tracking-widest text-white/70">
            Admin Dashboard
          </p>
        </div>

        {/* Section 1: Income and Expenses — Phase 2 */}
        <IncomeExpensesSection year={year} onYearChange={setYear} />

        {/* Section 2: Airport Parking & Trips — Phase 3 */}
        <AirportParkingSection year={year} />

        {/* Section 3: Commissions — Phase 4 */}
        <CommissionsSection />

        {/* Section 4: Operations — Phase 5 */}
        <OperationsSection />

        {/* Section 5: Turo Messages Inspections — Phase 6 */}
        <TuroInspectionsSection />

        {/* Remaining sections — placeholders */}
        {SECTIONS.map((section) => (
          <PlaceholderSection key={section} title={section} />
        ))}
      </div>
    </AdminLayout>
  );
}
