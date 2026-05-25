"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, KeyRound, Mail, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Database } from "@/types/supabase";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleLogin = async (
    role: "admin" | "employee",
    e?: React.FormEvent,
  ) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    try {
      const { url, key } = getSupabaseConfig();

      if (!url || !key) {
        throw new Error("Supabase configuration is missing");
      }

      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Fetch user role
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      const nextProfile = profile as
        | Database["public"]["Tables"]["users"]["Row"]
        | null;

      if (!nextProfile) {
        throw new Error("Profile not found for authenticated user");
      }

      setUser(nextProfile);
      toast.success("Login successful");
      router.push(
        nextProfile.role === "admin"
          ? "/dashboard/admin"
          : "/dashboard/employee",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to login";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-muted/30">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-linear-to-t from-primary/90 to-primary/40"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-primary-foreground p-2 rounded-xl backdrop-blur-sm border border-primary-foreground/20">
            <Image src="/logo.png" alt="BizzGrow Logo" width={40} height={40} className="rounded-lg object-contain" />
          </div>
          <span className="text-3xl font-bold tracking-tight">BizzGrow</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
            Internal Employee Portal
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Access your secure dashboard to log attendance, manage your daily assignments, submit leave requests, and stay connected with the BizzGrow team. Authorized personnel only.
          </p>
        </div>

        <div className="relative z-10 text-sm text-primary-foreground/60 font-medium">
          © {new Date().getFullYear()} BizzGrow. All rights reserved.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="employee">Employee</TabsTrigger>
              <TabsTrigger value="admin">Administrator</TabsTrigger>
            </TabsList>

            <TabsContent value="employee">
              <form onSubmit={(e) => handleLogin("employee", e)}>
                <Card className="border-muted shadow-sm">
                  <CardHeader>
                    <CardTitle>Employee Portal</CardTitle>
                    <CardDescription>
                      Login to track time and manage tasks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="employee-email"
                          placeholder="employee@bizzgrow.com"
                          type="email"
                          className="pl-9"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employee-password">Password</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="employee-password"
                          type="password"
                          className="pl-9"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign in as Employee"}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={(e) => handleLogin("admin", e)}>
                <Card className="border-muted shadow-sm">
                  <CardHeader>
                    <CardTitle>Admin Portal</CardTitle>
                    <CardDescription>
                      Login to manage company workforce.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="admin-email"
                          placeholder="admin@bizzgrow.com"
                          type="email"
                          className="pl-9"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="admin-password"
                          type="password"
                          className="pl-9"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      type="submit"
                      disabled={isLoading}
                      variant="default"
                    >
                      {isLoading ? "Signing in..." : "Sign in as Administrator"}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-6 text-sm text-muted-foreground">
            <p>Supabase authentication is required for this workspace.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
