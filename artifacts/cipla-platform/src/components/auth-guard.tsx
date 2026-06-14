import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
  requireRole?: "admin" | "manager";
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const { user, token, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!token || !user) {
        setLocation("/login");
      } else if (requireRole && user.role !== requireRole) {
        if (user.role === "admin") {
          setLocation("/admin/dashboard");
        } else {
          setLocation("/manager/dashboard");
        }
      }
    }
  }, [isLoading, token, user, requireRole, setLocation]);

  if (isLoading || !token || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireRole && user.role !== requireRole) {
    return null; // Will redirect in effect
  }

  return <>{children}</>;
}
