import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ciplaLogo from "@assets/WhatsApp_Image_2026-06-09_at_6.43.04_PM_1781461513497.jpeg";
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Stethoscope, 
  Video, 
  BarChart, 
  ShieldAlert, 
  LogOut,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const adminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/managers", label: "Managers", icon: Users },
    { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/admin/videos", label: "Videos", icon: Video },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldAlert },
  ];

  const managerLinks = [
    { href: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/manager/add-doctor", label: "Add Doctor", icon: UserPlus },
    { href: "/manager/doctors", label: "My Doctors", icon: Stethoscope },
    { href: "/manager/videos", label: "My Videos", icon: Video },
  ];

  const links = user?.role === "admin" ? adminLinks : managerLinks;

  const NavLinks = () => (
    <div className="space-y-1">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />
              {link.label}
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card h-full">
        <div className="h-16 flex items-center px-6 border-b">
          <img src={ciplaLogo} alt="Cipla Logo" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <NavLinks />
        </div>
        <div className="p-4 border-t">
          <div className="mb-4 px-2">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden h-16 border-b bg-card flex items-center justify-between px-4">
          <img src={ciplaLogo} alt="Cipla Logo" className="h-6 w-auto object-contain" />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              <div className="h-16 flex items-center px-6 border-b">
                <img src={ciplaLogo} alt="Cipla Logo" className="h-8 w-auto object-contain" />
              </div>
              <div className="flex-1 overflow-y-auto py-4 px-3">
                <NavLinks />
              </div>
              <div className="p-4 border-t">
                <div className="mb-4 px-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
                <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
