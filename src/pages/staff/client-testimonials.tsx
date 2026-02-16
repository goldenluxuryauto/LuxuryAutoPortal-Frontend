import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { buildApiUrl } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Plus, Loader2 } from "lucide-react";
import { useState } from "react";

interface TestimonialItem {
  testimonial_aid?: string;
  testimonial_client_name?: string;
  testimonial_content?: string;
  testimonial_date?: string;
}

function formatDate(d: string | undefined, fallback = "--") {
  if (!d) return fallback;
  try {
    const x = new Date(d);
    return isNaN(x.getTime()) ? fallback : x.toLocaleDateString();
  } catch {
    return fallback;
  }
}

export default function StaffClientTestimonials() {
  const [addOpen, setAddOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ success?: boolean; data?: TestimonialItem[] }>({
    queryKey: ["staff-testimonials"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/staff/testimonials"), { credentials: "include" });
      if (res.status === 404 || res.status === 501) return { success: true, data: [] };
      if (!res.ok) throw new Error("Failed to load testimonials");
      return res.json();
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { testimonial_client_name: string; testimonial_content: string }) => {
      const res = await fetch(buildApiUrl("/api/staff/testimonials"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-testimonials"] });
      setAddOpen(false);
      setClientName("");
      setContent("");
    },
  });

  const rows: TestimonialItem[] = data?.data ?? [];

  const handleAdd = () => {
    if (!clientName.trim() || !content.trim()) return;
    createMutation.mutate({ testimonial_client_name: clientName.trim(), testimonial_content: content.trim() });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Client Testimonials</h1>
            <p className="text-muted-foreground">View and add client feedback and testimonials.</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add
          </Button>
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
                      <TableHead>Client</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item, idx) => (
                      <TableRow key={item.testimonial_aid ?? idx}>
                        <TableCell>{idx + 1}.</TableCell>
                        <TableCell>{item.testimonial_client_name ?? "--"}</TableCell>
                        <TableCell className="max-w-md truncate">{item.testimonial_content ?? "--"}</TableCell>
                        <TableCell>{formatDate(item.testimonial_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add testimonial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client name</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Testimonial content"
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAdd}
                disabled={createMutation.isPending || !clientName.trim() || !content.trim()}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
