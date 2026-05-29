"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  Settings,
  LogOut,
  Clock,
  History,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === "admin";

  const adminRoutes = [
    { name: "Dashboard", path: "/dashboard/admin", icon: LayoutDashboard },
    { name: "Employees", path: "/dashboard/admin/employees", icon: Users },
    { name: "Tasks", path: "/dashboard/admin/tasks", icon: CheckSquare },
    { name: "Documents", path: "/dashboard/admin/documents", icon: FileText },
    { name: "Leave Requests", path: "/dashboard/admin/leave", icon: Calendar },
    { name: "Settings", path: "/dashboard/admin/settings", icon: Settings },
  ];

  const employeeRoutes = [
    { name: "Dashboard", path: "/dashboard/employee", icon: LayoutDashboard },
    { name: "My Tasks", path: "/dashboard/employee/tasks", icon: CheckSquare },
    { name: "Attendance", path: "/dashboard/employee/history", icon: History },
    { name: "Apply Leave", path: "/dashboard/employee/leave", icon: Calendar },
  ];

  const routes = isAdmin ? adminRoutes : employeeRoutes;

  const handleLogout = async () => {
    const { url, key } = getSupabaseConfig();

    if (url && key) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }

    logout();
    toast.success("Signed out successfully");
    router.push("/login");
  };

  return (
    <div className={cn("flex flex-col h-full bg-card border-r border-border w-64 shadow-sm", className)}>
      <div className="p-6">
        <div className="flex items-center gap-2 font-bold text-2xl text-primary">
          <Image src="/logo.png" alt="BizzGrow Logo" width={32} height={32} className="rounded object-contain" />
          BizzGrow
        </div>
        <div className="text-xs text-muted-foreground mt-1 px-1">
          HRMS Portal
        </div>
      </div>

      <div className="flex-1 px-4 py-2 space-y-1">
        {routes.map((route) => {
          const isActive = pathname === route.path;
          return (
            <Link key={route.path} href={route.path}>
              <div
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <route.icon className="w-4 h-4" />
                {route.name}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">
              {user?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize">
              {user?.role}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
