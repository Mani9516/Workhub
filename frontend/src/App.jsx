import { Box, CircularProgress, CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { workhubTheme } from "./theme.js";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AppShell from "./components/AppShell.jsx";
import EchoFab from "./components/EchoFab.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import LeavePage from "./pages/LeavePage.jsx";
import PayrollPage from "./pages/PayrollPage.jsx";
import LearningPage from "./pages/LearningPage.jsx";
import CareerPage from "./pages/CareerPage.jsx";
import WellnessPage from "./pages/WellnessPage.jsx";
import CompliancePage from "./pages/CompliancePage.jsx";
import HrPage from "./pages/HrPage.jsx";

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }} aria-busy="true">
        <CircularProgress />
      </Box>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      {children}
      <EchoFab />
    </AppShell>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PrivateRoute>
            <AttendancePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/leave"
        element={
          <PrivateRoute>
            <LeavePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <PrivateRoute>
            <PayrollPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/learning"
        element={
          <PrivateRoute>
            <LearningPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/career"
        element={
          <PrivateRoute>
            <CareerPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/wellness"
        element={
          <PrivateRoute>
            <WellnessPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/compliance"
        element={
          <PrivateRoute>
            <CompliancePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/hr"
        element={
          <PrivateRoute>
            <HrPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={workhubTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
