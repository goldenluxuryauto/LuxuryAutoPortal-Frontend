import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useLocation } from "wouter";

export default function HumanResourcesPage() {
  const [, setLocation] = useLocation();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#EAEB80] italic mb-1 sm:mb-2">
            Human Resources
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            Manage employee onboarding and employee records
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-[#111111] border-[#2a2a2a]">
            <CardContent className="p-5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-white font-semibold">Employees</h2>
                <p className="text-gray-400 text-sm">
                  Add employees, approve pending onboarding submissions, import/export.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Users className="w-6 h-6 text-[#EAEB80]" />
                <Button
                  onClick={() => setLocation("/admin/hr/employees")}
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                >
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

