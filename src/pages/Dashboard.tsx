import { useEffect, useState } from 'react'
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, Award, CalendarDays, ChevronRight,
  CircleHelp, Coins, Gift, HandCoins, Sparkles, TrendingUp, Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  loadBenefits, loadCompanyBenefits, loadCompanyRedemptions, loadTransactions, loadTransfers,
} from '../services/meritService'
import type { Benefit, CompanyRedemption, Transaction, TransferRequest } from '../types'

function money(value: number) { return new Intl.NumberFormat('pt-BR').format(value) }
function TransactionIcon({ kind }: { kind: Transaction['kind'] }) {
  if (kind === 'redemption') return <div className="transaction-icon icon-orange"><Gift size={17}/></div>
  if (kind === 'sent' || kind === 'award') return <div className="transaction-icon icon-red"><ArrowUpRight size={17}/></div>
  return <div className="transaction-icon icon-green"><ArrowDownLeft size={17}/></div>
}

export function Dashboard() {
  const { user, refreshUser } = useApp()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [transfers, setTransfers] = useState<TransferRequest[]>([])
  const [redemptions, setRedemptions] = useState<CompanyRedemption[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const currentUser = user
    setError('')
    refreshUser().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar sua sessão.')
    })
    async function loadDashboard() {
      try {
        const [recentTransactions, availableBenefits] = await Promise.all([
          currentUser.role === 'company' ? Promise.resolve([]) : loadTransactions(),
          currentUser.role === 'company' ? loadCompanyBenefits() : loadBenefits(),
        ])
        setTransactions(recentTransactions)
        setBenefits(availableBenefits)
        if (currentUser.role === 'teacher') setTransfers(await loadTransfers())
        if (currentUser.role === 'company') {
          const companyRedemptions = await loadCompanyRedemptions()
          setRedemptions(companyRedemptions)
          setTransactions(companyRedemptions.slice(0, 4).map((item) => ({
            id: item.code,
            title: item.benefit,
            description: `Resgate por ${item.student} - ${item.code}`,
            date: new Date(item.createdAt).toLocaleString('pt-BR'),
            amount: 0,
            kind: 'redemption',
            code: item.code,
          })))
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o painel.')
      }
    }
    void loadDashboard()
  }, [user?.id])

  if (!user) return null
  const student = user.role === 'student'
  const teacher = user.role === 'teacher'
  const firstName = user.name.split(' ')[0]
  const received = transactions.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0)
  const distributed = transactions.filter((item) => item.kind === 'award').reduce((sum, item) => sum + Math.abs(item.amount), 0)
  const redemptionsUsed = redemptions.filter((item) => item.used).length
  const rate = redemptions.length ? Math.round((redemptionsUsed / redemptions.length) * 100) : 0
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())

  return <div className="dashboard-page">
    <div className="welcome-row"><div><div className="eyebrow"><CalendarDays size={14}/> {dateLabel}</div><h1>{student || !teacher ? 'Olá' : 'Bem-vindo(a)'}, {firstName} <span className="wave">✳</span></h1><p>{student ? 'Cada atitude positiva é uma oportunidade de crescer. Veja como está sua jornada.' : teacher ? 'Seu reconhecimento transforma a jornada dos seus alunos.' : 'Acompanhe suas vantagens e as trocas realizadas pela comunidade.'}</p></div><div className="welcome-actions">{student ? <Link to="/aluno/vantagens" className="primary-button"><Gift size={17}/> Explorar vantagens</Link> : teacher ? <Link to="/professor/reconhecer" className="primary-button"><Award size={17}/> Reconhecer aluno</Link> : <Link to="/empresa/vantagens" className="primary-button"><Gift size={17}/> Nova vantagem</Link>}</div></div>
    {error && <div className="alert alert-error">{error}</div>}
    <div className="hero-balance"><div className="balance-art"><div className="balance-circle circle-a"/><div className="balance-circle circle-b"/><div className="balance-icon"><Coins size={27}/></div></div><div className="balance-copy"><span>{student ? 'SEU SALDO DISPONÍVEL' : teacher ? 'SALDO PARA RECONHECIMENTOS' : 'PARCERIA ATIVA'}</span><div className="balance-number">{student || teacher ? money(user.balance) : 'Ativa'} {student || teacher ? <small>moedas</small> : null}</div><p>{student ? 'Você está construindo uma trajetória incrível.' : teacher ? 'Moedas acumuláveis para valorizar seus alunos.' : 'Sua empresa está fazendo a diferença no campus.'}</p></div><div className="balance-side"><div className="balance-side-icon"><TrendingUp size={18}/></div><div><strong>{student ? money(received) : teacher ? '1.000' : money(redemptions.length)}</strong><span>{student ? 'moedas recebidas no extrato' : teacher ? 'moedas creditadas por semestre' : 'cupons emitidos'}</span></div></div><div className="hero-dots">✳</div></div>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-top"><span>{student ? 'Moedas recebidas' : teacher ? 'Moedas distribuídas' : 'Vantagens ativas'}</span><div className="stat-icon stat-purple"><Sparkles size={18}/></div></div><strong>{student ? money(received) : teacher ? money(distributed) : benefits.filter((item) => item.active).length}</strong><div className="stat-foot">{student ? 'Conforme movimentações registradas' : teacher ? 'Total de reconhecimentos enviados' : 'Disponíveis no catálogo'}</div></div>
      <div className="stat-card"><div className="stat-top"><span>{student ? 'Trocas realizadas' : teacher ? 'Aprovações pendentes' : 'Cupons resgatados'}</span><div className="stat-icon stat-yellow"><Gift size={18}/></div></div><strong>{student ? transactions.filter((item) => item.kind === 'redemption').length : teacher ? transfers.filter((item) => item.status === 'pending').length : redemptions.length}</strong><div className="stat-foot">{student ? 'Resgates no seu extrato' : teacher ? 'Solicitações que aguardam análise' : 'Vantagens resgatadas pelos alunos'}</div></div>
      <div className="stat-card"><div className="stat-top"><span>{student ? 'Reconhecimentos' : teacher ? 'Saldo atual' : 'Cupons utilizados'}</span><div className="stat-icon stat-green"><Award size={18}/></div></div><strong>{student ? transactions.filter((item) => item.kind === 'received').length : teacher ? money(user.balance) : `${rate}%`}</strong><div className="stat-foot">{student ? 'Recebimentos no extrato' : teacher ? 'Moedas disponíveis' : 'Percentual de cupons validados'}</div></div>
    </div>
    <div className="dashboard-columns"><section className="content-card transactions-card"><div className="card-heading"><div><h2>{student ? 'Atividade recente' : teacher ? 'Últimos reconhecimentos' : 'Últimas atividades'}</h2><p>Acompanhe as movimentações da sua conta.</p></div><Link to={student ? '/aluno/extrato' : teacher ? '/professor/extrato' : '/empresa/extrato'} className="subtle-link">Ver extrato <ArrowRight size={15}/></Link></div><div className="transaction-list">{transactions.slice(0, 4).map((tx) => <div className="transaction-row" key={tx.id}><TransactionIcon kind={tx.kind}/><div className="transaction-detail"><strong>{tx.title}</strong><span>{tx.description}</span><small>{tx.date}</small></div><strong className={`transaction-amount ${tx.amount < 0 ? 'negative' : 'positive-text'}`}>{tx.amount === 0 ? '—' : `${tx.amount > 0 ? '+' : ''}${money(tx.amount)}`} {tx.amount !== 0 && <small>moedas</small>}</strong></div>)}</div>{transactions.length === 0 && <div className="empty-state">Nenhuma movimentação por enquanto.</div>}</section>
      <section className="content-card side-widget"><div className="card-heading"><div><h2>{student ? 'Vantagens para você' : teacher ? 'Aguardando sua aprovação' : 'Atalhos da parceria'}</h2><p>{student ? 'Troque suas moedas por experiências.' : teacher ? 'Transferências entre colegas de turma.' : 'Gerencie sua presença no programa.'}</p></div><div className="heading-icon"><Gift size={18}/></div></div>{student ? <div className="mini-benefits">{benefits.slice(0, 3).map((b) => <Link to="/aluno/vantagens" className="mini-benefit" key={b.id}><img src={b.image} alt="" /><div><strong>{b.title}</strong><span>{b.company}</span><small><Coins size={13}/> {money(b.cost)} moedas</small></div><ChevronRight size={17}/></Link>)}</div> : teacher ? <div className="approval-preview">{transfers.filter((t) => t.status === 'pending').slice(0, 2).map((t) => <div className="approval-mini" key={t.id}><div className="avatar avatar-small">{t.senderName.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div><div><strong>{t.senderName} → {t.receiverName}</strong><span>{t.amount} moedas · {t.classroom.split(' · ')[0]}</span></div><span className="status-pill pending">Pendente</span></div>)}{!transfers.length && <div className="empty-state">Nenhuma solicitação pendente.</div>}<Link to="/professor/aprovacoes" className="secondary-button full-button">Revisar solicitações <ArrowRight size={16}/></Link></div> : <div className="company-quicklinks"><Link to="/empresa/vantagens"><Gift size={18}/> Cadastrar uma vantagem <ChevronRight size={17}/></Link><Link to="/empresa/cupons"><HandCoins size={18}/> Conferir um cupom <ChevronRight size={17}/></Link><Link to="/empresa/extrato"><Wallet size={18}/> Ver histórico de trocas <ChevronRight size={17}/></Link></div>}</section></div>
    {student && <div className="tip-banner"><div className="tip-icon"><CircleHelp size={21}/></div><div><strong>Reconheça quem caminha com você</strong><p>Você pode transferir moedas para colegas da mesma turma. A transferência precisa da aprovação de um professor em comum.</p></div><Link to="/aluno/transferencias">Entenda como funciona <ArrowRight size={16}/></Link></div>}
  </div>
}
