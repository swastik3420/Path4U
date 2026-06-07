import { useState, useEffect, useRef } from "react";
import { Bell, Newspaper, ExternalLink, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSafeUrl } from "@/lib/safeUrl";

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
  const [refreshing, setRefreshing] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const fetchNotifications = async (force = false) => {
    if (!force && items.length > 0) return;
    force ? setRefreshing(true) : setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-notifications");
      if (!error && data?.notifications) setItems(data.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
      >
        <Bell className="w-[23px] h-[23px]" />
        {hasNew && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive border-2 border-background animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-4 w-80 md:w-96 origin-top-right rounded-2xl bg-popover shadow-2xl border border-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/40">
            <h3 className="font-black text-foreground flex items-center gap-2 text-sm font-display">
              <TrendingUp className="h-4 w-4 text-primary" /> Market Intelligence
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchNotifications(true);
                }}
                className={`p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all ${
                  refreshing ? "animate-spin text-primary" : ""
                }`}
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] uppercase font-black text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Live
              </span>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto bg-popover">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length > 0 ? (
              items.map((news) => {
                const isJob = news.type === "job";
                const Tag = news.url && isSafeUrl(news.url) ? "a" : "div";
                return (
                  <Tag
                    key={news.id}
                    {...(Tag === "a"
                      ? { href: news.url!, target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="block p-4 hover:bg-muted/50 border-b last:border-0 border-border/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          isJob
                            ? "bg-secondary/15 text-secondary"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {isJob ? "Job Market" : "Tech News"}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {news.timestamp}
                      </span>
                    </div>
                    <h4 className="font-bold text-foreground text-sm leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {news.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                      {news.description}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
                      Source: {news.source}
                      {news.url && <ExternalLink className="h-3 w-3" />}
                    </div>
                  </Tag>
                );
              })
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                <Newspaper className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs font-bold">Gathering latest intelligence...</p>
              </div>
            )}
          </div>

          <div className="p-2 bg-muted/30 border-t border-border text-center">
            <p className="text-[9px] font-bold text-muted-foreground">
              Powered by Google Search Grounding
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
