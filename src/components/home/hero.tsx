import { Link } from "wouter";
import { ArrowRight, ChevronDown, Sparkles, Award, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  const scrollToFleet = () => {
    document.getElementById("featured-fleet")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Enhanced Background with Multiple Layers */}
      <div className="absolute inset-0">
        {/* Primary Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transform"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2574&q=80')`,
          }}
        />
        
        {/* Enhanced Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-black/80" />
        
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        
        {/* Animated Gold Particles */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-primary/60 rounded-full animate-pulse" />
          <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-3/4 right-1/4 w-0.5 h-0.5 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
        {/* Enhanced Status Badge */}
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-md border border-primary/30 mb-8 group hover:from-primary/30 hover:to-primary/15 transition-all duration-300">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm text-white/90 tracking-wide font-medium">
            Premium Fleet • Exclusive Access
          </span>
          <Award className="w-4 h-4 text-primary/80" />
        </div>

        {/* Enhanced Main Heading */}
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-8xl font-light tracking-tight text-white mb-8">
          <span className="block mb-2">Luxury</span>
          <span className="block bg-gradient-to-r from-primary via-yellow-300 to-primary bg-clip-text text-transparent drop-shadow-lg">
            Redefined
          </span>
        </h1>

        {/* Enhanced Subheading */}
        <p className="max-w-3xl mx-auto text-xl sm:text-2xl text-white/80 leading-relaxed mb-6 font-light">
          Experience the pinnacle of automotive excellence with our curated collection of the world's most prestigious vehicles.
        </p>
        
        {/* New Value Props */}
        <div className="flex flex-wrap justify-center items-center gap-6 mb-12 text-white/60">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm">Fully Insured</span>
          </div>
          <div className="w-px h-4 bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm">Premium Service</span>
          </div>
          <div className="w-px h-4 bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm">24/7 Concierge</span>
          </div>
        </div>

        {/* Enhanced CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href="/fleet">
            <Button 
              size="lg" 
              className="min-w-[200px] h-14 text-lg font-semibold group bg-gradient-to-r from-primary to-yellow-400 hover:from-yellow-400 hover:to-primary text-black shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-105" 
              data-testid="button-explore-fleet"
            >
              Explore Collection
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              variant="outline"
              className="min-w-[200px] h-14 text-lg font-semibold bg-white/10 backdrop-blur-md border-white/30 hover:bg-white/20 text-white hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl"
              data-testid="button-contact-us"
            >
              Book Consultation
            </Button>
          </Link>
        </div>

        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <button
            onClick={scrollToFleet}
            className="flex flex-col items-center gap-3 text-white/60 hover:text-primary transition-all duration-300 group"
            data-testid="button-scroll-down"
          >
            <span className="text-xs tracking-[0.2em] uppercase font-medium">Discover More</span>
            <div className="relative">
              <ChevronDown className="w-6 h-6 animate-bounce" />
              <ChevronDown className="w-6 h-6 animate-bounce absolute top-0 opacity-30" style={{ animationDelay: '0.5s' }} />
            </div>
          </button>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {/* Top border accent */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        {/* Side accents */}
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-primary/30 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-transparent to-primary/30" />
      </div>
    </section>
  );
}
