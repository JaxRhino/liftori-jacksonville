import { Navigate, Route, Routes, useParams, Link } from 'react-router-dom'
import { Loader2, ArrowLeft, Construction } from 'lucide-react'
import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { CitizenHome } from './pages/CitizenHome'
import { EmployeeDashboard } from './pages/EmployeeDashboard'
import { CasesList } from './pages/CasesList'
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
  if (role === 'super_admin') return <Navigate to="/admin" replace />
  if (role === 'city_employee') return <Navigate to="/work" replace />
  return <Navigate to="/me" replace />
}

// Placeholder for Wave B.2 — full case detail page shipping next push
function CaseDetailPlaceholder() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/work/cases" className="inline-flex items-center gap-1 text-sm text-jax-blue hover:text-jax-sky mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to all cases
      </Link>
      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-8 text-center">
        <Construction className="h-12 w-12 text-jax-blue mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-1">Case detail — Wave B.2</h2>
        <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mb-2">
          Shipping next push: split-pane case workspace with inline editing, status & priority pills, ArcGIS map, activity feed, comments, internal notes.
        </p>
        <p className="text-xs font-mono text-jax-gray-3">Case ID: {id}</p>
      </div>
    </div>
  )
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
        <Route path="/work/cases/:id" element={<RoleGate allow={['city_employee', 'super_admin']}><CaseDetailPlaceholder /></RoleGate>} />
        <Route path="/admin" element={<RoleGate allow={['super_admin']}><SuperAdminPanel /></RoleGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
