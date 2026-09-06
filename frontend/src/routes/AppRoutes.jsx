import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import DetectionCenterPage from '../pages/DetectionCenterPage';
import DependencyGraphPage from '../pages/DependencyGraphPage';
import InventoryPage from '../pages/InventoryPage';
import ResourceDetailPage from '../pages/ResourceDetailPage';
import CleanupCenterPage from '../pages/CleanupCenterPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes wrapped in MainLayout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/detection" element={<Navigate to="/dashboard" replace />} />
      <Route path="/graph" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <MainLayout>
              <InventoryPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ResourceDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cleanup"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CleanupCenterPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/audit" element={<Navigate to="/cleanup" replace />} />
      <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
      <Route path="/settings" element={<Navigate to="/dashboard" replace />} />

      {/* Default Fallback Redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
