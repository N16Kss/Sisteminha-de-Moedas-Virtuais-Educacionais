import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Award, Building2, GraduationCap } from 'lucide-react'
import { loadInstitutions, registerAccount } from '../services/meritService'
import type { Role } from '../types'
import type { Institution } from '../types'

export default function Register() {
  const [role, setRole] = useState<Role>('student')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [institutionsError, setInstitutionsError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadInstitutions()
      .then(setInstitutions)
      .catch((cause) => setInstitutionsError(cause instanceof Error ? cause.message : 'Não foi possível carregar as instituições.'))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const values = new FormData(event.currentTarget)
    const password = String(values.get('password') ?? '')
    if (password !== String(values.get('confirmPassword') ?? '')) {
      setError('As senhas não conferem.')
      return
    }
    setBusy(true)
    try {
      await registerAccount({
        name: String(values.get('name') ?? ''),
        email: String(values.get('email') ?? ''),
        password,
        role,
        cpf: String(values.get('cpf') ?? ''),
        rg: String(values.get('rg') ?? ''),
        address: String(values.get('address') ?? ''),
        institution: String(values.get('institution') ?? ''),
        course: role === 'student' ? String(values.get('course') ?? '') : '',
        department: role === 'teacher' ? String(values.get('department') ?? '') : '',
        cnpj: String(values.get('cnpj') ?? ''),
        responsible: String(values.get('responsible') ?? ''),
        description: String(values.get('description') ?? ''),
      })
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar a conta.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="register-page"><div className="register-top"><button className="back-button" onClick={() => navigate('/login')}><ArrowLeft size={18}/> Voltar ao login</button><div className="login-brand"><div className="brand-mark"><Award size={22}/></div><strong>meritê</strong></div></div><div className="register-card"><span className="eyebrow">FAÇA PARTE DA COMUNIDADE</span><h1>Crie sua conta</h1><p>Escolha seu perfil e preencha seus dados para começar.</p><div className="role-selector"><button type="button" className={role==='student'?'selected':''} onClick={()=>setRole('student')}><GraduationCap size={17}/> Aluno</button><button type="button" className={role==='teacher'?'selected':''} onClick={()=>setRole('teacher')}><Award size={17}/> Professor</button><button type="button" className={role==='company'?'selected':''} onClick={()=>setRole('company')}><Building2 size={17}/> Empresa</button></div>{done ? <div className="success-panel"><Award size={28}/><h3>Cadastro realizado!</h3><p>Sua conta foi criada. Entre com seu e-mail e senha para continuar.</p><button className="primary-button" onClick={()=>navigate('/login')}>Ir para o login</button></div> : <form className="register-form" onSubmit={submit}><div className="form-grid"><label>Nome completo / razão social<input name="name" required placeholder="Como podemos te chamar?"/></label><label>E-mail<input name="email" type="email" required placeholder="seu@email.com"/></label>{role!=='company' && <><label>CPF<input name="cpf" required placeholder="000.000.000-00" maxLength={14}/></label>{role==='student' && <label>RG<input name="rg" required placeholder="Número do RG"/></label>}<label>Instituição de ensino<select name="institution" required defaultValue="" disabled={institutions.length===0}><option value="" disabled>Selecione uma instituição</option>{institutions.map((institution)=><option key={institution.id} value={institution.name}>{institution.name}</option>)}</select>{institutionsError&&<small className="field-error">{institutionsError}</small>}</label><label>{role==='student'?'Curso':'Departamento'}<input name={role==='student'?'course':'department'} required placeholder={role==='student'?'Ex.: Engenharia de Software':'Ex.: Computação'}/></label></>}{role==='student' && <label>Endereço<input name="address" required placeholder="Rua, número, cidade e CEP"/></label>}{role==='company' && <><label>CNPJ<input name="cnpj" required placeholder="00.000.000/0000-00" maxLength={18}/></label><label>Responsável pela parceria<input name="responsible" required placeholder="Nome do responsável"/></label><label>Descrição da empresa<input name="description" required placeholder="Conte um pouco sobre a empresa"/></label></>}<label>Senha<input name="password" type="password" required minLength={6} placeholder="Mínimo de 6 caracteres"/></label><label>Confirmar senha<input name="confirmPassword" type="password" required minLength={6} placeholder="Repita a senha"/></label></div><p className="register-notice">{role==='teacher'?'O cadastro de professor exige pré-cadastro da instituição parceira.':'Seus dados serão usados para criar seu acesso ao sistema.'}</p>{error && <div className="alert alert-error">{error}</div>}<button className="primary-button" type="submit" disabled={busy||(!institutions.length&&role!=='company')}>{busy?'Cadastrando...':'Enviar cadastro'} <span>→</span></button></form>}<div className="signup-note">Já tem uma conta? <Link to="/login">Entrar</Link></div></div></div>
}
