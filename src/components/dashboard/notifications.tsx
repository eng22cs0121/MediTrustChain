"use client";

import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/notifications-context";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function Notifications() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markAsRead(id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn("flex items-start gap-3", !notification.read && "bg-muted/50")}
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                </p>
              </div>
              {!notification.read && (
                <Button variant="ghost" size="sm" onClick={(e) => handleMarkAsRead(e, notification.id)}>
                   <Check className="h-4 w-4" />
                   <span className="sr-only">Mark as read</span>
                </Button>
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No new notifications.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
