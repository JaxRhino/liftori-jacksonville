import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { CitizenHome } from './pages/CitizenHome'
import { CitizenIntake } from './pages/CitizenIntake'
import { CitizenBills } from './pages/CitizenBills'
import { BillSettings } from './pages/BillSettings'
import { EmployeeDashboard } from './pages/EmployeeDashboard'
import { CasesList } from './pages/CasesList'
import { CaseDetail } from './pages/CaseDetail'
import { ChatPage } from './pages/ChatPage'
import { CalendarPage } from './pages/workspace/CalendarPage'
import { NotesPage } from './pages/workspace/NotesPage'
import { TasksPage } from './pages/workspace/TasksPage'
import { EmailPage } from './pages/workspace/EmailPage'
import { MeetPage } from './pages/workspace/MeetPage'
import { KnowledgePage } from './pages/workspace/KnowledgePage'
import { FinancePage } from './pages/workspace/FinancePage'
import { SuperAdminPanel } from './pages/SuperAdminPanel'
import { PublicLanding } from './pages/PublicLanding'
import { Transparency } from './pages/Transparency'
import { MeetInvite } from './pages/MeetInvite'
import { Layout } from './components/Layout'
import { WorkspaceLayout } from './components/WorkspaceLayout'

function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-jax-blue" />
    </div>
  )
}

function RoleGate({ allow, children }: { allow: Array<'super_admin' | 'city_employee' | 'citizen'>, children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (!role || !allow.includes(role)) return <Navigate to="/" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <PublicLanding />
  if (role === 'super_admin') return <Navigate to="/work" replace />
  if (role === 'city_employee') return <Navigate to="/work" replace />
  return <Navigate to="/me" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/transparency" element={<Transparency />} />
        <Route path="/meet/:token" element={<MeetInvite />} />
        <Route path="/me" element={<RoleGate allow={['citizen', 'city_employee', 'super_admin']}><CitizenHome /></RoleGate>} />
        <Route path="/me/intake" element={<RoleGate allow={['citizen', 'city_employee', 'super_admin']}><CitizenIntake /></RoleGate>} />
        <Route path="/me/bills"  element={<RoleGate allow={['citizen', 'city_employee', 'super_admin']}><CitizenBills /></RoleGate>} />
        <Route path="/me/bills/settings" element={<RoleGate allow={['citizen', 'city_employee', 'super_admin']}><BillSettings /></RoleGate>} />
        <Route element={<RoleGate allow={['city_employee', 'super_admin']}><WorkspaceLayout /></RoleGate>}>
          <Route path="/work" element={<EmployeeDashboard />} />
          <Route path="/work/cases" element={<CasesList />} />
          <Route path="/work/cases/:id" element={<CaseDetail />} />
          <Route path="/work/chat" element={<ChatPage />} />
          <Route path="/work/calendar" element={<CalendarPage />} />
          <Route path="/work/notes" element={<NotesPage />} />
          <Route path="/work/tasks" element={<TasksPage />} />
          <Route path="/work/email" element={<EmailPage />} />
          <Route path="/work/meet" element={<MeetPage />} />
          <Route path="/work/knowledge" element={<KnowledgePage />} />
          <Route path="/work/finance"   element={<FinancePage />} />
        </Route>
        <Route path="/admin" element={<RoleGate allow={['super_admin']}><SuperAdminPanel /></RoleGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
