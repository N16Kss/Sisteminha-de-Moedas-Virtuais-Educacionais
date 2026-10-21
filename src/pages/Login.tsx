import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Award, Eye, EyeOff, GraduationCap, Building2, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'
import { loadPublicStatistics, type PublicStatistics } from '../services/meritService'

export default function Login() {
  const { signIn } = useApp()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [statistics, setStatistics] = useState<PublicStatistics | null>(null)
  const [statisticsError, setStatisticsError] = useState(false)
  useEffect(() => {
    loadPublicStatistics().then(setStatistics).catch(() => setStatisticsError(true))
  }, [])
  const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      await signIn(email, password, role)
      navigate(role === 'student' ? '/aluno/dashboard' : role === 'teacher' ? '/professor/dashboard' : '/empresa/dashboard')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar.') }
    finally { setBusy(false) }
  }
  return <div className="login-page">
    <section className="login-showcase">
      <div className="login-brand"><div className="brand-mark"><Award size={24}/></div><strong>meritê</strong></div>
      <div className="showcase-content"><span className="eyebrow light"><Sparkles size={14}/> RECONHECIMENTO QUE INSPIRA</span><h1>Seu esforço merece<br/>ser <em>reconhecido.</em></h1><p>Uma comunidade que transforma atitudes positivas em oportunidades reais.</p>
        <div className="showcase-stats"><div><strong>{statistics ? `+${compact.format(statistics.recognizedStudents)}` : '—'}</strong><span>alunos reconhecidos</span></div><div><strong>{statistics ? compact.format(statistics.distributedCoins) : '—'}</strong><span>moedas distribuídas</span></div></div>{statisticsError && <small className="showcase-stat-error">Estatísticas temporariamente indisponíveis.</small>}
      </div>
      <div className="showcase-quote"><div className="quote-symbol">“</div><p>Pequenas atitudes constroem grandes futuros. Cada reconhecimento faz a diferença.</p><span>COMUNIDADE MERITÊ</span></div>
      <div className="showcase-orb orb-one"/><div className="showcase-orb orb-two"/>
    </section>
    <section className="login-form-side"><div className="login-form-wrap"><div className="mobile-brand"><div className="brand-mark"><Award size={22}/></div><strong>meritê</strong></div><span className="eyebrow">BEM-VINDO DE VOLTA</span><h2>Entre na sua conta</h2><p className="form-intro">Acesse seu espaço e continue sua jornada.</p>
      <div className="role-selector"><button className={role === 'student' ? 'selected' : ''} onClick={() => setRole('student')}><GraduationCap size={17}/> Aluno</button><button className={role === 'teacher' ? 'selected' : ''} onClick={() => setRole('teacher')}><Award size={17}/> Professor</button><button className={role === 'company' ? 'selected' : ''} onClick={() => setRole('company')}><Building2 size={17}/> Empresa</button></div>
      <form onSubmit={submit} className="login-form"><label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required/></label><label>Senha<div className="password-wrap"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required minLength={6}/><button type="button" aria-label="Mostrar senha" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>{error && <div className="alert alert-error">{error}</div>}<button className="primary-button login-submit" disabled={busy}>{busy ? 'Entrando...' : 'Entrar na plataforma'} <ArrowRight size={18}/></button></form>
      <div className="signup-note">Ainda não faz parte? <button onClick={() => navigate('/cadastro')}>Criar uma conta</button></div>
    </div></section>
  </div>
}
