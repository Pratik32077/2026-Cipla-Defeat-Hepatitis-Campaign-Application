import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey, CurrentUser, logout as apiLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: CurrentUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("cipla_token"));
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  const login = (newToken: string, newUser: CurrentUser) => {
    localStorage.setItem("cipla_token", newToken);
    setToken(newToken);
    queryClient.setQueryData(getGetMeQueryKey(), newUser);
    if (newUser.role === "admin") {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/manager/dashboard");
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiLogout();
      }
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      localStorage.removeItem("cipla_token");
      setToken(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
