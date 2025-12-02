import { Link } from "wouter";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  const scrollToFleet = () => {
    document.getElementById("featured-fleet")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2574&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/50 to-[#0a0a0a]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-foreground/80 tracking-wide">
            Exclusive Collection Available
          </span>
        </div>

        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight text-foreground mb-6">
          Experience
          <span className="block text-primary mt-2">Automotive Excellence</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-foreground/70 leading-relaxed mb-10">
          Discover our curated collection of the world's most prestigious luxury vehicles.
          Each car tells a story of craftsmanship, performance, and timeless elegance.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/fleet">
            <Button size="lg" className="min-w-[180px] group" data-testid="button-explore-fleet">
              Explore Fleet
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              variant="outline"
              className="min-w-[180px] bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10"
              data-testid="button-contact-us"
            >
              Contact Us
            </Button>
          </Link>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <button
            onClick={scrollToFleet}
            className="flex flex-col items-center gap-2 text-foreground/50 hover:text-primary transition-colors group"
            data-testid="button-scroll-down"
          >
            <span className="text-xs tracking-widest uppercase">Scroll to explore</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}
