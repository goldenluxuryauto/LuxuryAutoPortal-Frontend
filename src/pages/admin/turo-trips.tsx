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
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const itemsPerPage = 20;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debounced search to avoid too many API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch trips with pagination
  const { data: tripsData, isLoading: isLoadingTrips } = useQuery<{
    success: boolean;
    data: TuroTrip[];
    total: number;
  }>({
    queryKey: ["/api/turo-trips", statusFilter, debouncedSearchQuery, currentPage, itemsPerPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;
      let url = buildApiUrl(`/api/turo-trips?limit=${itemsPerPage}&offset=${offset}`);
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }
      if (debouncedSearchQuery) {
        url += `&guestName=${encodeURIComponent(debouncedSearchQuery)}`;
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
  const totalTrips = tripsData?.total || 0;
  const summary = summaryData?.data;
  const totalPages = Math.ceil(totalTrips / itemsPerPage);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery("");
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchQuery]);

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

  // Highlight search terms in text
  const highlightText = (text: string | null, searchTerm: string) => {
    if (!text || !searchTerm) return text || "";
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
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
              <div className="flex-1 relative">
                <Input
                  placeholder="Search by guest, car, or reservation ID... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                    title="Clear search (Esc)"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
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
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="whitespace-nowrap"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Search Results Info */}
            {debouncedSearchQuery && (
              <div className="mb-4 p-3 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Found <span className="font-semibold text-foreground">{totalTrips}</span> result{totalTrips !== 1 ? 's' : ''} for{" "}
                  <span className="font-semibold text-foreground">"{debouncedSearchQuery}"</span>
                  {statusFilter !== "all" && (
                    <> in <span className="font-semibold text-foreground">{statusFilter}</span> trips</>
                  )}
                </p>
              </div>
            )}

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
                  ) : trips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          {debouncedSearchQuery || statusFilter !== "all" ? (
                            <>
                              <Calendar className="w-12 h-12 opacity-20" />
                              <div>
                                <p className="font-medium text-foreground">No trips found</p>
                                <p className="text-sm">Try adjusting your search or filters</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSearchQuery("");
                                  setStatusFilter("all");
                                }}
                              >
                                Clear all filters
                              </Button>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-12 h-12 opacity-20" />
                              <div>
                                <p className="font-medium text-foreground">No trips yet</p>
                                <p className="text-sm">Click "Sync Now" to fetch trips from your emails</p>
                              </div>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    trips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-mono text-sm">
                          #{debouncedSearchQuery ? highlightText(trip.reservationId, debouncedSearchQuery) : trip.reservationId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {debouncedSearchQuery ? highlightText(trip.guestName, debouncedSearchQuery) : (trip.guestName || "Unknown")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-muted-foreground" />
                            {debouncedSearchQuery ? highlightText(trip.carName, debouncedSearchQuery) : (trip.carName || "Unknown")}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalTrips)}</span> of{" "}
                  <span className="font-medium">{totalTrips}</span> trips
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
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
