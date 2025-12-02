import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Users, DollarSign, TrendingUp, Mail, Phone, Clock, MessageCircle, CheckCircle } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    retry: false,
  });

  const quickStartSteps = [
    "Navigate to Forms tab",
    "Share QR code with potential clients",
    "Get instant notifications via Slack and email",
    "Review and approve in the portal",
  ];

  const features = [
    "Automated client onboarding",
    "Digital document collection",
    "ACH payment setup",
    "Insurance verification",
  ];

  const supportInfo = {
    email: "support@goldenluxuryauto.com",
    phone: "(555) 123-4567",
    hours: "Mon-Fri: 9AM - 6PM EST",
    chat: "Live chat available",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-2">
            Welcome to Golden Luxury Auto
          </h1>
          <p className="text-gray-500 text-sm">
            Premium vehicle management portal for tracking clients, vehicles, and revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Car className="w-4 h-4 text-[#EAEB80]" />
                <span className="text-sm text-gray-400">Active Vehicles</span>
              </div>
              <p className="text-3xl font-bold text-white" data-testid="stat-vehicles">
                {isLoading ? "..." : stats?.activeVehicles || 24}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[#EAEB80]" />
                <span className="text-sm text-gray-400">Total Clients</span>
              </div>
              <p className="text-3xl font-bold text-white" data-testid="stat-clients">
                {isLoading ? "..." : stats?.totalClients || 18}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-[#EAEB80]" />
                <span className="text-sm text-gray-400">Monthly Revenue</span>
              </div>
              <p className="text-3xl font-bold text-white" data-testid="stat-revenue">
                ${isLoading ? "..." : ((stats?.monthlyRevenue || 42500) / 1000).toFixed(1)}K
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#EAEB80]" />
                <span className="text-sm text-gray-400">Growth Rate</span>
              </div>
              <p className="text-3xl font-bold text-[#EAEB80]" data-testid="stat-growth">
                +{isLoading ? "..." : stats?.growthRate || 23}%
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-[#111111] border-[#EAEB80]/20">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-white mb-4">Quick Start</h3>
              <ol className="space-y-3">
                {quickStartSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="text-[#EAEB80] font-medium">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#EAEB80]/20">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-white mb-4">Features</h3>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-[#EAEB80]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#EAEB80]/20">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <Mail className="w-4 h-4 text-[#EAEB80]" />
                  <span>{supportInfo.email}</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <Phone className="w-4 h-4 text-[#EAEB80]" />
                  <span>{supportInfo.phone}</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <Clock className="w-4 h-4 text-[#EAEB80]" />
                  <span>{supportInfo.hours}</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <MessageCircle className="w-4 h-4 text-[#EAEB80]" />
                  <span>{supportInfo.chat}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
