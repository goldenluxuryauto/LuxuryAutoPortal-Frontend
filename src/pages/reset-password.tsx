import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import { Loader2, Lock, Eye, EyeOff, Mail, CheckCircle } from "lucide-react";
import { checkPasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from "@/lib/password-strength";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL query string
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    setToken(tokenParam);
  }, []);
  
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetRequestSent, setResetRequestSent] = useState(false);

  // Request password reset mutation
  const resetRequestMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(buildApiUrl("/api/auth/reset-password-request"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send reset email");
      }
      return response.json();
    },
    onSuccess: () => {
      setResetRequestSent(true);
      toast({
        title: "Email Sent",
        description: "If an account exists with this email, a password reset link has been sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    },
  });

  // Reset password with token mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await fetch(buildApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully. Please log in with your new password.",
      });
      setTimeout(() => {
        setLocation("/admin/login");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const passwordStrength = checkPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canResetPassword = 
    token &&
    passwordStrength.isValid &&
    passwordsMatch &&
    !resetPasswordMutation.isPending;

  const handleResetRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    resetRequestMutation.mutate(email.trim());
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canResetPassword || !token) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({
      token,
      newPassword,
    });
  };

  // If we have a token, show reset form; otherwise show request form
  if (token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#111111] border-[#EAEB80]/20">
          <CardHeader>
            <CardTitle className="text-[#EAEB80] flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-gray-300">
                  New Password *
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#EAEB80] pr-10"
                    placeholder="Enter your new password (min 8 characters)"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition-colors"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#2a2a2a] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getPasswordStrengthColor(
                            passwordStrength.score
                          )}`}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {getPasswordStrengthLabel(passwordStrength.score)}
                      </span>
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="text-xs space-y-1">
                        {passwordStrength.feedback.map((feedback, idx) => (
                          <div
                            key={idx}
                            className={`${
                              passwordStrength.isValid ? "text-green-400" : "text-yellow-400"
                            }`}
                          >
                            {feedback}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-gray-300">
                  Confirm New Password *
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#EAEB80] pr-10"
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="text-xs">
                    {passwordsMatch ? (
                      <span className="text-green-400">✓ Passwords match</span>
                    ) : (
                      <span className="text-red-400">✗ Passwords do not match</span>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={!canResetPassword}
                className="w-full bg-[#EAEB80] text-black hover:bg-[#d4d570] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>

              <div className="text-center">
                <a
                  href="/admin/login"
                  className="text-sm text-[#EAEB80] hover:underline"
                >
                  Back to Login
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Request password reset form
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#111111] border-[#EAEB80]/20">
        <CardHeader>
          <CardTitle className="text-[#EAEB80] flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Reset Password
          </CardTitle>
          <CardDescription className="text-gray-400">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetRequestSent ? (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Check Your Email</h3>
                <p className="text-gray-400">
                  If an account exists with <strong>{email}</strong>, we've sent a password reset link.
                </p>
                <p className="text-sm text-gray-500">
                  The link will expire in 1 hour.
                </p>
              </div>
              <Button
                onClick={() => {
                  setResetRequestSent(false);
                  setEmail("");
                }}
                variant="outline"
                className="w-full border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10"
              >
                Send Another Email
              </Button>
              <div className="text-center">
                <a
                  href="/admin/login"
                  className="text-sm text-[#EAEB80] hover:underline"
                >
                  Back to Login
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={!email.trim() || resetRequestMutation.isPending}
                className="w-full bg-[#EAEB80] text-black hover:bg-[#d4d570] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetRequestMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>

              <div className="text-center">
                <a
                  href="/admin/login"
                  className="text-sm text-[#EAEB80] hover:underline"
                >
                  Back to Login
                </a>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

