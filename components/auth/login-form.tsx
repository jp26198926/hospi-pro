"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { loginSchema, LoginInput } from "@/lib/validations/auth";

function setAccessTokenCookie(token: string) {
  document.cookie = `accessToken=${token}; Path=/; Max-Age=900; SameSite=Strict`;
}

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [appSettings, setAppSettings] = useState<{ appLogo: string | null; appName: string }>({ appLogo: null, appName: "RBAC System" });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    fetch("/api/settings-application")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAppSettings({
            appLogo: json.data.appLogo || null,
            appName: json.data.appName || "RBAC System",
          });
        }
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Login failed");
        return;
      }

      // Store access token in localStorage for API calls
      localStorage.setItem("accessToken", json.data.accessToken);
      setAccessTokenCookie(json.data.accessToken);

      toast.success("Login successful");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2f2f2]">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          {appSettings.appLogo ? (
            <div className="flex h-16 w-16 items-center justify-center bg-white border border-[#ddd]">
              <img src={appSettings.appLogo} alt="Logo" className="h-12 w-12 object-contain" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center bg-[#438eb9]">
              <Shield className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[#337ab7]">{appSettings.appName}</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#337ab7]">Login</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#333]">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#333]">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                  className="border-[#ccc] pr-10 focus:border-[#337ab7] focus:ring-[#337ab7]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#333]">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <a href="/forgot-password" className="text-sm text-[#337ab7] hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#337ab7] text-white hover:bg-[#286090]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
