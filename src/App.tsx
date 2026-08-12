import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { LangProvider } from "@/contexts/LangContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WorkspaceGate } from "@/components/WorkspaceGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineIndicator, AppUpdateNotification } from "@/components/OfflineIndicator";
import { ShortcutsProvider } from "@/components/ShortcutsProvider";
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
import Teams from "./pages/Teams";
import Templates from "./pages/Templates";
import Workload from "./pages/Workload";
import Insights from "./pages/Insights";
import Roadmap from "./pages/Roadmap";
import Admin from "./pages/Admin";
import Import from "./pages/Import";
import WorkflowStates from "./pages/WorkflowStates";
import Timesheet from "./pages/Timesheet";
import CustomFields from "./pages/CustomFields";
import Docs from "./pages/Docs";
import Chat from "./pages/Chat";
import Automations from "./pages/Automations";
import Forms from "./pages/Forms";
import PublicForm from "./pages/PublicForm";
import Whiteboards from "./pages/Whiteboards";
import ServiceDesk from "./pages/ServiceDesk";
import PublicSupport from "./pages/PublicSupport";
import Portfolios from "./pages/Portfolios";
import MeetingNotes from "./pages/MeetingNotes";
import AuditLog from "./pages/AuditLog";
import SavedViews from "./pages/SavedViews";
import ApiTokens from "./pages/ApiTokens";
import ClientPortals from "./pages/ClientPortals";
import PublicPortal from "./pages/PublicPortal";
import NotificationSettings from "./pages/NotificationSettings";
import Notifications from "./pages/Notifications";
import Pricing from "./pages/Pricing";
import Compare from "./pages/Compare";
import Security from "./pages/Security";
import Changelog from "./pages/Changelog";
import AgentRuns from "./pages/AgentRuns";
import Leaderboard from "./pages/Leaderboard";
import Crm from "./pages/Crm";
import Finance from "./pages/Finance";
import Goals from "./pages/Goals";
import Risks from "./pages/Risks";
import Decisions from "./pages/Decisions";
import DecisionDetail from "./pages/DecisionDetail";
import Product from "./pages/Product";
import Company from "./pages/Company";
import Integrations from "./pages/Integrations";
import PublicDashboard from "./pages/PublicDashboard";
import CompareNotion from "./pages/compare/CompareNotion";
import CompareAsana from "./pages/compare/CompareAsana";
import CompareLinear from "./pages/compare/CompareLinear";
import CompareMonday from "./pages/compare/CompareMonday";
import SparkHQ from "./pages/SparkHQ";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <OfflineIndicator />
        <AppUpdateNotification />
        <BrowserRouter>
          <AuthProvider>
            <WorkspaceProvider>
              <LangProvider>
              <ShortcutsProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/" element={<Index />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/compare/notion" element={<CompareNotion />} />
                <Route path="/compare/asana" element={<CompareAsana />} />
                <Route path="/compare/linear" element={<CompareLinear />} />
                <Route path="/compare/monday" element={<CompareMonday />} />
                <Route path="/security" element={<Security />} />
                <Route path="/changelog" element={<Changelog />} />

                {/* Protected routes */}
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
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
                <Route path="/teams" element={<ProtectedRoute><WorkspaceGate><Teams /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/templates" element={<ProtectedRoute><WorkspaceGate><Templates /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/workload" element={<ProtectedRoute><WorkspaceGate><Workload /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/insights" element={<ProtectedRoute><WorkspaceGate><Insights /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/roadmap" element={<ProtectedRoute><WorkspaceGate><Roadmap /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><WorkspaceGate><Admin /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/import" element={<ProtectedRoute><WorkspaceGate><Import /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/workflow-states" element={<ProtectedRoute><WorkspaceGate><WorkflowStates /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/timesheet" element={<ProtectedRoute><WorkspaceGate><Timesheet /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/custom-fields" element={<ProtectedRoute><WorkspaceGate><CustomFields /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/docs" element={<ProtectedRoute><WorkspaceGate><Docs /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/docs/:id" element={<ProtectedRoute><WorkspaceGate><Docs /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><WorkspaceGate><Chat /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/chat/:channelId" element={<ProtectedRoute><WorkspaceGate><Chat /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/automations" element={<ProtectedRoute><WorkspaceGate><Automations /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/forms" element={<ProtectedRoute><WorkspaceGate><Forms /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/f/:slug" element={<PublicForm />} />
                <Route path="/whiteboards" element={<ProtectedRoute><WorkspaceGate><Whiteboards /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/whiteboards/:id" element={<ProtectedRoute><WorkspaceGate><Whiteboards /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/desk" element={<ProtectedRoute><WorkspaceGate><ServiceDesk /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/desk/:id" element={<ProtectedRoute><WorkspaceGate><ServiceDesk /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/support/:workspaceId" element={<PublicSupport />} />
                <Route path="/portfolios" element={<ProtectedRoute><WorkspaceGate><Portfolios /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/portfolios/:id" element={<ProtectedRoute><WorkspaceGate><Portfolios /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/meetings" element={<ProtectedRoute><WorkspaceGate><MeetingNotes /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/meetings/:id" element={<ProtectedRoute><WorkspaceGate><MeetingNotes /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute><WorkspaceGate><AuditLog /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/views" element={<ProtectedRoute><WorkspaceGate><SavedViews /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/api-tokens" element={<ProtectedRoute><WorkspaceGate><ApiTokens /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/portals" element={<ProtectedRoute><WorkspaceGate><ClientPortals /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/portal/:token" element={<PublicPortal />} />
                <Route path="/pub/:token" element={<PublicDashboard />} />
                <Route path="/notifications" element={<ProtectedRoute><WorkspaceGate><Notifications /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/notification-settings" element={<ProtectedRoute><WorkspaceGate><NotificationSettings /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/agent" element={<ProtectedRoute><WorkspaceGate><AgentRuns /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><WorkspaceGate><Leaderboard /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><WorkspaceGate><Crm /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/finance" element={<ProtectedRoute><WorkspaceGate><Finance /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/goals" element={<ProtectedRoute><WorkspaceGate><Goals /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/risks" element={<ProtectedRoute><WorkspaceGate><Risks /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/decisions" element={<ProtectedRoute><WorkspaceGate><Decisions /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/decisions/:id" element={<ProtectedRoute><WorkspaceGate><DecisionDetail /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/product" element={<ProtectedRoute><WorkspaceGate><Product /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/company" element={<ProtectedRoute><WorkspaceGate><Company /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/spark-hq" element={<ProtectedRoute><WorkspaceGate><SparkHQ /></WorkspaceGate></ProtectedRoute>} />

                <Route path="/workspace/settings" element={<ProtectedRoute><WorkspaceGate><WorkspaceSettings /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/integrations" element={<ProtectedRoute><WorkspaceGate><Integrations /></WorkspaceGate></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><WorkspaceGate><Settings /></WorkspaceGate></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
              </ShortcutsProvider>
              </LangProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
