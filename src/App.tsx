import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { CitizenHome } from './pages/CitizenHome'
import { EmployeeDashboard } from './pages/EmployeeDashboard'
import { CasesList } from './pages/CasesList'
import { CaseDetail } from './pages/CaseDetail'
import { ChatPage } from './pages/ChatPage'
import { SuperAdminPanel } from './pages/SuperAdminPanel'
import { PublicLanding } from './pages/PublicLanding'
import { Layout } from './components/Layout'

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
        <Route path="/me" element={<RoleGate allow={['citizen', 'city_employee', 'super_admin']}><CitizenHome /></RoleGate>} />
        <Route path="/work" element={<RoleGate allow={['city_employee', 'super_admin']}><EmployeeDashboard /></RoleGate>} />
        <Route path="/work/cases" element={<RoleGate allow={['city_employee', 'super_admin']}><CasesList /></RoleGate>} />
        <Route path="/work/chat" element={<RoleGate allow={['city_employee', 'super_admin']}><ChatPage /></RoleGate>} />
        <Route path="/work/cases/:id" element={<RoleGate allow={['city_employee', 'super_admin']}><CaseDetail /></RoleGate>} />
        <Route path="/admin" element={<RoleGate allow={['super_admin']}><SuperAdminPanel /></RoleGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
