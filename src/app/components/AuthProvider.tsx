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
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isBackendConnected: boolean;
  isCheckingBackend: boolean;
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
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);

  useEffect(() => {
    // Don't restore user session on page refresh - always require fresh login
    // This ensures users are logged out when they close and reopen the website
  }, []);

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  };

  const waitForBackendConnection = async (): Promise<void> => {
    setIsCheckingBackend(true);
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
      const isHealthy = await checkBackendHealth();
      if (isHealthy) {
        setIsBackendConnected(true);
        setIsCheckingBackend(false);
        return;
      }
      
      attempts++;
      console.log(`Backend connection attempt ${attempts}/${maxAttempts} failed, retrying in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsCheckingBackend(false);
    throw new Error('Backend connection timeout after 30 seconds');
  };

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    // First, ensure backend is connected
    if (!isBackendConnected) {
      try {
        await waitForBackendConnection();
      } catch (error) {
        console.error('Failed to connect to backend:', error);
        return false;
      }
    }
    
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
    isAuthenticated: !!user,
    isBackendConnected,
    isCheckingBackend
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}