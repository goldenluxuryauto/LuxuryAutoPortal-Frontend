import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientsPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Users className="w-16 h-16 text-[#EAEB80] mb-6" />
        <h1 className="text-2xl font-serif text-[#EAEB80] italic mb-2">
          Clients Management
        </h1>
        <p className="text-gray-500">Coming Soon</p>
      </div>
    </AdminLayout>
  );
}
