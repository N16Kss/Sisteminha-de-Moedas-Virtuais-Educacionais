import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Coins, Gift, Package, Plus, Search, ShieldCheck, TicketCheck, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  createBenefit, loadCompanyBenefits, loadCompanyRedemptions, validateCoupon,
} from '../services/meritService'
import type { Benefit, CompanyRedemption } from '../types'

const fmt = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

export function CompanyBenefitsPage() {
  const { user } = useApp()
  const [items, setItems] = useState<Benefit[]>([])
  const [redemptions, setRedemptions] = useState<CompanyRedemption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [benefits, companyRedemptions] = await Promise.all([
      loadCompanyBenefits(), loadCompanyRedemptions(),
    ])
    setItems(benefits)
    setRedemptions(companyRedemptions)
  }

  useEffect(() => {
    refresh().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados da empresa.')
    }).finally(() => setLoading(false))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!user) return
    try {
      await createBenefit({
        title, description, cost: Number(cost), category, image, company: user.name,
      })
      await refresh()
      setTitle('')
      setDescription('')
      setCost('')
      setCategory('')
      setImage('')
      setShowForm(false)
      setMessage('Vantagem cadastrada e publicada no catálogo.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar a vantagem.')
    }
  }

  const filtered = items.filter((benefit) =>
    `${benefit.title} ${benefit.category}`.toLowerCase().includes(query.toLowerCase()))
  const usedCoupons = redemptions.filter((redemption) => redemption.used).length
  const useRate = redemptions.length ? Math.round((usedCoupons / redemptions.length) * 100) : 0

  return <div className="page-stack">
    <div className="page-title-row"><div><span className="eyebrow">SUA MARCA, MAIS PERTO DOS ALUNOS</span><h1>Minhas vantagens</h1><p>Crie experiências e benefícios para a comunidade acadêmica.</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={17}/> Nova vantagem</button></div>
    {error && <div className="alert alert-error">{error}</div>}
    {message && <div className="alert alert-success">{message}</div>}
    <div className="stats-grid company-stats"><div className="stat-card"><div className="stat-top"><span>Vantagens ativas</span><div className="stat-icon stat-purple"><Gift size={18}/></div></div><strong>{items.filter((item) => item.active).length}</strong><div className="stat-foot">Disponíveis no catálogo</div></div><div className="stat-card"><div className="stat-top"><span>Cupons resgatados</span><div className="stat-icon stat-yellow"><TicketCheck size={18}/></div></div><strong>{redemptions.length}</strong><div className="stat-foot">Resgates registrados pelo sistema</div></div><div className="stat-card"><div className="stat-top"><span>Taxa de utilização</span><div className="stat-icon stat-green"><CheckCircle2 size={18}/></div></div><strong>{useRate}%</strong><div className="stat-foot">{usedCoupons} cupons validados</div></div></div>
    {showForm && <form className="content-card benefit-form" onSubmit={submit}><div className="card-heading"><div><h2>Cadastrar nova vantagem</h2><p>Descreva com clareza o benefício que sua empresa oferece.</p></div><button type="button" className="icon-button" onClick={() => setShowForm(false)}><X size={18}/></button></div><div className="form-grid"><label>Nome da vantagem<input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Ex.: Combo especial do campus"/></label><label>Empresa parceira<input value={user?.name ?? ''} readOnly/></label><label>Categoria<input value={category} onChange={(event) => setCategory(event.target.value)} required placeholder="Ex.: Alimentação"/></label><label>Custo em moedas<div className="amount-input"><Coins size={18}/><input type="number" min="1" required value={cost} onChange={(event) => setCost(event.target.value)}/><span>moedas</span></div></label><label className="span-two">Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} required rows={3} placeholder="O que o aluno receberá ao resgatar esta vantagem?"/></label><label className="span-two">URL da foto do produto<input value={image} onChange={(event) => setImage(event.target.value)} type="url" required placeholder="https://..."/><small>Informe uma imagem pública acessível por URL.</small></label></div>{error && <div className="alert alert-error">{error}</div>}<button className="primary-button" type="submit">Salvar vantagem <Plus size={17}/></button></form>}
    <div className="catalog-toolbar"><div className="search-box"><Search size={17}/><input value={query} placeholder="Buscar minhas vantagens..." onChange={(event) => setQuery(event.target.value)}/></div><span className="muted-copy">{filtered.length} vantagens cadastradas</span></div>
    <div className="benefit-grid">{filtered.map((benefit) => <article className="benefit-card" key={benefit.id}><div className="benefit-image"><img src={benefit.image} alt={benefit.title}/><span>{benefit.category}</span></div><div className="benefit-body"><span className="benefit-company">{benefit.company}</span><h3>{benefit.title}</h3><p>{benefit.description}</p><div className="benefit-bottom"><div><strong><Coins size={17}/>{fmt(benefit.cost)}</strong><span>moedas</span></div><span className={`status-pill ${benefit.active ? 'approved' : 'rejected'}`}>{benefit.active ? 'Ativa' : 'Inativa'}</span></div></div></article>)}</div>
    {!loading && filtered.length === 0 && <div className="empty-state">Você ainda não cadastrou vantagens.</div>}
  </div>
}

export function CouponsPage() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [detail, setDetail] = useState('')
  const [valid, setValid] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setDetail('')
    setValid(null)
    try {
      const result = await validateCoupon(code)
      setValid(result.valid)
      setMessage(result.message)
      if (result.valid) setDetail(`${result.benefit ?? ''}${result.student ? ` · ${result.student}` : ''}`)
    } catch (cause) {
      setValid(false)
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível validar o cupom.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">CONFERÊNCIA PRESENCIAL</span><h1>Validar cupom</h1><p>Confirme o código informado pelo aluno no momento da troca.</p></div><div className="balance-chip"><ShieldCheck size={18}/><div><strong>Validação</strong><span>de resgates</span></div></div></div><div className="coupon-page-layout"><section className="content-card coupon-validate-card"><div className="coupon-icon-large"><TicketCheck size={30}/></div><h2>Conferir um resgate</h2><p>O cupom será consultado e marcado como utilizado no sistema.</p><form onSubmit={submit}><label>Código do cupom<div className="coupon-input"><TicketCheck size={18}/><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required placeholder="MR-XXXX-XXXX"/></div></label><button className="primary-button full-button" disabled={busy}>{busy ? 'Verificando...' : 'Validar código'} <ShieldCheck size={17}/></button></form>{message && <div className={`coupon-result ${valid ? 'valid' : 'invalid'}`}>{valid ? <CheckCircle2 size={22}/> : <X size={22}/>}<div><strong>{valid ? 'Código validado' : 'Não foi possível validar'}</strong><p>{message}</p>{detail && <p>{detail}</p>}</div></div>}<div className="coupon-security"><ShieldCheck size={17}/><span>Um código validado não pode ser reutilizado.</span></div></section><aside className="content-card coupon-help"><h3>Como funciona a validação?</h3><div className="steps-list"><div><span>1</span><p><strong>Receba o código</strong><small>O aluno apresenta o cupom enviado por e-mail.</small></p></div><div><span>2</span><p><strong>Consulte o sistema</strong><small>O backend verifica se o código pertence à sua empresa e continua disponível.</small></p></div><div><span>3</span><p><strong>Confirme a troca</strong><small>Após validar, o cupom fica registrado como utilizado.</small></p></div></div></aside></div></div>
}

export function CompanyHistoryPage() {
  const [items, setItems] = useState<CompanyRedemption[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    loadCompanyRedemptions().then(setItems).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.')
    })
  }, [])

  return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">ACOMPANHAMENTO</span><h1>Histórico de trocas</h1><p>Veja os cupons resgatados e as atividades da parceria.</p></div></div>{error && <div className="alert alert-error">{error}</div>}<div className="content-card"><div className="card-heading"><div><h2>Atividades recentes</h2><p>{items.length} resgates registrados</p></div></div>{items.map((item) => <div className="transaction-row" key={item.code}><div className="transaction-icon icon-green"><Package size={17}/></div><div className="transaction-detail"><strong>{item.benefit}</strong><span>{item.student} · Cupom {item.code}</span><small>{new Date(item.createdAt).toLocaleString('pt-BR')}</small></div><span className={`status-pill ${item.used ? 'approved' : 'pending'}`}>{item.used ? 'Utilizado' : 'Pendente'}</span></div>)}{!error && items.length === 0 && <div className="empty-state">Nenhum resgate registrado até o momento.</div>}</div></div>
}
