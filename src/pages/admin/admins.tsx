import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, buildApiUrl } from "@/lib/queryClient";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Mail,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  isAdmin: boolean;
  isEmployee: boolean;
}

interface QuickLink {
  id: number;
  category: string;
  title: string;
  url: string;
  visibleToAdmins: boolean;
  visibleToClients: boolean;
  visibleToEmployees: boolean;
  createdAt: string;
}

const userSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  roleId: z.number().int().positive("Role is required"),
});

const quickLinkSchema = z.object({
  category: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Valid URL is required"),
  visibleToAdmins: z.boolean().default(true),
  visibleToClients: z.boolean().default(true),
  visibleToEmployees: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;
type QuickLinkFormData = z.infer<typeof quickLinkSchema>;

export default function AdminsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isQuickLinkModalOpen, setIsQuickLinkModalOpen] = useState(false);
  const [editingQuickLink, setEditingQuickLink] = useState<QuickLink | null>(
    null
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
    retry: false,
  });

  const { data: quickLinks } = useQuery<QuickLink[]>({
    queryKey: ["/api/admin/quick-links"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/admin/quick-links"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch quick links");
      return response.json();
    },
    retry: false,
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      roleId: 0,
    },
  });

  const quickLinkForm = useForm<QuickLinkFormData>({
    resolver: zodResolver(quickLinkSchema),
    defaultValues: {
      category: "Reports Center",
      title: "",
      url: "",
      visibleToAdmins: true,
      visibleToClients: true,
      visibleToEmployees: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const { password, ...userData } = data;
      const payload = password ? { ...userData, password } : userData;
      const response = await apiRequest("POST", "/api/admin/users", payload);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UserFormData }) => {
      const { password, ...userData } = data;
      const payload: any = { ...userData };
      if (password && password.length > 0) {
        payload.password = password;
      }
      const response = await apiRequest(
        "PUT",
        `/api/admin/users/${id}`,
        payload
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsModalOpen(false);
      setEditingUser(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleAddClick = () => {
    setEditingUser(null);
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      roleId: 0,
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (user: AdminUser) => {
    setEditingUser(user);
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      roleId: user.roleId,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      if (!data.password || data.password.length === 0) {
        toast({
          title: "Error",
          description: "Password is required for new users",
          variant: "destructive",
        });
        return;
      }
      createMutation.mutate(data);
    }
  };


  const quickLinkCreateMutation = useMutation({
    mutationFn: async (data: QuickLinkFormData) => {
      const response = await apiRequest("POST", "/api/admin/quick-links", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create quick link");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links"] });
      toast({
        title: "Success",
        description: "Quick link created successfully",
      });
      setIsQuickLinkModalOpen(false);
      quickLinkForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create quick link",
        variant: "destructive",
      });
    },
  });

  const quickLinkUpdateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: QuickLinkFormData;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/admin/quick-links/${id}`,
        data
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update quick link");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links"] });
      toast({
        title: "Success",
        description: "Quick link updated successfully",
      });
      setIsQuickLinkModalOpen(false);
      setEditingQuickLink(null);
      quickLinkForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quick link",
        variant: "destructive",
      });
    },
  });

  const quickLinkDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/admin/quick-links/${id}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete quick link");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links"] });
      toast({
        title: "Success",
        description: "Quick link deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quick link",
        variant: "destructive",
      });
    },
  });

  const handleAddQuickLink = () => {
    setEditingQuickLink(null);
    quickLinkForm.reset({
      category: "Reports Center",
      title: "",
      url: "",
      visibleToAdmins: true,
      visibleToClients: true,
      visibleToEmployees: true,
    });
    setIsQuickLinkModalOpen(true);
  };

  const handleEditQuickLink = (link: QuickLink) => {
    setEditingQuickLink(link);
    quickLinkForm.reset({
      category: link.category,
      title: link.title,
      url: link.url,
      visibleToAdmins: link.visibleToAdmins,
      visibleToClients: link.visibleToClients,
      visibleToEmployees: link.visibleToEmployees,
    });
    setIsQuickLinkModalOpen(true);
  };

  const handleDeleteQuickLink = (id: number) => {
    quickLinkDeleteMutation.mutate(id);
  };

  const onQuickLinkSubmit = (data: QuickLinkFormData) => {
    if (editingQuickLink) {
      quickLinkUpdateMutation.mutate({ id: editingQuickLink.id, data });
    } else {
      quickLinkCreateMutation.mutate(data);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    if (role.toLowerCase().includes("admin")) {
      return "bg-[#EAEB80]/20 text-[#EAEB80] border-[#EAEB80]/30";
    }
    if (role.toLowerCase().includes("employee")) {
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">Admins</h1>
            <p className="text-gray-400 text-xs sm:text-sm">
              Manage portal administrators
            </p>
          </div>
          <Button
            onClick={handleAddClick}
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium w-full sm:w-auto"
            data-testid="button-add-admin"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add New Admin</span>
            <span className="sm:hidden">Add Admin</span>
          </Button>
        </div>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="p-0">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider px-3 sm:px-6 py-3 sm:py-4">
                      Name
                    </th>
                    <th className="text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                      Email
                    </th>
                    <th className="text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider px-3 sm:px-6 py-3 sm:py-4">
                      Role
                    </th>
                    <th className="text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider px-3 sm:px-6 py-3 sm:py-4">
                      Status
                    </th>
                    <th className="text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                      Created
                    </th>
                    <th className="text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider px-3 sm:px-6 py-3 sm:py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        Loading administrators...
                      </td>
                    </tr>
                  ) : users && users.length > 0 ? (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-[#252525] transition-colors"
                        data-testid={`row-admin-${user.id}`}
                      >
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 bg-[#EAEB80]/20">
                              <AvatarFallback className="bg-[#EAEB80]/20 text-[#EAEB80] text-xs sm:text-sm font-medium">
                                {getInitials(user.firstName, user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-white font-medium text-xs sm:text-sm">
                              {user.firstName} {user.lastName}
                            </span>
                              <span className="text-gray-400 text-[10px] sm:text-xs md:hidden">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span className="text-xs sm:text-sm">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <Badge
                            variant="outline"
                            className={cn(getRoleBadgeColor(user.role), "text-[10px] sm:text-xs")}
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              user.isActive
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30",
                              "text-[10px] sm:text-xs"
                            )}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-400 text-xs sm:text-sm hidden lg:table-cell">
                          {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white text-xs sm:text-sm px-2 sm:px-3"
                            onClick={() => handleEditClick(user)}
                            data-testid={`button-edit-admin-${user.id}`}
                          >
                            <Pencil className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        No administrators found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit User Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {editingUser ? "Edit Admin" : "Add New Admin"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingUser
                  ? "Update admin user information"
                  : "Create a new administrator account"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 mt-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">
                          First Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="John"
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
                        <FormLabel className="text-gray-400">
                          Last Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="Doe"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder="john.doe@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">
                        Password{" "}
                        {editingUser && "(leave blank to keep current)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder="••••••••"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Role</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value, 10))
                        }
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                          {roles?.map((role) => (
                            <SelectItem
                              key={role.id}
                              value={role.id.toString()}
                            >
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingUser(null);
                      form.reset();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingUser ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Quick Links Management Section */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Quick Links Management
              </h2>
              <p className="text-gray-400 text-sm">
                Manage quick links for Reports, Support, and Forms centers
              </p>
            </div>
            <Button
              onClick={handleAddQuickLink}
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Quick Link
            </Button>
          </div>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                        Category
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                        Title
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                        URL
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                        Visibility
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {quickLinks && quickLinks.length > 0 ? (
                      quickLinks.map((link) => (
                        <tr
                          key={link.id}
                          className="hover:bg-[#252525] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className="bg-blue-500/20 text-blue-400 border-blue-500/30"
                            >
                              {link.category}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-white font-medium">
                            {link.title}
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-[#EAEB80] flex items-center gap-1 text-sm"
                            >
                              {link.url.length > 40
                                ? `${link.url.substring(0, 40)}...`
                                : link.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {link.visibleToAdmins && (
                                <Badge
                                  variant="outline"
                                  className="bg-[#EAEB80]/20 text-[#EAEB80] border-[#EAEB80]/30 text-xs"
                                >
                                  Admin
                                </Badge>
                              )}
                              {link.visibleToClients && (
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                                >
                                  Client
                                </Badge>
                              )}
                              {link.visibleToEmployees && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                                >
                                  Employee
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white"
                                onClick={() => handleEditQuickLink(link)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <ConfirmDialog
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                }
                                title="Delete Quick Link"
                                description="Are you sure you want to delete this quick link?"
                                confirmText="Delete"
                                cancelText="Cancel"
                                variant="destructive"
                                onConfirm={() => handleDeleteQuickLink(link.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-gray-400"
                        >
                          No quick links found. Add one to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Link Modal */}
        <Dialog
          open={isQuickLinkModalOpen}
          onOpenChange={setIsQuickLinkModalOpen}
        >
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {editingQuickLink ? "Edit Quick Link" : "Add Quick Link"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingQuickLink
                  ? "Update quick link information"
                  : "Create a new quick link for users"}
              </DialogDescription>
            </DialogHeader>

            <Form {...quickLinkForm}>
              <form
                onSubmit={quickLinkForm.handleSubmit(onQuickLinkSubmit)}
                className="space-y-4 mt-4"
              >
                <FormField
                  control={quickLinkForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                          <SelectItem value="Reports Center">
                            Reports Center
                          </SelectItem>
                          <SelectItem value="Support Center">
                            Support Center
                          </SelectItem>
                          <SelectItem value="Forms Center">
                            Forms Center
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={quickLinkForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder="Link title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={quickLinkForm.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="url"
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder="https://example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel className="text-gray-400">Visibility</FormLabel>
                  <FormField
                    control={quickLinkForm.control}
                    name="visibleToAdmins"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-[#2a2a2a] data-[state=checked]:bg-[#EAEB80] data-[state=checked]:border-[#EAEB80]"
                          />
                        </FormControl>
                        <FormLabel className="text-gray-400 font-normal cursor-pointer">
                          Visible to Admins
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={quickLinkForm.control}
                    name="visibleToClients"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-[#2a2a2a] data-[state=checked]:bg-[#EAEB80] data-[state=checked]:border-[#EAEB80]"
                          />
                        </FormControl>
                        <FormLabel className="text-gray-400 font-normal cursor-pointer">
                          Visible to Clients
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={quickLinkForm.control}
                    name="visibleToEmployees"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-[#2a2a2a] data-[state=checked]:bg-[#EAEB80] data-[state=checked]:border-[#EAEB80]"
                          />
                        </FormControl>
                        <FormLabel className="text-gray-400 font-normal cursor-pointer">
                          Visible to Employees
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsQuickLinkModalOpen(false);
                      setEditingQuickLink(null);
                      quickLinkForm.reset();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={
                      quickLinkCreateMutation.isPending ||
                      quickLinkUpdateMutation.isPending
                    }
                  >
                    {(quickLinkCreateMutation.isPending ||
                      quickLinkUpdateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingQuickLink ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
