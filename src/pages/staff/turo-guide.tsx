import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ExternalLink } from "lucide-react";

export default function StaffTuroGuide() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Turo Guide</h1>
          <p className="text-muted-foreground">Turo hosting and operations guide for staff.</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <BookOpen className="w-5 h-5" />
              Turo hosting & operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Use this guide for Turo listing management, trip handoffs, vehicle prep, and guest communication. Content is maintained by management and may be updated with new procedures.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Vehicle listing and availability</li>
              <li>Trip start and end procedures</li>
              <li>Cleaning and inspection checklists</li>
              <li>Guest pickup and return</li>
              <li>Documentation and photos</li>
            </ul>
            <div className="pt-2">
              <Button variant="outline" asChild>
                <a
                  href="https://turo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Turo
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
