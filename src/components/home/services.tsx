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
    <section className="py-20 lg:py-28 bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Why Choose Us
          </p>
          <h2 className="font-serif text-3xl lg:text-4xl font-medium text-white mb-4">
            The Luxury Experience
          </h2>
          <p className="max-w-2xl mx-auto text-gray-400">
            Beyond exceptional vehicles, we deliver an unparalleled ownership experience
            tailored to the most discerning clientele.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card
                key={index}
                className="bg-white/[0.04] border-white/10 hover-elevate group"
              >
                <CardContent className="p-6 lg:p-8">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
