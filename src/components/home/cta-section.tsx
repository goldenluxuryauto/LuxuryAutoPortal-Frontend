import { Link } from "wouter";
import { ArrowRight, Phone, Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transform"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=2574&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
        
        {/* Luxury pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,hsl(var(--primary)/0.3),transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_75%,hsl(var(--primary)/0.2),transparent_50%)]" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-md border border-primary/30 mb-8">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-sm text-white/90 tracking-wide font-medium">
            VIP Experience Awaits
          </span>
          <Sparkles className="w-4 h-4 text-primary" />
        </div>

        {/* Main Heading */}
        <h2 className="font-serif text-4xl lg:text-6xl font-light text-white mb-8 tracking-tight">
          Begin Your 
          <span className="block bg-gradient-to-r from-primary via-yellow-300 to-primary bg-clip-text text-transparent mt-2">
            Luxury Journey
          </span>
        </h2>

        {/* Subtext */}
        <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
          Our dedicated team of luxury automotive specialists is ready to curate 
          the perfect vehicle experience tailored exclusively for you.
        </p>

        {/* Value Props */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-12 text-white/60">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium">Personal Concierge</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium">White-Glove Service</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium">Exclusive Access</span>
          </div>
        </div>

        {/* Enhanced CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href="/onboarding">
            <Button 
              size="lg" 
              className="min-w-[220px] h-14 text-lg font-semibold group bg-gradient-to-r from-primary to-yellow-400 hover:from-yellow-400 hover:to-primary text-black shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105" 
              data-testid="button-cta-get-started"
            >
              Start Your Journey
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          
          <a href="tel:+1234567890">
            <Button
              size="lg"
              variant="outline"
              className="min-w-[220px] h-14 text-lg font-semibold bg-white/10 backdrop-blur-md border-white/30 hover:bg-white/20 text-white hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl"
              data-testid="button-cta-call"
            >
              <Phone className="mr-2 w-5 h-5" />
              Private Consultation
            </Button>
          </a>
        </div>

        {/* Subtle footer note */}
        <p className="text-sm text-white/50 mt-8">
          Available 24/7 • Confidential • Complimentary
        </p>
      </div>

      {/* Decorative border accents */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </section>
  );
}
