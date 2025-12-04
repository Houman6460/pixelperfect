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
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize user from localStorage synchronously to prevent flash
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  // Start with isLoading = false since we load user synchronously
  const [isLoading, setIsLoading] = useState(false);

  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const response = await authApi.getMe();
      // Handle both direct response and nested data format
      const userData = response.data?.data?.user || response.data?.user || response.data;
      if (userData) {
        const newUser = {
          ...userData,
          tokensBalance: userData.tokens || userData.tokensBalance || 0,
          tokensUsed: userData.tokensUsed || 0,
        };
        setUser(newUser);
        localStorage.setItem("user", JSON.stringify(newUser));
      }
    } catch (error) {
      console.error("Auth refresh error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  // Refresh user data in background (non-blocking)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      refreshUser();
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await authApi.login({ email, password });
      // Handle nested data format from Workers API
      const data = response.data?.data || response.data;
      
      if (data?.token && data?.user) {
        localStorage.setItem("token", data.token);
        const loggedInUser: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || '',
          role: data.user.role || 'user',
          tokensBalance: data.user.tokens || data.user.tokensBalance || 0,
          tokensUsed: data.user.tokensUsed || 0,
          subscriptionId: data.user.subscriptionId || null,
        };
        localStorage.setItem("user", JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        return loggedInUser;
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      } else {
        throw new Error('Login failed - invalid response');
      }
    } catch (error: any) {
      // Re-throw with proper error message
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await authApi.register({ email, password, name });
      // Handle nested data format from Workers API
      const data = response.data?.data || response.data;
      
      if (data?.token && data?.user) {
        localStorage.setItem("token", data.token);
        const newUser: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || name,
          role: data.user.role || 'user',
          tokensBalance: data.user.tokens || data.user.tokensBalance || 0,
          tokensUsed: 0,
          subscriptionId: null,
        };
        localStorage.setItem("user", JSON.stringify(newUser));
        setUser(newUser);
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      } else {
        throw new Error('Registration failed - invalid response');
      }
    } catch (error: any) {
      // Re-throw with proper error message
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
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
