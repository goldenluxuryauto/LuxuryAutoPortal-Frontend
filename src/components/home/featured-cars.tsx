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
    <Card className="group overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:bg-card/80 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={car.images?.[0] || "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
        />
        {car.featured && (
          <Badge className="absolute top-4 left-4 bg-gradient-to-r from-primary to-yellow-400 text-black font-semibold shadow-lg">
            ✨ Featured
          </Badge>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
        
        {/* Hover overlay with price */}
        <div className="absolute inset-0 flex items-end p-6 opacity-0 group-hover:opacity-100 transition-all duration-500">
          <div className="w-full">
            <p className="text-2xl font-bold text-white mb-1">
              {formatPrice(String(car.price || "0"))}
            </p>
            <p className="text-white/80 text-sm">Starting price</p>
          </div>
        </div>
      </div>
      
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
            {car.make} {car.model}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">{car.exteriorColor}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg transition-colors group-hover:bg-primary/5">
            <Calendar className="w-4 h-4 text-primary mb-1" />
            <span className="text-sm font-medium">{car.year}</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg transition-colors group-hover:bg-primary/5">
            <Gauge className="w-4 h-4 text-primary mb-1" />
            <span className="text-sm font-medium">{car.mileage?.toLocaleString()} mi</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg transition-colors group-hover:bg-primary/5">
            <Fuel className="w-4 h-4 text-primary mb-1" />
            <span className="text-sm font-medium">{car.fuelType}</span>
          </div>
        </div>

        <Link href={`/fleet/${car.id}`}>
          <Button 
            variant="outline" 
            className="w-full group/btn border-primary/20 text-foreground hover:bg-primary hover:text-black hover:border-primary font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/20" 
            data-testid={`button-view-details-${car.id}`}
          >
            Explore Vehicle
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function FeaturedCars() {
  return (
    <section id="featured-fleet" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm font-semibold text-primary tracking-widest uppercase">
              Curated Selection
            </p>
          </div>
          
          <h2 className="font-serif text-4xl lg:text-5xl font-light text-foreground mb-6 tracking-tight">
            Featured 
            <span className="block text-primary mt-2">Collection</span>
          </h2>
          
          <p className="max-w-3xl mx-auto text-lg text-muted-foreground leading-relaxed">
            Hand-selected automobiles representing the pinnacle of automotive engineering, design excellence, and driving passion.
          </p>
          
          {/* Decorative divider */}
          <div className="flex items-center justify-center mt-8">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="w-2 h-2 rounded-full bg-primary mx-4" />
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
        </div>

        {/* Car Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10">
          {featuredCars.map((car, index) => (
            <div 
              key={car.id} 
              className="opacity-0 animate-in fade-in-0 slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 200}ms`, animationFillMode: 'forwards' }}
            >
              <CarCard car={car} />
            </div>
          ))}
        </div>

        {/* Enhanced CTA */}
        <div className="text-center mt-16 lg:mt-20">
          <div className="space-y-4">
            <Link href="/fleet">
              <Button 
                size="lg" 
                variant="outline" 
                className="min-w-[220px] h-12 border-primary/30 text-foreground hover:bg-primary hover:text-black hover:border-primary font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/20" 
                data-testid="button-view-all-fleet"
              >
                View Complete Collection
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Discover our full range of luxury vehicles
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
