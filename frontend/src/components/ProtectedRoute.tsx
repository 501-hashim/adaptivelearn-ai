import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Verifying student session...</span>
      </div>
    );
  }

  if (!student) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
