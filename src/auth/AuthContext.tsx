import { createContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  user: { token: string } | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ token: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) setUser({ token });
  }, []);

 
  const login = (token?: string) => {
  if (token) {
    localStorage.setItem('authToken', token);
    setUser({ token });
  } else {
    // Si no hay token, solo marca como autenticado (puedes ajustar según tu lógica)
    setUser({ token: '' });
  }
};
  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};