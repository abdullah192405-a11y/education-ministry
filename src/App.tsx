import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Grades from "./pages/Grades";
import GradeDetail from "./pages/GradeDetail";
import SubjectView from "./pages/SubjectView";
import TopicView from "./pages/TopicView";
import OrganizationProfile from "./pages/OrganizationProfile";
import Partners from "./pages/Partners";
import ChallengeModeSelect from "./pages/ChallengeModeSelect";
import SingleChallenge from "./pages/SingleChallenge";
import GroupChallenge from "./pages/GroupChallenge";
import JoinChallenge from "./pages/JoinChallenge";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ExamPage from "./pages/ExamPage";

// Dashboard Pages
import { StudentDashboard, AdminDashboard, ChallengeAnalytics, TeacherDashboard, DashboardRedirect, SuperadminDashboard } from "./pages/dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ClerkSSOCallback from "./components/ClerkSSOCallback";
import WhatsAppButton from "./components/layout/WhatsAppButton";
import ScrollToTop from "./components/ScrollToTop";
import { FloatingChromeProvider } from "./contexts/FloatingChromeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";

const queryClient = new QueryClient();

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { dir, language } = useLanguage();
  return (
    <div dir={dir} lang={language}>
      {children}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <FloatingChromeProvider>
            <AppShell>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />

                {/* Education Routes - Grades > Subjects > Topics */}
                <Route path="/grades" element={<Grades />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/schools" element={<Navigate to="/partners" replace />} />
                <Route path="/organizations" element={<Navigate to="/partners" replace />} />
                <Route path="/org/:orgSlug" element={<OrganizationProfile />} />
                <Route path="/grade/:gradeId" element={<GradeDetail />} />
                <Route path="/grade/:gradeId/subject/:subjectId" element={<SubjectView />} />
                <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId" element={<TopicView />} />

                {/* Challenge Routes */}
                <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId/challenge" element={<ChallengeModeSelect />} />
                <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId/challenge/single/:category/:pin" element={<SingleChallenge />} />
                <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId/challenge/single/:category" element={<SingleChallenge />} />
                <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId/challenge/group/:category/:pin" element={<GroupChallenge />} />

                {/* Join Challenge */}
                <Route path="/join" element={<JoinChallenge />} />
                <Route path="/join/:pin" element={<JoinChallenge />} />

                {/* Dashboard Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
                <Route
                  path="/dashboard/student"
                  element={
                    <ProtectedRoute allowedRoles={["STUDENT", "طالب", "ADMIN", "مسؤول"]}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/teacher"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER", "معلم", "معلمة", "ADMIN", "مسؤول"]}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute allowedRoles={["ADMIN", "مسؤول"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/superadmin"
                  element={
                    <ProtectedRoute allowedRoles={["SUPERADMIN"]}>
                      <SuperadminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/analytics/:challengeId"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER", "معلم", "معلمة", "ADMIN", "مسؤول"]}>
                      <ChallengeAnalytics />
                    </ProtectedRoute>
                  }
                />


                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/sso-callback" element={<ClerkSSOCallback />} />

                {/* Exam Route - accessible by link only */}
                <Route path="/exam/:pin" element={<ExamPage />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <WhatsAppButton />
            </AppShell>
          </FloatingChromeProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
