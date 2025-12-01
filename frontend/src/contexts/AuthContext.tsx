import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi } from "../lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  tokensBalance: number;
  tokensUsed: number;
  subscriptionId: string | null;
  subscription?: {
    id: string;
    name: string;
    tokensPerMonth: number;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await authApi.getMe();
      // Handle both direct response and nested data format
      const userData = response.data?.data?.user || response.data?.user || response.data;
      if (userData) {
        setUser({
          ...userData,
          tokensBalance: userData.tokens || userData.tokensBalance || 0,
          tokensUsed: userData.tokensUsed || 0,
        });
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Auth refresh error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set a maximum timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth loading timeout - forcing completion");
        setIsLoading(false);
      }
    }, 5000);
    
    refreshUser();
    
    return () => clearTimeout(timeout);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    // Handle nested data format from Workers API
    const data = response.data?.data || response.data;
    if (data?.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser({
        ...data.user,
        tokensBalance: data.user.tokens || 0,
        tokensUsed: 0,
      });
    } else {
      throw new Error(response.data?.error || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register({ email, password, name });
    // Handle nested data format from Workers API
    const data = response.data?.data || response.data;
    if (data?.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser({
        ...data.user,
        tokensBalance: data.user.tokens || 0,
        tokensUsed: 0,
      });
    } else {
      throw new Error(response.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        login,
        register,
        logout,
        refreshUser,
      }}
    >
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
