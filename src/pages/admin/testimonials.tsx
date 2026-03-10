import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeletons";

interface ClientTestimonialRow {
  client_testimonial_aid: number;
  client_testimonial_is_active: number;
  client_testimonial_file: string;
  client_testimonial_title: string;
  client_testimonial_description: string;
  client_testimonial_created: string;
  client_testimonial_datetime: string;
}

function formatDate(s: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return s;
  }
}

export default function AdminTestimonialsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<ClientTestimonialRow | null>(null);
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const { data, isLoading } = useQuery<{
    success: boolean;
    list: ClientTestimonialRow[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["/api/client-testimonials", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(buildApiUrl(`/api/client-testimonials?${params}`), { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load testimonials");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: { client_testimonial_title: string; client_testimonial_description: string }) => {
      const res = await fetch(buildApiUrl("/api/client-testimonials"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-testimonials"] });
      toast({ title: "Testimonial created" });
      setAddOpen(false);
      setFormTitle("");
      setFormDescription("");
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: { client_testimonial_title: string; client_testimonial_description: string } }) => {
      const res = await fetch(buildApiUrl(`/api/client-testimonials/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-testimonials"] });
      toast({ title: "Testimonial updated" });
      setEditItem(null);
      setFormTitle("");
      setFormDescription("");
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const setActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: number }) => {
      const res = await fetch(buildApiUrl(`/api/client-testimonials/${id}/active`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-testimonials"] });
      toast({ title: isActive === 1 ? "Restored" : "Archived" });
      setArchiveId(null);
      setRestoreId(null);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildApiUrl(`/api/client-testimonials/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-testimonials"] });
      toast({ title: "Testimonial deleted" });
      setDeleteId(null);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const list = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.limit ? Math.ceil(total / data.limit) : 1;

  const openEdit = (row: ClientTestimonialRow) => {
    setEditItem(row);
    setFormTitle(row.client_testimonial_title);
    setFormDescription(row.client_testimonial_description || "");
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Client Testimonials</h1>
            <p className="text-muted-foreground text-sm">Manage client testimonials. Archive or restore to control visibility on staff/client views.</p>
          </div>
          <Button
            onClick={() => {
              setFormTitle("");
              setFormDescription("");
              setAddOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell max-w-[200px]">Description</TableHead>
                    <TableHead className="w-28">Updated</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><TableRowSkeleton /></TableCell>
                      </TableRow>
                    ))
                  ) : list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No testimonials found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((row, idx) => (
                      <TableRow key={row.client_testimonial_aid}>
                        <TableCell className="text-muted-foreground">{(page - 1) * 20 + idx + 1}</TableCell>
                        <TableCell>
                          <Badge variant={row.client_testimonial_is_active === 1 ? "default" : "secondary"}>
                            {row.client_testimonial_is_active === 1 ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{row.client_testimonial_title}</TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">
                          {row.client_testimonial_description || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(row.client_testimonial_datetime)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {row.client_testimonial_is_active === 1 ? (
                              <Button variant="ghost" size="icon" onClick={() => setArchiveId(row.client_testimonial_aid)} title="Archive">
                                <Archive className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => setRestoreId(row.client_testimonial_aid)} title="Restore">
                                <ArchiveRestore className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.client_testimonial_aid)} title="Delete" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Page {data?.page ?? 1} of {totalPages} ({total} total)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client Testimonial</DialogTitle>
            <DialogDescription>Title and description. Video attachment can be added in a future update.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description" className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!formTitle.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ client_testimonial_title: formTitle.trim(), client_testimonial_description: formDescription.trim() })}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client Testimonial</DialogTitle>
          </DialogHeader>
          {editItem && (
            <>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Title" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description" className="min-h-[80px]" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button
                  disabled={!formTitle.trim() || updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: editItem.client_testimonial_aid, body: { client_testimonial_title: formTitle.trim(), client_testimonial_description: formDescription.trim() } })}
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive confirm */}
      <AlertDialog open={archiveId !== null} onOpenChange={(open) => !open && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive testimonial?</AlertDialogTitle>
            <AlertDialogDescription>It will be hidden from staff and client views. You can restore it later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveId != null && setActiveMutation.mutate({ id: archiveId, isActive: 0 })}
              disabled={setActiveMutation.isPending}
            >
              {setActiveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirm */}
      <AlertDialog open={restoreId !== null} onOpenChange={(open) => !open && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore testimonial?</AlertDialogTitle>
            <AlertDialogDescription>It will be visible again on staff and client views.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreId != null && setActiveMutation.mutate({ id: restoreId, isActive: 1 })}
              disabled={setActiveMutation.isPending}
            >
              {setActiveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId != null && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
