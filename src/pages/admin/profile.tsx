import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, buildApiUrl } from "@/lib/queryClient";
import { Edit, User, Car, CreditCard, MapPin, Phone, Mail, Calendar, Shield } from "lucide-react";
import { Loader2 } from "lucide-react";
import QuickLinks from "@/components/admin/QuickLinks";

interface ProfileData {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  onboarding: {
    id: number;
    firstNameOwner: string;
    lastNameOwner: string;
    phoneOwner: string;
    emailOwner: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    birthday: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleTrim: string;
    vinNumber: string;
    licensePlate: string;
    insuranceProvider: string;
    insurancePhone: string;
    policyNumber: string;
    insuranceExpiration: string;
    bankName: string;
    routingNumber: string;
    accountNumber: string;
    taxClassification: string;
    status: string;
    contractStatus: string;
    contractSignedAt: string;
    createdAt: string;
  } | null;
}

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phoneOwner: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  birthday: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/user/profile"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    retry: false,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneOwner: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      birthday: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profileData) {
      form.reset({
        firstName: profileData.user.firstName,
        lastName: profileData.user.lastName,
        email: profileData.user.email,
        phoneOwner: profileData.onboarding?.phoneOwner || "",
        streetAddress: profileData.onboarding?.streetAddress || "",
        city: profileData.onboarding?.city || "",
        state: profileData.onboarding?.state || "",
        zipCode: profileData.onboarding?.zipCode || "",
        birthday: profileData.onboarding?.birthday || "",
        emergencyContactName: profileData.onboarding?.emergencyContactName || "",
        emergencyContactPhone: profileData.onboarding?.emergencyContactPhone || "",
      });
    }
  }, [profileData, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("PUT", "/api/user/profile", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = () => {
    if (profileData) {
      form.reset({
        firstName: profileData.user.firstName,
        lastName: profileData.user.lastName,
        email: profileData.user.email,
        phoneOwner: profileData.onboarding?.phoneOwner || "",
        streetAddress: profileData.onboarding?.streetAddress || "",
        city: profileData.onboarding?.city || "",
        state: profileData.onboarding?.state || "",
        zipCode: profileData.onboarding?.zipCode || "",
        birthday: profileData.onboarding?.birthday || "",
        emergencyContactName: profileData.onboarding?.emergencyContactName || "",
        emergencyContactPhone: profileData.onboarding?.emergencyContactPhone || "",
      });
      setIsEditModalOpen(true);
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
        </div>
      </AdminLayout>
    );
  }

  if (!profileData) {
    return (
      <AdminLayout>
        <div className="text-center text-gray-400">Failed to load profile</div>
      </AdminLayout>
    );
  }

  const { user, onboarding } = profileData;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">My Profile</h1>
            <p className="text-gray-400 text-sm">View and manage your account information</p>
          </div>
          <Button
            onClick={handleEditClick}
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Personal Information */}
        <Card className="bg-[#111111] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-[#EAEB80]" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">First Name</label>
                <p className="text-white font-medium">{user.firstName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Last Name</label>
                <p className="text-white font-medium">{user.lastName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <p className="text-white font-medium">{user.email}</p>
              </div>
              {onboarding?.phoneOwner && (
                <div>
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <p className="text-white font-medium">{onboarding.phoneOwner}</p>
                </div>
              )}
              {onboarding?.birthday && (
                <div>
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Birthday
                  </label>
                  <p className="text-white font-medium">{onboarding.birthday}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-400">Role</label>
                <Badge variant="outline" className="bg-[#EAEB80]/20 text-[#EAEB80] border-[#EAEB80]/30 mt-1">
                  {user.roleName}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        {onboarding && (onboarding.streetAddress || onboarding.city || onboarding.state) && (
          <Card className="bg-[#111111] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="w-5 h-5 text-[#EAEB80]" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onboarding.streetAddress && (
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-400">Street Address</label>
                    <p className="text-white font-medium">{onboarding.streetAddress}</p>
                  </div>
                )}
                {onboarding.city && (
                  <div>
                    <label className="text-sm text-gray-400">City</label>
                    <p className="text-white font-medium">{onboarding.city}</p>
                  </div>
                )}
                {onboarding.state && (
                  <div>
                    <label className="text-sm text-gray-400">State</label>
                    <p className="text-white font-medium">{onboarding.state}</p>
                  </div>
                )}
                {onboarding.zipCode && (
                  <div>
                    <label className="text-sm text-gray-400">Zip Code</label>
                    <p className="text-white font-medium">{onboarding.zipCode}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {onboarding && (onboarding.emergencyContactName || onboarding.emergencyContactPhone) && (
          <Card className="bg-[#111111] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-[#EAEB80]" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onboarding.emergencyContactName && (
                  <div>
                    <label className="text-sm text-gray-400">Contact Name</label>
                    <p className="text-white font-medium">{onboarding.emergencyContactName}</p>
                  </div>
                )}
                {onboarding.emergencyContactPhone && (
                  <div>
                    <label className="text-sm text-gray-400">Contact Phone</label>
                    <p className="text-white font-medium">{onboarding.emergencyContactPhone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Information */}
        {onboarding && (onboarding.vehicleMake || onboarding.vehicleModel || onboarding.vinNumber) && (
          <Card className="bg-[#111111] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Car className="w-5 h-5 text-[#EAEB80]" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onboarding.vehicleYear && (
                  <div>
                    <label className="text-sm text-gray-400">Year</label>
                    <p className="text-white font-medium">{onboarding.vehicleYear}</p>
                  </div>
                )}
                {onboarding.vehicleMake && (
                  <div>
                    <label className="text-sm text-gray-400">Make</label>
                    <p className="text-white font-medium">{onboarding.vehicleMake}</p>
                  </div>
                )}
                {onboarding.vehicleModel && (
                  <div>
                    <label className="text-sm text-gray-400">Model</label>
                    <p className="text-white font-medium">{onboarding.vehicleModel}</p>
                  </div>
                )}
                {onboarding.vehicleTrim && (
                  <div>
                    <label className="text-sm text-gray-400">Trim</label>
                    <p className="text-white font-medium">{onboarding.vehicleTrim}</p>
                  </div>
                )}
                {onboarding.vinNumber && (
                  <div>
                    <label className="text-sm text-gray-400">VIN Number</label>
                    <p className="text-white font-mono text-sm">{onboarding.vinNumber}</p>
                  </div>
                )}
                {onboarding.licensePlate && (
                  <div>
                    <label className="text-sm text-gray-400">License Plate</label>
                    <p className="text-white font-medium">{onboarding.licensePlate}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ACH Information */}
        {onboarding && (onboarding.bankName || onboarding.routingNumber || onboarding.accountNumber) && (
          <Card className="bg-[#111111] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="w-5 h-5 text-[#EAEB80]" />
                ACH Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onboarding.bankName && (
                  <div>
                    <label className="text-sm text-gray-400">Bank Name</label>
                    <p className="text-white font-medium">{onboarding.bankName}</p>
                  </div>
                )}
                {onboarding.routingNumber && (
                  <div>
                    <label className="text-sm text-gray-400">Routing Number</label>
                    <p className="text-white font-mono text-sm">
                      {onboarding.routingNumber.replace(/\d(?=\d{4})/g, "*")}
                    </p>
                  </div>
                )}
                {onboarding.accountNumber && (
                  <div>
                    <label className="text-sm text-gray-400">Account Number</label>
                    <p className="text-white font-mono text-sm">
                      {onboarding.accountNumber.replace(/\d(?=\d{4})/g, "*")}
                    </p>
                  </div>
                )}
                {onboarding.taxClassification && (
                  <div>
                    <label className="text-sm text-gray-400">Tax Classification</label>
                    <p className="text-white font-medium">{onboarding.taxClassification}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insurance Information */}
        {onboarding && (onboarding.insuranceProvider || onboarding.policyNumber) && (
          <Card className="bg-[#111111] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-[#EAEB80]" />
                Insurance Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onboarding.insuranceProvider && (
                  <div>
                    <label className="text-sm text-gray-400">Provider</label>
                    <p className="text-white font-medium">{onboarding.insuranceProvider}</p>
                  </div>
                )}
                {onboarding.insurancePhone && (
                  <div>
                    <label className="text-sm text-gray-400">Phone</label>
                    <p className="text-white font-medium">{onboarding.insurancePhone}</p>
                  </div>
                )}
                {onboarding.policyNumber && (
                  <div>
                    <label className="text-sm text-gray-400">Policy Number</label>
                    <p className="text-white font-mono text-sm">{onboarding.policyNumber}</p>
                  </div>
                )}
                {onboarding.insuranceExpiration && (
                  <div>
                    <label className="text-sm text-gray-400">Expiration</label>
                    <p className="text-white font-medium">{onboarding.insuranceExpiration}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Quick Links</h2>
          <QuickLinks />
        </div>

        {/* Edit Profile Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Edit Profile</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update your personal information and contact details
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">First Name</FormLabel>
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
                        <FormLabel className="text-gray-400">Last Name</FormLabel>
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneOwner"
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">City</FormLabel>
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
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">State</FormLabel>
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

                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Street Address</FormLabel>
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
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Zip Code</FormLabel>
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
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Birthday</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Emergency Contact Name</FormLabel>
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
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Emergency Contact Phone</FormLabel>
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

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save Changes
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

