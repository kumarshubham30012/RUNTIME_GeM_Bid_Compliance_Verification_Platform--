import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { GuestRoute, ProtectedRoute } from "./auth/ProtectedRoute.tsx";
import { BidderApplicationPage } from "./pages/BidderApplicationPage.tsx";
import { BidderDashboardPage } from "./pages/BidderDashboardPage.tsx";
import { CreateTenderPage } from "./pages/CreateTenderPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { HomeRedirect } from "./pages/HomeRedirect.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { OfficerTenderListPage } from "./pages/OfficerTenderListPage.tsx";
import { TenderDetailPage } from "./pages/TenderDetailPage.tsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/bidder"
            element={
              <ProtectedRoute role="bidder">
                <BidderDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bidder/applications/:applicationId"
            element={
              <ProtectedRoute role="bidder">
                <BidderApplicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer"
            element={
              <ProtectedRoute role="officer">
                <OfficerTenderListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/tenders/new"
            element={
              <ProtectedRoute role="officer">
                <CreateTenderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/tenders/:id"
            element={
              <ProtectedRoute role="officer">
                <TenderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <DashboardPage role="admin" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
