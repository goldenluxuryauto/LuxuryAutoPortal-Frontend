import { Link } from "wouter";
import { ArrowRight, Gauge, Calendar, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Car } from "@/types/car";

const featuredCars: Partial<Car>[] = [
  {
    id: "1",
    make: "Porsche",
    model: "911 GT3 RS",
    year: 2024,
    price: "249950.00",
    mileage: 1200,
    exteriorColor: "GT Silver Metallic",
    engine: "4.0L Flat-6",
    transmission: "7-Speed PDK",
    fuelType: "Gasoline",
    featured: true,
    status: "available",
    images: ["https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"],
  },
  {
    id: "2",
    make: "Ferrari",
    model: "SF90 Stradale",
    year: 2023,
    price: "625000.00",
    mileage: 850,
    exteriorColor: "Rosso Corsa",
    engine: "4.0L Twin-Turbo V8 Hybrid",
    transmission: "8-Speed Dual-Clutch",
    fuelType: "Hybrid",
    featured: true,
    status: "available",
    images: ["https://images.unsplash.com/photo-1583121274602-3e2820c69888?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"],
  },
  {
    id: "3",
    make: "Lamborghini",
    model: "Huracán Tecnica",
    year: 2024,
    price: "335000.00",
    mileage: 500,
    exteriorColor: "Verde Mantis",
    engine: "5.2L V10",
    transmission: "7-Speed Dual-Clutch",
    fuelType: "Gasoline",
    featured: true,
    status: "available",
    images: ["https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"],
  },
];

function formatPrice(price: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parseFloat(price));
}

function CarCard({ car }: { car: Partial<Car> }) {
  return (
    <Card className="group overflow-hidden bg-card border-white/10 hover-elevate">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={car.images?.[0] || "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {car.featured && (
          <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
            Featured
          </Badge>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              {car.make} {car.model}
            </h3>
            <p className="text-sm text-muted-foreground">{car.exteriorColor}</p>
          </div>
          <p className="text-xl font-semibold text-primary whitespace-nowrap">
            {formatPrice(String(car.price || "0"))}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-white" />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="w-4 h-4 text-primary/70" />
            <span>{car.mileage?.toLocaleString()} mi</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Fuel className="w-4 h-4 text-primary/70" />
            <span>{car.fuelType}</span>
          </div>
        </div>

        <Link href={`/fleet/${car.id}`}>
          <Button variant="outline" className="w-full group/btn border-white/20" data-testid={`button-view-details-${car.id}`}>
            View Details
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function FeaturedCars() {
  return (
    <section id="featured-fleet" className="py-20 lg:py-28 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Curated Selection
          </p>
          <h2 className="font-serif text-3xl lg:text-4xl font-medium text-foreground mb-4">
            Featured Vehicles
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            Hand-picked automobiles representing the pinnacle of automotive engineering and design.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {featuredCars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/fleet">
            <Button size="lg" variant="outline" className="border-white/20" data-testid="button-view-all-fleet">
              View All Vehicles
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
