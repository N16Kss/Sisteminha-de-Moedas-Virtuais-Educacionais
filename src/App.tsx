import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { BenefitsPage, TransactionsPage, TransfersPage } from './pages/Student'
import { ApprovalsPage, AwardStudentPage } from './pages/Teacher'
import { CompanyBenefitsPage, CompanyHistoryPage, CouponsPage } from './pages/Company'
import { useApp } from './context/AppContext'
import type { Role } from './types'

function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, sessionLoading } = useApp()
  const location = useLocation()
  if (sessionLoading) return <div className="session-loading">Carregando sessão...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to={user.role === 'student' ? '/aluno/dashboard' : user.role === 'teacher' ? '/professor/dashboard' : '/empresa/dashboard'} replace />
  return <>{children}</>
}
export default function App() {
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/cadastro" element={<Register/>}/>
    <Route path="/" element={<HomeRedirect/>}/>
    <Route path="/aluno" element={<RequireRole role="student"><Layout/></RequireRole>}>
      <Route path="dashboard" element={<Dashboard/>}/>
      <Route path="vantagens" element={<BenefitsPage/>}/>
      <Route path="transferencias" element={<TransfersPage/>}/>
      <Route path="extrato" element={<TransactionsPage/>}/>
    </Route>
    <Route path="/professor" element={<RequireRole role="teacher"><Layout/></RequireRole>}>
      <Route path="dashboard" element={<Dashboard/>}/>
      <Route path="reconhecer" element={<AwardStudentPage/>}/>
      <Route path="aprovacoes" element={<ApprovalsPage/>}/>
      <Route path="extrato" element={<TransactionsPage/>}/>
    </Route>
    <Route path="/empresa" element={<RequireRole role="company"><Layout/></RequireRole>}>
      <Route path="dashboard" element={<Dashboard/>}/>
      <Route path="vantagens" element={<CompanyBenefitsPage/>}/>
      <Route path="cupons" element={<CouponsPage/>}/>
      <Route path="extrato" element={<CompanyHistoryPage/>}/>
    </Route>
    <Route path="*" element={<HomeRedirect/>}/>
  </Routes>
}
function HomeRedirect() {
  const { user, sessionLoading } = useApp()
  if (sessionLoading) return <div className="session-loading">Carregando sessão...</div>
  return <Navigate to={!user?'/login':user.role==='student'?'/aluno/dashboard':user.role==='teacher'?'/professor/dashboard':'/empresa/dashboard'} replace/>
}
