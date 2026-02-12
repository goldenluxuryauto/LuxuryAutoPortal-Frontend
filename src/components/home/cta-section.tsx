import { Link } from "wouter";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=2574&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-medium text-primary tracking-widest uppercase mb-4">
          Start Your Journey
        </p>
        <h2 className="font-serif text-3xl lg:text-5xl font-light text-foreground mb-6">
          Ready to Find Your
          <span className="block text-primary mt-2">Dream Vehicle?</span>
        </h2>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          Our team of luxury automotive specialists is ready to help you find
          the perfect vehicle that matches your lifestyle and preferences.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/onboarding">
            <Button size="lg" className="min-w-[200px] group" data-testid="button-cta-get-started">
              Get Started
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href="tel:+1234567890">
            <Button
              size="lg"
              variant="outline"
              className="min-w-[200px] bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10"
              data-testid="button-cta-call"
            >
              <Phone className="mr-2 w-4 h-4" />
              Call Us Now
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
