import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Grades from "./pages/Grades";
import GradeDetail from "./pages/GradeDetail";
import SubjectView from "./pages/SubjectView";
import TopicView from "./pages/TopicView";
import ChallengeModeSelect from "./pages/ChallengeModeSelect";
import SingleChallenge from "./pages/SingleChallenge";
import GroupChallenge from "./pages/GroupChallenge";
import JoinChallenge from "./pages/JoinChallenge";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

// Dashboard Pages
import { UserDashboard, ChannelDashboard, AdminDashboard, ChallengeAnalytics } from "./pages/dashboard";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import TeacherDashboard from "./pages/dashboard/TeacherDashboard";
import NewAdminDashboard from "./pages/dashboard/NewAdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Education Routes - Grades > Subjects > Topics */}
          <Route path="/grades" element={<Grades />} />
          <Route path="/grade/:gradeId" element={<GradeDetail />} />
          <Route path="/grade/:gradeId/subject/:subjectId" element={<SubjectView />} />
          <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId" element={<TopicView />} />

          {/* Challenge Routes */}
          <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId/challenge" element={<ChallengeModeSelect />} />
          <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId/challenge/single/:category" element={<SingleChallenge />} />
          <Route path="/grade/:gradeId/subject/:subjectId/topic/:topicId/challenge/group/:category/:pin" element={<GroupChallenge />} />

          {/* Join Challenge */}
          <Route path="/join" element={<JoinChallenge />} />
          <Route path="/join/:pin" element={<JoinChallenge />} />

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/dashboard/student" element={<StudentDashboard />} />
          <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
          <Route path="/dashboard/admin" element={<NewAdminDashboard />} />
          <Route path="/dashboard/analytics/:challengeId" element={<ChallengeAnalytics />} />


          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
