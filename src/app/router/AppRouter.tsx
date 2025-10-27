import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "@/features/landing";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
