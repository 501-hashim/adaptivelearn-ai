import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  student: Student | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, student: Student) => void;
  logout: () => void;
  updateStudent: (student: Student) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adaptivelearn_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      const activeToken = localStorage.getItem('adaptivelearn_token');
      if (!activeToken) {
        setIsLoading(false);
        return;
      }
      try {
        const studentData = await api.getMe();
        setStudent(studentData);
      } catch (err) {
        console.error('Session expired or invalid:', err);
        localStorage.removeItem('adaptivelearn_token');
        setToken(null);
        setStudent(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = (newToken: string, newStudent: Student) => {
    localStorage.setItem('adaptivelearn_token', newToken);
    setToken(newToken);
    setStudent(newStudent);
  };

  const logout = () => {
    localStorage.removeItem('adaptivelearn_token');
    setToken(null);
    setStudent(null);
  };

  const updateStudent = (newStudent: Student) => {
    setStudent(newStudent);
  };

  return (
    <AuthContext.Provider value={{ student, token, isLoading, login, logout, updateStudent }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
