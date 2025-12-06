import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Login failed" }));
        throw new Error(errorData.error || `Login failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.firstName}`,
      });
      setLocation("/admin");
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img 
            src="/logo.png" 
            alt="Golden Luxury Auto" 
            className="h-[240px] w-auto mx-auto object-contain mb-6 drop-shadow-[0_0_15px_rgba(234,235,128,0.5)]"
          />
          <p className="text-gray-400 mt-6 text-sm">Admin Portal Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-400 text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#111111] border-[#222222] text-white focus:border-[#EAEB80] focus:ring-[#EAEB80] h-11"
              placeholder="admin@goldenluxuryauto.com"
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-400 text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#111111] border-[#222222] text-white focus:border-[#EAEB80] focus:ring-[#EAEB80] h-11"
              placeholder="••••••••"
              required
              data-testid="input-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium h-11"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-gray-700 text-xs mt-8">
          Premium vehicle management portal
        </p>
      </div>
    </div>
  );
}
