import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "@/features/landing";
import { LoginPage } from "@/features/login";
import { StorylabPage } from "@/features/storylab";
import { FlairLabPage } from "@/features/flairlab";
import { ProductSelectionPage } from "@/pages/ProductSelectionPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <ProductSelectionPage />
            </ProtectedRoute>
          }
        />

        {/* Storylab Dashboard and nested routes - Protected */}
        <Route
          path="/storylab/*"
          element={
            <ProtectedRoute>
              <StorylabPage />
            </ProtectedRoute>
          }
        />

        {/* FlairLab Dashboard and nested routes - Protected */}
        <Route
          path="/flairlab/*"
          element={
            <ProtectedRoute>
              <FlairLabPage />
            </ProtectedRoute>
          }
        />

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
