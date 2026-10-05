import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dna } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-dish-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe mb-4 animate-pulse">
          <Dna className="w-6 h-6 text-teal-600 dark:text-specimen-safe" />
        </div>
        <p className="font-mono text-xs text-specimen-dim uppercase tracking-wider">
          Verifying Laboratory Session Credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
