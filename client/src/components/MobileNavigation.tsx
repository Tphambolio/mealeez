import { Link, useLocation } from "wouter";
import { Calendar, BookOpen, ShoppingCart, Flame, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { path: "/", icon: Calendar, label: "Planner" },
  { path: "/recipes", icon: BookOpen, label: "Recipes" },
  { path: "/shopping", icon: ShoppingCart, label: "Shopping" },
  { path: "/cooking", icon: Flame, label: "Cook" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNavigation() {
  const [location] = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          
          return (
            <Link key={path} href={path}>
              <a
                className={cn(
                  "flex flex-col items-center justify-center h-full transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
