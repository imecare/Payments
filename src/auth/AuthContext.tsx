import { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

type AppRole = 'super_admin' | 'commissionist' | 'unknown';

interface AuthUser {
  token: string;
  role: AppRole;
  sellerId: number | null;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (payload: { token: string; firstName?: string; lastName?: string; email?: string }) => void;
  logout: () => void;
  isSuperAdmin: boolean;
  isCommissionist: boolean;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readStringClaim(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      const first = value[0].trim();
      if (first) return first;
    }
  }
  return undefined;
}

function readNumberClaim(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

function normalizeRole(rawRole?: string): AppRole {
  const value = (rawRole ?? '').toLowerCase().trim();
  if (value === 'superadmin' || value === 'super_admin' || value === 'admin') return 'super_admin';
  if (value === 'commissionist' || value === 'seller' || value === 'vendedor') {
    return 'commissionist';
  }
  return 'unknown';
}

function buildDisplayName(firstName?: string, lastName?: string): string | undefined {
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return fullName || undefined;
}

/** Returns null if token is expired or invalid */
function buildUserFromToken(
  token: string,
  seed?: { firstName?: string; lastName?: string; email?: string }
): AuthUser | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  // Validate expiry — exp is Unix seconds
  const exp = typeof payload['exp'] === 'number' ? payload['exp'] : null;
  if (exp !== null && exp * 1000 < Date.now()) return null;

  const role = normalizeRole(
    readStringClaim(payload, [
      'Role',
      'role',
      'roles',
      'userRole',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
    ])
  );

  const firstName =
    readStringClaim(payload, ['firstName', 'FirstName', 'given_name', 'name']) ?? seed?.firstName;
  const lastName = readStringClaim(payload, ['lastName', 'LastName', 'family_name']) ?? seed?.lastName;

  return {
    token,
    role,
    sellerId: readNumberClaim(payload, ['sellerId', 'SellerId', 'seller_id', 'subSellerId']),
    email: readStringClaim(payload, ['email', 'unique_name']) ?? seed?.email,
    firstName,
    lastName,
    displayName: buildDisplayName(firstName, lastName) ?? readStringClaim(payload, ['name', 'given_name']),
  };
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {
    // no-op default for context initialization
  },
  logout: () => {},
  isSuperAdmin: false,
  isCommissionist: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const parsed = buildUserFromToken(token);
    if (!parsed) { localStorage.removeItem('authToken'); return null; }
    if (parsed.role === 'commissionist' && !parsed.sellerId) {
      localStorage.removeItem('authToken');
      return null;
    }
    return parsed;
  });

 
  const login = (payload: { token: string; firstName?: string; lastName?: string; email?: string }) => {
    localStorage.setItem('authToken', payload.token);
    const parsed = buildUserFromToken(payload.token, payload);
    if (!parsed) {
      localStorage.removeItem('authToken');
      throw new Error('Token inválido o expirado.');
    }
    if (parsed.role === 'commissionist' && !parsed.sellerId) {
      localStorage.removeItem('authToken');
      setUser(null);
      throw new Error('El token de comisionista no incluye sellerId.');
    }
    setUser(parsed);
  };

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Stable ref to logout so the event listener always calls the latest version
  const logoutRef = useRef<() => void>(() => {});

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  // Keep ref in sync
  logoutRef.current = logout;

  // Listen for 401 events dispatched by axiosClient interceptor
  useEffect(() => {
    const handler = () => logoutRef.current();
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const isCommissionist = user?.role === 'commissionist';

  return (
    <AuthContext.Provider value={{ user, login, logout, isSuperAdmin, isCommissionist }}>
      {children}
    </AuthContext.Provider>
  );
};

/** Use instead of useContext(AuthContext) directly */
export const useAuth = () => useContext(AuthContext);