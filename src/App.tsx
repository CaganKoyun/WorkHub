import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WorkspaceGate } from "@/components/WorkspaceGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Onboarding from "./pages/Onboarding";
import AcceptInvite from "./pages/AcceptInvite";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import FounderHome from "./pages/FounderHome";
import FounderInbox from "./pages/FounderInbox";
import BugCreate from "./pages/BugCreate";
import BugDetail from "./pages/BugDetail";
import BugList from "./pages/BugList";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Assets from "./pages/Assets";
import AssetNew from "./pages/AssetNew";
import AssetDetail from "./pages/AssetDetail";
import AssetEdit from "./pages/AssetEdit";
import Employees from "./pages/Employees";
import AiChat from "./pages/AiChat";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectEdit from "./pages/ProjectEdit";
import Tasks from "./pages/Tasks";
import Issues from "./pages/Issues";
import Cycles from "./pages/Cycles";
import Crm from "./pages/Crm";
import Finance from "./pages/Finance";
import Goals from "./pages/Goals";
import Risks from "./pages/Risks";
import Decisions from "./pages/Decisions";
import DecisionDetail from "./pages/DecisionDetail";
import Product from "./pages/Product";
import Company from "./pages/Company";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <WorkspaceProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<ProtectedRoute><WorkspaceGate><Dashboard /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/home" element={<ProtectedRoute><WorkspaceGate><FounderHome /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/inbox" element={<ProtectedRoute><WorkspaceGate><FounderInbox /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/bugs" element={<ProtectedRoute><WorkspaceGate><BugList /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/bugs/new" element={<ProtectedRoute><WorkspaceGate><BugCreate /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/bugs/:id" element={<ProtectedRoute><WorkspaceGate><BugDetail /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><WorkspaceGate><Analytics /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/assets" element={<ProtectedRoute><WorkspaceGate><Assets /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/assets/new" element={<ProtectedRoute><WorkspaceGate><AssetNew /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/assets/:assetId" element={<ProtectedRoute><WorkspaceGate><AssetDetail /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/assets/:assetId/edit" element={<ProtectedRoute><WorkspaceGate><AssetEdit /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute><WorkspaceGate><Employees /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/ai-chat" element={<ProtectedRoute><WorkspaceGate><AiChat /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><WorkspaceGate><Projects /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/projects/new" element={<ProtectedRoute><WorkspaceGate><ProjectNew /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><WorkspaceGate><ProjectDetail /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/projects/:id/edit" element={<ProtectedRoute><WorkspaceGate><ProjectEdit /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><WorkspaceGate><Tasks /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/issues" element={<ProtectedRoute><WorkspaceGate><Issues /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/cycles" element={<ProtectedRoute><WorkspaceGate><Cycles /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><WorkspaceGate><Crm /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/finance" element={<ProtectedRoute><WorkspaceGate><Finance /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/goals" element={<ProtectedRoute><WorkspaceGate><Goals /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/risks" element={<ProtectedRoute><WorkspaceGate><Risks /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/decisions" element={<ProtectedRoute><WorkspaceGate><Decisions /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/decisions/:id" element={<ProtectedRoute><WorkspaceGate><DecisionDetail /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/product" element={<ProtectedRoute><WorkspaceGate><Product /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/company" element={<ProtectedRoute><WorkspaceGate><Company /></WorkspaceGate></ProtectedRoute>} />

                <Route path="/workspace/settings" element={<ProtectedRoute><WorkspaceGate><WorkspaceSettings /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/integrations" element={<ProtectedRoute><WorkspaceGate><Integrations /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><WorkspaceGate><Settings /></WorkspaceGate></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </WorkspaceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
