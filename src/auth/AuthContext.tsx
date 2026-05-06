import { createContext, useState, ReactNode } from 'react';

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

function buildUserFromToken(
  token: string,
  seed?: { firstName?: string; lastName?: string; email?: string }
): AuthUser {
  const payload = parseJwtPayload(token) ?? {};
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
    if (parsed.role === 'commissionist' && !parsed.sellerId) {
      localStorage.removeItem('authToken');
      return null;
    }
    return parsed;
  });

 
  const login = (payload: { token: string; firstName?: string; lastName?: string; email?: string }) => {
    localStorage.setItem('authToken', payload.token);
    const parsed = buildUserFromToken(payload.token, payload);
    if (parsed.role === 'commissionist' && !parsed.sellerId) {
      localStorage.removeItem('authToken');
      setUser(null);
      throw new Error('El token de comisionista no incluye sellerId.');
    }
    setUser(parsed);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isCommissionist = user?.role === 'commissionist';

  return (
    <AuthContext.Provider value={{ user, login, logout, isSuperAdmin, isCommissionist }}>
      {children}
    </AuthContext.Provider>
  );
};