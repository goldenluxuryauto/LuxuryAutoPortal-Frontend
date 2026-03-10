import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildApiUrl } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Loader2 } from "lucide-react";

interface ClientTestimonialItem {
  client_testimonial_aid: number;
  client_testimonial_title: string;
  client_testimonial_description: string;
  client_testimonial_datetime: string;
}

function formatDate(d: string | undefined, fallback = "--") {
  if (!d) return fallback;
  try {
    const x = new Date(d);
    return isNaN(x.getTime()) ? fallback : x.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return fallback;
  }
}

export default function StaffClientTestimonials() {
  const { data, isLoading } = useQuery<{ success?: boolean; list?: ClientTestimonialItem[] }>({
    queryKey: ["client-testimonials-active"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/client-testimonials/active?limit=100"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load testimonials");
      return res.json();
    },
  });

  const rows: ClientTestimonialItem[] = data?.list ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Client Testimonials</h1>
          <p className="text-muted-foreground">View client testimonials managed by admin.</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <MessageCircle className="w-5 h-5" />
              Testimonials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-auto max-h-[55vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No testimonials yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-28">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item, idx) => (
                      <TableRow key={item.client_testimonial_aid}>
                        <TableCell>{idx + 1}.</TableCell>
                        <TableCell className="font-medium">{item.client_testimonial_title}</TableCell>
                        <TableCell className="max-w-md">{item.client_testimonial_description || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(item.client_testimonial_datetime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
