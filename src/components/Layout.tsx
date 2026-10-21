import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Award, ChevronDown, CircleHelp, Gift, LayoutDashboard, LogOut, Package, ShieldCheck, ArrowLeftRight, Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

const navByRole: Record<Role, { label: string; to: string; icon: typeof LayoutDashboard }[]> = {
  student: [
    { label: 'Visão geral', to: '/aluno/dashboard', icon: LayoutDashboard },
    { label: 'Vantagens', to: '/aluno/vantagens', icon: Gift },
    { label: 'Transferir moedas', to: '/aluno/transferencias', icon: ArrowLeftRight },
    { label: 'Meu extrato', to: '/aluno/extrato', icon: Wallet },
  ],
  teacher: [
    { label: 'Visão geral', to: '/professor/dashboard', icon: LayoutDashboard },
    { label: 'Reconhecer aluno', to: '/professor/reconhecer', icon: Award },
    { label: 'Aprovações', to: '/professor/aprovacoes', icon: ShieldCheck },
    { label: 'Meu extrato', to: '/professor/extrato', icon: Wallet },
  ],
  company: [
    { label: 'Visão geral', to: '/empresa/dashboard', icon: LayoutDashboard },
    { label: 'Minhas vantagens', to: '/empresa/vantagens', icon: Package },
    { label: 'Validar cupom', to: '/empresa/cupons', icon: ShieldCheck },
    { label: 'Histórico', to: '/empresa/extrato', icon: Wallet },
  ],
}
const roleLabels = { student: 'Aluno', teacher: 'Professor', company: 'Empresa parceira' }

export default function Layout() {
  const { user, signOut } = useApp()
  const navigate = useNavigate()
  if (!user) return null
  const nav = navByRole[user.role]
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Award size={23}/></div><div><strong>meritê</strong><small>MÉRITO QUE TRANSFORMA</small></div></div>
      <div className="workspace-label">ESPAÇO DE TRABALHO</div>
      <div className="profile-mini"><div className="avatar">{user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div><div className="profile-mini-copy"><strong>{user.name}</strong><span>{roleLabels[user.role]}</span></div><ChevronDown size={15}/></div>
      <nav className="side-nav">
        <span className="nav-caption">MENU PRINCIPAL</span>
        {nav.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18}/><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><strong>Precisa de ajuda?</strong><p>Estamos aqui para você.</p><button onClick={() => window.alert('Central de ajuda: suporte@merite.edu.br')}>Acessar suporte <span>↗</span></button></div>
        <button className="nav-link logout" onClick={async () => { try { await signOut(); navigate('/login') } catch (error) { window.alert(error instanceof Error ? error.message : 'Não foi possível encerrar a sessão no servidor.') } }}><LogOut size={18}/><span>Sair da conta</span></button>
        <div className="sidebar-footer">© 2026 Meritê · Feito para reconhecer.</div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Meritê <span>/</span> <strong>{roleLabels[user.role]}</strong></div><div className="topbar-actions"><span className="semester-pill"><span/> {new Date().getFullYear()} · {new Date().getMonth() < 6 ? '1º' : '2º'} semestre</span><div className="topbar-user"><div className="avatar avatar-small">{user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div><div><strong>{user.name}</strong><span>{roleLabels[user.role]}</span></div></div></div></header>
      <div className="page-content"><Outlet/></div>
    </main>
  </div>
}
