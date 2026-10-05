import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ExperimentProvider } from './context/ExperimentContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LabHeader } from './components/LabHeader';
import { EvolutionWizard } from './components/wizard/EvolutionWizard';
import { LineageTreeVisualizer } from './components/LineageTreeVisualizer';
import { MutatorWorkbench } from './components/MutatorWorkbench';
import { BattleArena } from './components/BattleArena';
import { ExecutiveAuditReport } from './components/ExecutiveAuditReport';
import { SpecimenSlideModal } from './components/SpecimenSlideModal';
import { ProfileHistoryPage } from './pages/ProfileHistoryPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

function LabLayout({ children }) {
  return (
    <div className="min-h-screen bg-dish-bg text-specimen-text flex flex-col selection:bg-specimen-safe/30 selection:text-specimen-text">
      <LabHeader />
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
      <SpecimenSlideModal />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ExperimentProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* 1. Evolution Wizard */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <LabLayout>
                      <EvolutionWizard />
                    </LabLayout>
                  </ProtectedRoute>
                }
              />

              {/* 2. Lineage Tree Visualizer */}
              <Route
                path="/lineage"
                element={
                  <ProtectedRoute>
                    <LabLayout>
                      <LineageTreeVisualizer />
                    </LabLayout>
                  </ProtectedRoute>
                }
              />

              {/* 3. Mutator Workbench */}
              <Route
                path="/workbench"
                element={
                  <ProtectedRoute>
                    <LabLayout>
                      <MutatorWorkbench />
                    </LabLayout>
                  </ProtectedRoute>
                }
              />

              {/* 4. Multi-Model Battle Arena */}
              <Route
                path="/arena"
                element={
                  <ProtectedRoute>
                    <LabLayout>
                      <BattleArena />
                    </LabLayout>
                  </ProtectedRoute>
                }
              />

              {/* 5. Executive Safety Audit Report */}
              <Route
                path="/report"
                element={
                  <ProtectedRoute>
                    <LabLayout>
                      <ExecutiveAuditReport />
                    </LabLayout>
                  </ProtectedRoute>
                }
              />

              {/* Protected User Profile & History Route */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <LabLayout>
                      <ProfileHistoryPage />
                    </LabLayout>
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ExperimentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
