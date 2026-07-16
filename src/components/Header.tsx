import { Menu, X, User, LogOut, Loader2, Settings, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import StepperNav from "@/components/StepperNav";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, profile, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
            <Rocket className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground font-display">Path4U</span>
          {!isOnline && (
            <div className="flex items-center gap-1 bg-warning/10 border border-warning/20 text-warning text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ml-2">
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
              Offline
            </div>
          )}
        </a>

        {user && <StepperNav />}

        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : user ? (
            <>
              <div className="h-8 w-px bg-border" />
              <div className="group relative">
                <Link to="/dashboard" className="flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-all">
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] font-black text-foreground uppercase tracking-widest leading-none mb-1">
                      {profile?.full_name || user.email?.split("@")[0]}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground leading-none">Standard Tier</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                </Link>

                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-popover p-2 shadow-2xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link
                    to="/settings"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4 text-primary" />
                    Profile Settings
                  </Link>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/company/auth">
                <Button variant="outline" size="sm" className="rounded-none">
                  For Companies
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero" className="rounded-none">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMenuOpen && (
        <nav className="md:hidden border-t border-border px-4 py-4 flex flex-col gap-3 bg-background">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" className="w-full gap-2">
                  <User className="w-4 h-4" /> Dashboard
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" className="w-full gap-2">
                  <Settings className="w-4 h-4" /> Settings
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut} className="w-full gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero" className="w-full">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
