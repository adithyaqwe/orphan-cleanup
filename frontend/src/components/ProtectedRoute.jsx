import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Authenticating operations session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(...allowedRoles)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--status-orphan)', marginBottom: '0.5rem' }}>403 Access Forbidden</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your active role ('{user.role}') is not authorized to access this operational screen. Required: [{allowedRoles.join(', ')}].
        </p>
      </div>
    );
  }

  return children;
}
