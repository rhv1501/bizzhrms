"use client";

import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

type NotificationItem = { id: string; title: string; body?: string; created_at?: string; type?: string; read_at?: string | null };

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border/70 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 gap-2 md:gap-0">
      <div className="flex items-center gap-2 md:gap-3 w-full max-w-xl">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger className="md:hidden shrink-0 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetHeader className="hidden">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <Sidebar className="w-full border-none shadow-none" onNavigate={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search employees, tasks, leaves..."
            className="w-full bg-muted/50 border-none pl-9 focus-visible:ring-1"
          />
        </div>
        <Badge
          variant="outline"
          className="hidden md:inline-flex rounded-full px-3"
        >
          Live sync
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <NotificationsPopover />
      </div>
    </header>
  );
}

function NotificationsPopover() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const unreadCount = items.filter((item) => !item.read_at).length;

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications/recent');
      const json = await res.json();
      if (Array.isArray(json.notifications)) {
        setItems(json.notifications.map((n: any) => ({ id: n.id, title: n.title, body: n.body, created_at: n.created_at, read_at: n.read_at })));
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      await loadNotifications();
      if (!mounted) return;
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Popover>
      <PopoverTrigger className="relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 ? (
          unreadCount === 1 ? (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          ) : (
            <span className="absolute -top-1 -right-1 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )
        ) : null}
      </PopoverTrigger>
      <PopoverContent sideOffset={8} className="w-80">
        <PopoverHeader>
          <PopoverTitle>Notifications</PopoverTitle>
          <PopoverDescription>Recent activity and system alerts</PopoverDescription>
        </PopoverHeader>
        <div className="mt-2 space-y-2">
          {items.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No notifications</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className="p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={async () => {
                await fetch('/api/notifications/mark-read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notificationId: n.id }),
                });
                await loadNotifications();
              }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {!n.read_at && <span className="inline-flex h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
