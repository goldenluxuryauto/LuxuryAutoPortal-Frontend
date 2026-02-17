import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Phone,
  MapPin,
  Car,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface TuroTrip {
  id: number;
  reservationId: string;
  dateBooked: string;
  guestName: string | null;
  guestLink: string | null;
  phoneNumber: string | null;
  carName: string | null;
  carLink: string | null;
  tripStart: string;
  tripEnd: string;
  earnings: number;
  cancelledEarnings: number;
  status: "booked" | "cancelled";
  calendarEventId: string | null;
  deliveryLocation: string | null;
  totalDistance: string | null;
  emailSubject: string | null;
  emailReceivedAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TripsSummary {
  totalTrips: number;
  bookedTrips: number;
  cancelledTrips: number;
  totalEarnings: number;
  cancelledEarnings: number;
}

export default function TuroTripsPage() {
  const [selectedTrip, setSelectedTrip] = useState<TuroTrip | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "booked" | "cancelled">("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch trips
  const { data: tripsData, isLoading: isLoadingTrips } = useQuery<{
    success: boolean;
    data: TuroTrip[];
    total: number;
  }>({
    queryKey: ["/api/turo-trips", statusFilter, searchQuery],
    queryFn: async () => {
      let url = buildApiUrl("/api/turo-trips?limit=100");
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery) {
        url += `&guestName=${encodeURIComponent(searchQuery)}`;
      }
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch trips");
      return response.json();
    },
  });

  // Fetch summary
  const { data: summaryData } = useQuery<{
    success: boolean;
    data: TripsSummary;
  }>({
    queryKey: ["/api/turo-trips/summary"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/turo-trips/summary"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    },
  });

  // Sync emails mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(buildApiUrl("/api/turo-trips/sync"), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to sync emails");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/turo-trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/turo-trips/summary"] });
      toast({
        title: "Sync completed",
        description: `Processed ${data.data.processedCount} emails. ${data.data.newBookings} new bookings, ${data.data.newCancellations} cancellations.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const trips = tripsData?.data || [];
  const summary = summaryData?.data;

  const filteredTrips = trips.filter((trip) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        trip.guestName?.toLowerCase().includes(query) ||
        trip.carName?.toLowerCase().includes(query) ||
        trip.reservationId.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy h:mm a");
    } catch {
      return dateStr;
    }
  };

  const formatDateShort = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Turo Trips</h1>
            <p className="text-muted-foreground mt-1">
              Automated trip tracking from Turo emails
            </p>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Trips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalTrips}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Booked Trips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {summary.bookedTrips}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Cancelled Trips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {summary.cancelledTrips}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalEarnings)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  Lost Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.cancelledEarnings)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Trips</CardTitle>
            <CardDescription>View and manage all Turo trips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="Search by guest, car, or reservation ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trips Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reservation ID</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Car</TableHead>
                    <TableHead>Trip Dates</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Calendar</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTrips ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredTrips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No trips found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-mono text-sm">
                          #{trip.reservationId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {trip.guestName || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-muted-foreground" />
                            {trip.carName || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDateShort(trip.tripStart)}</div>
                            <div className="text-muted-foreground text-xs">
                              to {formatDateShort(trip.tripEnd)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {trip.status === "booked" ? (
                            <span className="text-green-600 font-semibold">
                              {formatCurrency(trip.earnings)}
                            </span>
                          ) : (
                            <span className="text-red-600 font-semibold">
                              ({formatCurrency(trip.cancelledEarnings)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {trip.status === "booked" ? (
                            <Badge className="bg-green-500">Booked</Badge>
                          ) : (
                            <Badge variant="destructive">Cancelled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {trip.calendarEventId ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTrip(trip)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip Details Modal */}
      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trip Details</DialogTitle>
            <DialogDescription>
              Reservation #{selectedTrip?.reservationId}
            </DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={selectedTrip.status === "booked" ? "bg-green-500" : ""} variant={selectedTrip.status === "cancelled" ? "destructive" : "default"}>
                  {selectedTrip.status === "booked" ? "Booked" : "Cancelled"}
                </Badge>
                {selectedTrip.calendarEventId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Added to Calendar
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Guest Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {selectedTrip.guestName || "Unknown"}
                    </div>
                    {selectedTrip.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {selectedTrip.phoneNumber}
                      </div>
                    )}
                    {selectedTrip.guestLink && (
                      <a
                        href={selectedTrip.guestLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on Turo
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Car Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      {selectedTrip.carName || "Unknown"}
                    </div>
                    {selectedTrip.carLink && (
                      <a
                        href={selectedTrip.carLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Listing
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Trip Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Booked:</span>
                    {formatDate(selectedTrip.dateBooked)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Start:</span>
                    {formatDate(selectedTrip.tripStart)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">End:</span>
                    {formatDate(selectedTrip.tripEnd)}
                  </div>
                  {selectedTrip.deliveryLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Location:</span>
                      {selectedTrip.deliveryLocation}
                    </div>
                  )}
                  {selectedTrip.totalDistance && (
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Distance:</span>
                      {selectedTrip.totalDistance}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Earnings</h4>
                <div className="text-2xl font-bold">
                  {selectedTrip.status === "booked" ? (
                    <span className="text-green-600">
                      {formatCurrency(selectedTrip.earnings)}
                    </span>
                  ) : (
                    <span className="text-red-600">
                      {formatCurrency(selectedTrip.cancelledEarnings)} (Lost)
                    </span>
                  )}
                </div>
              </div>

              {selectedTrip.cancellationReason && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Cancellation Reason</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTrip.cancellationReason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
