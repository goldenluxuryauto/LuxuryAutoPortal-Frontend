import { Shield, Truck, Headphones, FileCheck, Sparkles, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: Shield,
    title: "Certified Quality",
    description: "Every vehicle undergoes a rigorous 200-point inspection by our master technicians.",
  },
  {
    icon: Truck,
    title: "Worldwide Delivery",
    description: "White-glove delivery service to any destination, fully insured and tracked.",
  },
  {
    icon: Headphones,
    title: "Concierge Service",
    description: "Dedicated personal advisor to guide you through every step of your purchase.",
  },
  {
    icon: FileCheck,
    title: "Complete Documentation",
    description: "Full service history, provenance documentation, and authenticity certificates.",
  },
  {
    icon: Sparkles,
    title: "Detailing Excellence",
    description: "Professional detailing and preparation before every delivery.",
  },
  {
    icon: Clock,
    title: "Extended Warranty",
    description: "Comprehensive warranty options for complete peace of mind.",
  },
];

export function Services() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-primary tracking-widest uppercase">
              Luxury Service
            </p>
          </div>
          
          <h2 className="font-serif text-4xl lg:text-5xl font-light text-foreground mb-6 tracking-tight">
            The Golden Standard
            <span className="block text-primary mt-2">Experience</span>
          </h2>
          
          <p className="max-w-3xl mx-auto text-lg text-muted-foreground leading-relaxed">
            Beyond exceptional vehicles, we deliver an unparalleled ownership experience
            tailored to the most discerning clientele.
          </p>

          {/* Decorative divider */}
          <div className="flex items-center justify-center mt-8">
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <Sparkles className="w-4 h-4 text-primary mx-4" />
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
        </div>

        {/* Services Grid with Staggered Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card
                key={index}
                className="group bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:bg-card/90 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 opacity-0 animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
              >
                <CardContent className="p-6 lg:p-8 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-6 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {service.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom accent */}
        <div className="flex justify-center mt-16">
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}
