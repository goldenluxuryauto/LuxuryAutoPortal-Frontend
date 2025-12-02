import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Pencil, Mail } from "lucide-react";

interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  isOwner: boolean;
  isActive: boolean;
}

export default function AdminsPage() {
  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeColor = (roleName: string, isOwner: boolean) => {
    if (isOwner) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (roleName === "Admin") return "bg-[#EAEB80]/20 text-[#EAEB80] border-[#EAEB80]/30";
    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Admins</h1>
            <p className="text-gray-400 text-sm">Manage portal administrators</p>
          </div>
          <Button className="bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a]" data-testid="button-add-admin">
            <Plus className="w-4 h-4 mr-2" />
            Add Admin
          </Button>
        </div>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Name
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Email
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Role
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        Loading administrators...
                      </td>
                    </tr>
                  ) : users && users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-[#252525] transition-colors" data-testid={`row-admin-${user.id}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 bg-[#EAEB80]/20">
                              <AvatarFallback className="bg-[#EAEB80]/20 text-[#EAEB80] text-sm font-medium">
                                {getInitials(user.firstName, user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white font-medium">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant="outline" 
                            className={getRoleBadgeColor(user.roleName, user.isOwner)}
                          >
                            {user.isOwner ? "Owner" : user.roleName}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white"
                            data-testid={`button-edit-admin-${user.id}`}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        No administrators found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Admin Notifications</h3>
            <p className="text-sm text-gray-400">
              All admins listed above will receive email notifications when new LYC submissions are received. 
              To add or remove admins from notifications, contact your system administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
