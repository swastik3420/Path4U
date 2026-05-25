import { useState, useEffect, useRef } from "react";
import { Bell, Briefcase, Cpu, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface NotificationItem {
  id: string;
  type: "job" | "news";
  title: string;
  description: string;
  source: string;
  url?: string;
  timestamp: string;
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (items.length > 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-notifications");
      if (!error && data?.notifications) {
        setItems(data.notifications);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setHasNew(false);
      fetchNotifications();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {hasNew && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
            <p className="text-xs text-muted-foreground">Latest jobs & tech news</p>
          </div>

          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => isSafeUrl(item.url) && window.open(item.url, "_blank", "noopener,noreferrer")}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        item.type === "job" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                      }`}>
                        {item.type === "job" ? <Briefcase className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {item.type === "job" ? "Job" : "News"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground truncate">{item.source}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-tight line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{item.timestamp}</p>
                      </div>
                      {item.url && <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-1" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
