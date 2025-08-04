'use client';
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (usernameOrEmail: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user database
const USERS = [
  {
    username: process.env.NEXT_PUBLIC_USERNAME,
    password: process.env.NEXT_PUBLIC_PASSWORD,
    email: process.env.NEXT_PUBLIC_EMAIL,
    role: 'admin' as const
  },
  {
    username: process.env.NEXT_PUBLIC_USERNAME2,
    password: process.env.NEXT_PUBLIC_PASSWORD2,
    email: process.env.NEXT_PUBLIC_EMAIL2,
    role: 'user' as const
  }
];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Don't restore user session on page refresh - always require fresh login
    // This ensures users are logged out when they close and reopen the website
  }, []);

  const login = (usernameOrEmail: string, password: string): boolean => {
    const foundUser = USERS.find(
      u => (u.username === usernameOrEmail || u.email === usernameOrEmail) && u.password === password
    );
    
    if (foundUser && foundUser.username && foundUser.email && foundUser.password) {
      const userWithoutPassword = {
        username: foundUser.username,
        password: foundUser.password,
        email: foundUser.email,
        role: foundUser.role
      };
      setUser(userWithoutPassword);
      // Don't save to localStorage - session only lasts for current browser session
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    // No need to remove from localStorage since we don't save there
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}