import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStoredAuth(); }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem("auth_token"),
        AsyncStorage.getItem("auth_user"),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to load auth", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    await Promise.all([
      AsyncStorage.setItem("auth_token", tokenValue),
      AsyncStorage.setItem("auth_user",  JSON.stringify(userData)),
    ]);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem("auth_token"),
      AsyncStorage.removeItem("auth_user"),
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
