import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Loader2, Eye, ChevronLeft, ChevronRight, X, Plus, Trash2 } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { TablePagination, ItemsPerPage } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  status?: number; // 0 = inactive, 1 = active, 3 = blocked
  createdAt: string;
  carCount: number;
}

const clientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  bankName: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  
  // Load items per page from localStorage, default to 10
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(() => {
    const saved = localStorage.getItem("clients_limit");
    return (saved ? parseInt(saved) : 10) as ItemsPerPage;
  });

  // Save to localStorage when itemsPerPage changes
  useEffect(() => {
    localStorage.setItem("clients_limit", itemsPerPage.toString());
  }, [itemsPerPage]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
  const [revokeClientEmail, setRevokeClientEmail] = useState<string | null>(null);
  const [reactivateClientEmail, setReactivateClientEmail] = useState<string | null>(null);
  const [blockClientEmail, setBlockClientEmail] = useState<string | null>(null);
  const [deleteClientEmail, setDeleteClientEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: Client[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/clients", searchQuery, statusFilter, page, itemsPerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", page.toString());
      params.append("limit", itemsPerPage.toString());

      const url = buildApiUrl(`/api/clients?${params.toString()}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Database connection failed" }));
        throw new Error(errorData.error || "Failed to fetch clients");
      }
      return response.json();
    },
    retry: false,
  });

  const clients = data?.data || [];
  const pagination = data?.pagination;

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      bankName: "",
      bankRoutingNumber: "",
      bankAccountNumber: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await fetch(buildApiUrl("/api/clients"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create client");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      setIsAddModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(buildApiUrl(`/api/clients/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete client");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      setDeleteClientId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const handleViewClient = (clientId: number) => {
    setLocation(`/admin/clients/${clientId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, clientId: number, clientName: string) => {
    e.stopPropagation();
    setDeleteClientId(clientId);
  };

  const handleConfirmDelete = () => {
    if (deleteClientId) {
      deleteMutation.mutate(deleteClientId);
    }
  };

  // Helper function to get user ID from email
  const getUserIdByEmail = async (email: string): Promise<number | null> => {
    try {
      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(buildApiUrl(`/api/users/by-email/${encodedEmail}`), {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "User not found" }));
        console.error("Error fetching user ID:", errorData.error);
        return null;
      }
      const data = await response.json();
      if (data.success && data.data) {
        return data.data.id;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user ID:", error);
      return null;
    }
  };

  // Revoke access mutation (suspend - temporary)
  const revokeAccessMutation = useMutation({
    mutationFn: async (email: string) => {
      const userId = await getUserIdByEmail(email);
      if (!userId) {
        // If user doesn't exist in user table, update client table directly
        const response = await fetch(buildApiUrl(`/api/clients/revoke-access`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to revoke client access");
        }
        return response.json();
      }
      const response = await fetch(buildApiUrl(`/api/users/${userId}/revoke`), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to revoke user access");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client access revoked successfully. The user can no longer log in.",
      });
      setRevokeClientEmail(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke client access",
        variant: "destructive",
      });
    },
  });

  // Block user mutation (permanent block - sets status to 3)
  const blockUserMutation = useMutation({
    mutationFn: async (email: string) => {
      const userId = await getUserIdByEmail(email);
      if (!userId) {
        // If user doesn't exist in user table, update client table directly
        const response = await fetch(buildApiUrl(`/api/clients/block`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to block client account");
        }
        return response.json();
      }
      const response = await fetch(buildApiUrl(`/api/users/${userId}/block`), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to block user account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client account permanently blocked successfully. The user cannot register or access their account.",
      });
      setBlockClientEmail(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to block client account",
        variant: "destructive",
      });
    },
  });

  // Reactivate access mutation
  const reactivateAccessMutation = useMutation({
    mutationFn: async (email: string) => {
      const userId = await getUserIdByEmail(email);
      if (!userId) {
        // If user doesn't exist in user table, update client table directly
        const response = await fetch(buildApiUrl(`/api/clients/reactivate-access`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to reactivate client access");
        }
        return response.json();
      }
      const response = await fetch(buildApiUrl(`/api/users/${userId}/reactivate`), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reactivate user access");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client access reactivated successfully. The user can now log in again.",
      });
      setReactivateClientEmail(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate client access",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation (permanent) - deletes both client and user
  const deleteUserMutation = useMutation({
    mutationFn: async ({ clientId, email }: { clientId: number; email: string }) => {
      // First delete the client
      const clientResponse = await fetch(buildApiUrl(`/api/clients/${clientId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!clientResponse.ok) {
        const error = await clientResponse.json();
        throw new Error(error.error || "Failed to delete client");
      }

      // Then delete the user account
      const userId = await getUserIdByEmail(email);
      if (userId) {
        const userResponse = await fetch(buildApiUrl(`/api/users/${userId}`), {
          method: "DELETE",
          credentials: "include",
        });
        if (!userResponse.ok) {
          const error = await userResponse.json();
          throw new Error(error.error || "Failed to delete user account");
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client and user account permanently deleted. All related data has been removed.",
      });
      setDeleteClientEmail(null);
      setDeleteClientId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const handleRevokeAccess = (clientEmail: string) => {
    setRevokeClientEmail(clientEmail);
  };

  const handleConfirmRevoke = () => {
    if (revokeClientEmail) {
      revokeAccessMutation.mutate(revokeClientEmail);
    }
  };

  const handleDeleteUser = (clientId: number, clientEmail: string) => {
    setDeleteClientId(clientId);
    setDeleteClientEmail(clientEmail);
  };

  const handleConfirmDeleteUser = () => {
    if (deleteClientId && deleteClientEmail) {
      deleteUserMutation.mutate({ clientId: deleteClientId, email: deleteClientEmail });
    }
  };

  const handleReactivateAccess = (clientEmail: string) => {
    setReactivateClientEmail(clientEmail);
  };

  const handleConfirmReactivate = () => {
    if (reactivateClientEmail) {
      reactivateAccessMutation.mutate(reactivateClientEmail);
    }
  };

  const handleBlockUser = (email: string) => {
    setBlockClientEmail(email);
  };

  const handleConfirmBlock = () => {
    if (blockClientEmail) {
      blockUserMutation.mutate(blockClientEmail);
    }
  };

  const onSubmit = (data: ClientFormData) => {
    createMutation.mutate(data);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-2">Clients</h1>
            <p className="text-gray-400 text-sm">Manage your client database</p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Search and Filter */}
        <Card className="bg-[#111111] border-[#2a2a2a]">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1); // Reset to first page when filter changes
              }}>
                <SelectTrigger className="w-full md:w-[200px] bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                    <TableHead className="text-center text-[#EAEB80] font-medium px-6 py-4 w-16">No</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-6 py-4 min-w-[200px]">Full Name</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-6 py-4 min-w-[180px]">Email</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-6 py-4 min-w-[140px]">Phone</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-6 py-4 w-32">Role</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-6 py-4 w-28">Status</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium px-6 py-4 min-w-[140px]">Joined Date</TableHead>
                    <TableHead className="text-center text-[#EAEB80] font-medium px-6 py-4 w-32">Counts of Cars</TableHead>
                    <TableHead className="text-center text-[#EAEB80] font-medium px-6 py-4 w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#EAEB80]" />
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-red-400">
                        Database connection failed. Please try again.
                      </TableCell>
                    </TableRow>
                  ) : clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                        No clients found. Try adjusting your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client, index) => {
                      const rowNumber = (pagination ? (pagination.page - 1) * pagination.limit : 0) + index + 1;
                      return (
                        <TableRow
                          key={client.id}
                          className="border-[#2a2a2a] group"
                        >
                          <TableCell className="text-center text-[#EAEB80] font-medium px-6 py-4 align-middle">
                            {rowNumber}
                          </TableCell>
                          <TableCell className="text-left text-white font-medium px-6 py-4 align-middle">
                            {client.firstName} {client.lastName}
                          </TableCell>
                          <TableCell className="text-left text-gray-300 px-6 py-4 align-middle">
                            {client.email}
                          </TableCell>
                          <TableCell className="text-left text-gray-400 px-6 py-4 align-middle">
                            {client.phone || <span className="text-gray-600">N/A</span>}
                          </TableCell>
                          <TableCell className="text-left px-6 py-4 align-middle">
                            <Badge
                              variant="outline"
                              className="bg-[#EAEB80]/10 text-[#EAEB80] border-[#EAEB80]/30"
                            >
                              {client.roleName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left px-6 py-4 align-middle">
                            <Badge
                              variant="outline"
                              className={cn(
                                client.status === 3
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : client.isActive
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              )}
                            >
                              {client.status === 3 ? "Blocked" : client.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left text-gray-400 px-6 py-4 align-middle">
                            {formatDate(client.createdAt)}
                          </TableCell>
                          <TableCell className="text-center text-gray-400 px-6 py-4 align-middle">
                            {client.carCount}
                          </TableCell>
                          <TableCell className="text-center px-6 py-4 align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#EAEB80] hover:text-[#EAEB80] hover:bg-[#EAEB80]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewClient(client.id);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {!client.isActive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-400 hover:text-green-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReactivateAccess(client.email);
                                  }}
                                  disabled={reactivateAccessMutation.isPending}
                                  title="Grant/Reactivate Access"
                                >
                                  {reactivateAccessMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Grant Access"
                                  )}
                                </Button>
                              )}
                              {client.status !== 3 && client.isActive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-yellow-400 hover:text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevokeAccess(client.email);
                                  }}
                                  title="Suspend Access (Temporary)"
                                >
                                  Suspend
                                </Button>
                              )}
                              {client.status !== 3 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 border border-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBlockUser(client.email);
                                  }}
                                  title="Permanently Block Account"
                                >
                                  Block
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 border border-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(client.id, client.email);
                                }}
                                title="Permanently Delete User"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && (
              <TablePagination
                totalItems={pagination.total}
                itemsPerPage={itemsPerPage}
                currentPage={page}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onItemsPerPageChange={(newLimit) => {
                  setItemsPerPage(newLimit);
                  setPage(1); // Reset to first page when changing limit
                }}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        {/* Add Client Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#EAEB80]">Add New Client</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new client in the system
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">First Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Last Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Email *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t border-[#2a2a2a] pt-4">
                  <h3 className="text-sm font-medium text-[#EAEB80] mb-4">Banking Information (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Bank Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankRoutingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Routing Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Account Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      form.reset();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Client Only Confirmation Modal */}
        <Dialog open={deleteClientId !== null && deleteClientEmail === null} onOpenChange={(open) => !open && setDeleteClientId(null)}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-red-400">Delete Client</DialogTitle>
              <DialogDescription className="text-gray-400">
                {deleteClientId && clients.find(c => c.id === deleteClientId) && (
                  <>Are you sure you want to delete <strong>{clients.find(c => c.id === deleteClientId)?.firstName} {clients.find(c => c.id === deleteClientId)?.lastName}</strong>? This action cannot be undone.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setDeleteClientId(null)}
                className="text-gray-400 hover:text-white"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-500 text-white hover:bg-red-600"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Revoke Access Confirmation Dialog */}
        <Dialog open={revokeClientEmail !== null} onOpenChange={(open) => !open && setRevokeClientEmail(null)}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-yellow-400">Suspend Client Access</DialogTitle>
              <DialogDescription className="text-gray-400">
                {revokeClientEmail && clients.find(c => c.email === revokeClientEmail) && (
                  <>
                    Are you sure you want to suspend access for <strong className="text-white">{clients.find(c => c.email === revokeClientEmail)?.firstName} {clients.find(c => c.email === revokeClientEmail)?.lastName}</strong>?
                    <br /><br />
                    This will temporarily revoke their login access. The client's data will be preserved and can be reactivated later.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setRevokeClientEmail(null)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={revokeAccessMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRevoke}
                className="bg-yellow-600 text-white hover:bg-yellow-700"
                disabled={revokeAccessMutation.isPending}
              >
                {revokeAccessMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Suspend Access
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Block Account Confirmation Dialog */}
        <Dialog open={blockClientEmail !== null} onOpenChange={(open) => !open && setBlockClientEmail(null)}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-red-400">Permanently Block Account</DialogTitle>
              <DialogDescription className="text-gray-400">
                This will permanently block the client account. The user will not be able to register or access their account.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-gray-300 mb-4">
                Are you sure you want to permanently block <strong>{blockClientEmail}</strong>?
              </p>
              <p className="text-yellow-400 text-sm mb-4">
                ⚠️ This action cannot be undone. The account will be permanently blocked.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setBlockClientEmail(null)}
                className="border-[#2a2a2a] text-gray-400 hover:text-white"
                disabled={blockUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBlock}
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={blockUserMutation.isPending}
              >
                {blockUserMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Permanently Block
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Grant/Reactivate Access Confirmation Dialog */}
        <Dialog open={reactivateClientEmail !== null} onOpenChange={(open) => !open && setReactivateClientEmail(null)}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-green-400">Grant Client Access</DialogTitle>
              <DialogDescription className="text-gray-400">
                {reactivateClientEmail && clients.find(c => c.email === reactivateClientEmail) && (
                  <>
                    Are you sure you want to grant access for <strong className="text-white">{clients.find(c => c.email === reactivateClientEmail)?.firstName} {clients.find(c => c.email === reactivateClientEmail)?.lastName}</strong>?
                    <br /><br />
                    This will restore their login access. The client will be able to log in and access their account again.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setReactivateClientEmail(null)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={reactivateAccessMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReactivate}
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={reactivateAccessMutation.isPending}
              >
                {reactivateAccessMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Grant Access
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={deleteClientEmail !== null && deleteClientId !== null} onOpenChange={(open) => !open && (setDeleteClientEmail(null), setDeleteClientId(null))}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-red-400">Permanently Delete Client</DialogTitle>
              <DialogDescription className="text-gray-400">
                {deleteClientId && deleteClientEmail && clients.find(c => c.id === deleteClientId) && (
                  <>
                    Are you sure you want to permanently delete <strong className="text-white">{clients.find(c => c.id === deleteClientId)?.firstName} {clients.find(c => c.id === deleteClientId)?.lastName}</strong>?
                    <br /><br />
                    <span className="text-red-400 font-semibold">Warning:</span> This action cannot be undone. All client data, user account, cars, contracts, and related information will be permanently deleted.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteClientEmail(null);
                  setDeleteClientId(null);
                }}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={deleteUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteUser}
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Delete Permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
