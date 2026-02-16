import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OperationsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Operations</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor GLA operations.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>
              Operations dashboard and tools. Content can be added here as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate to other sections of the portal.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
