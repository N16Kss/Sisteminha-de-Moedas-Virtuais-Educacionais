import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowDownLeft, ArrowUpRight, Check, Clock3, Coins, Search, Send,
  ShieldCheck, X, ArrowRight, CircleAlert,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  createTransfer, loadBenefits, loadSharedClassroom, loadStudents, loadTransactions,
  loadTransfers, redeemBenefit,
} from '../services/meritService'
import type { Benefit, SharedClassroom, Transaction, TransferRequest, User } from '../types'

const fmt = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

export function BenefitsPage() {
  const { user, refreshUser } = useApp()
  const [items, setItems] = useState<Benefit[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [selected, setSelected] = useState<Benefit | null>(null)
  const [coupon, setCoupon] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    loadBenefits().then(setItems).catch((cause: unknown) => {
      setLoadError(cause instanceof Error ? cause.message : 'Não foi possível carregar as vantagens.')
    })
  }, [])

  const categories = ['Todas', ...Array.from(new Set(items.map((benefit) => benefit.category)))]
  const filtered = items.filter((benefit) =>
    (category === 'Todas' || benefit.category === category)
    && `${benefit.title} ${benefit.company} ${benefit.description}`.toLowerCase().includes(query.toLowerCase()))

  async function redeem() {
    if (!selected || !user) return
    setError('')
    try {
      const code = await redeemBenefit(selected)
      setCoupon(code)
      await refreshUser()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível resgatar.')
    }
  }

  return <div className="page-stack">
    <div className="page-title-row"><div><span className="eyebrow">SEU ESFORÇO, SUAS CONQUISTAS</span><h1>Catálogo de vantagens</h1><p>Transforme suas moedas em experiências que fazem a diferença.</p></div><div className="balance-chip"><Coins size={18}/><div><strong>{fmt(user?.balance ?? 0)}</strong><span>moedas disponíveis</span></div></div></div>
    {loadError && <div className="alert alert-error">{loadError}</div>}
    <div className="catalog-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar vantagens..."/></div><div className="filter-chips">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? 'active' : ''}>{item}</button>)}</div></div>
    <div className="benefit-grid">{filtered.map((benefit) => <article className="benefit-card" key={benefit.id}><div className="benefit-image"><img src={benefit.image} alt={benefit.title}/><span>{benefit.category}</span><button aria-label="Ver vantagem" onClick={() => { setSelected(benefit); setCoupon(''); setError('') }}><ArrowRight size={17}/></button></div><div className="benefit-body"><span className="benefit-company">{benefit.company}</span><h3>{benefit.title}</h3><p>{benefit.description}</p><div className="benefit-bottom"><div><strong><Coins size={17}/>{fmt(benefit.cost)}</strong><span>moedas</span></div><button className="primary-button" onClick={() => { setSelected(benefit); setCoupon(''); setError('') }}>Resgatar</button></div></div></article>)}</div>
    {!loadError && filtered.length === 0 && <div className="empty-state">Nenhuma vantagem encontrada para sua busca.</div>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)}><X size={19}/></button>{coupon ? <div className="coupon-success"><div className="success-round"><Check size={28}/></div><span className="eyebrow">RESGATE REALIZADO</span><h2>Seu benefício está garantido!</h2><p>O cupom foi enviado por e-mail. Apresente este código presencialmente ao parceiro.</p><div className="coupon-code">{coupon}</div><small>Guarde este código para a conferência da troca.</small><button className="primary-button full-button" onClick={() => setSelected(null)}>Concluir <Check size={17}/></button></div> : <><img className="modal-benefit-image" src={selected.image} alt={selected.title}/><span className="eyebrow">{selected.company}</span><h2>{selected.title}</h2><p>{selected.description}</p><div className="modal-cost"><span>Custo do resgate</span><strong><Coins size={18}/>{fmt(selected.cost)} moedas</strong></div><div className="modal-cost"><span>Seu saldo após a troca</span><strong>{fmt((user?.balance ?? 0) - selected.cost)} moedas</strong></div>{error && <div className="alert alert-error">{error}</div>}{(user?.balance ?? 0) < selected.cost && <div className="alert alert-warning">Você não possui moedas suficientes para esta vantagem.</div>}<button className="primary-button full-button" disabled={(user?.balance ?? 0) < selected.cost} onClick={redeem}>Confirmar resgate <ArrowRight size={17}/></button><small className="modal-footnote">O saldo será descontado após a confirmação pelo servidor.</small></>}</div></div>}
  </div>
}

interface TransferRecipient extends User {
  sharedClassroom: SharedClassroom | null
}

export function TransfersPage() {
  const { user, refreshUser } = useApp()
  const [tab, setTab] = useState<'send' | 'history'>('send')
  const [receiver, setReceiver] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [success, setSuccess] = useState('')
  const [items, setItems] = useState<TransferRequest[]>([])
  const [recipients, setRecipients] = useState<TransferRecipient[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const transfers = await loadTransfers()
    setItems(transfers)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([loadStudents(), loadTransfers()])
      .then(async ([students, transfers]) => {
        const peers = students.filter((student) => student.id !== user?.id)
        const recipientsWithClassroom = await Promise.all(peers.map(async (student) => ({
          ...student,
          sharedClassroom: await loadSharedClassroom(student.id),
        })))
        if (active) {
          setRecipients(recipientsWithClassroom)
          setItems(transfers)
        }
      })
      .catch((cause: unknown) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : 'Não foi possível carregar as transferências.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id])

  const selectedRecipient = recipients.find((student) => student.id === receiver)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!receiver) return
    try {
      await createTransfer(receiver, Number(amount), reason)
      setSuccess('Solicitação enviada! As moedas ficarão reservadas até a aprovação do professor compartilhado.')
      setReason('')
      await Promise.all([refresh(), refreshUser()])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível solicitar a transferência.')
    }
  }

  return <div className="page-stack">
    <div className="page-title-row"><div><span className="eyebrow">COMPARTILHE O RECONHECIMENTO</span><h1>Transferência entre alunos</h1><p>Valorize quem faz parte da sua jornada acadêmica.</p></div><div className="balance-chip"><Coins size={18}/><div><strong>{user?.balance ?? 0}</strong><span>saldo disponível</span></div></div></div>
    <div className="rule-banner"><div className="rule-icon"><ShieldCheck size={22}/></div><div><strong>Uma troca segura e justa</strong><p>O envio só é permitido entre alunos que compartilham a mesma turma e ao menos um professor. Toda solicitação precisa ser aprovada antes de concluir.</p></div></div>
    {loadError && <div className="alert alert-error">{loadError}</div>}
    <div className="tabs"><button className={tab === 'send' ? 'active' : ''} onClick={() => setTab('send')}><Send size={16}/> Enviar moedas</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><Clock3 size={16}/> Minhas solicitações <span>{items.length}</span></button></div>
    {tab === 'send' ? <div className="transfer-layout"><form className="content-card transfer-form" onSubmit={submit}><h2>Nova transferência</h2><p>Preencha os dados para enviar uma solicitação ao professor responsável.</p><label>Quem vai receber?<select required value={receiver} onChange={(event) => setReceiver(event.target.value)}><option value="">Selecione um colega</option>{recipients.map((student) => <option key={student.id} value={student.id} disabled={!student.sharedClassroom?.shared}>{student.name} · {student.sharedClassroom?.shared ? `mesma turma: ${student.sharedClassroom.classroom}` : 'sem turma e professor em comum'}</option>)}</select></label>{receiver && <div className={`recipient-check ${selectedRecipient?.sharedClassroom?.shared ? 'valid' : 'invalid'}`}>{selectedRecipient?.sharedClassroom?.shared ? <><Check size={17}/><span><strong>Turma compatível</strong><small>Professor(es) em comum: {selectedRecipient.sharedClassroom.teachers.join(', ')}</small></span></> : <><CircleAlert size={17}/><span><strong>Transferência indisponível</strong><small>Não há professor em comum na mesma turma.</small></span></>}</div>}{loading && <p className="muted-copy">Carregando colegas e vínculos de turma...</p>}<label>Quantidade de moedas<div className="amount-input"><Coins size={18}/><input type="number" min="1" max={user?.balance ?? 0} required value={amount} onChange={(event) => setAmount(event.target.value)}/><span>moedas</span></div><small>Saldo disponível: {user?.balance ?? 0} moedas</small></label><label>Motivo da transferência<textarea required rows={4} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Conte por que você deseja reconhecer essa pessoa..."/><small className="field-end">{reason.length}/300 · Obrigatório</small></label>{error && <div className="alert alert-error">{error}</div>}{success && <div className="alert alert-success">{success}</div>}<button className="primary-button full-button" type="submit" disabled={loading || !selectedRecipient?.sharedClassroom?.shared}><Send size={17}/> Enviar para aprovação</button></form><aside className="content-card transfer-aside"><div className="aside-illustration"><ArrowUpRight size={31}/></div><h3>Como funciona?</h3><div className="steps-list"><div><span>1</span><p><strong>Envie o reconhecimento</strong><small>Escolha o colega, a quantidade e conte o motivo.</small></p></div><div><span>2</span><p><strong>Professor revisa</strong><small>Um professor em comum precisa aprovar a solicitação.</small></p></div><div><span>3</span><p><strong>Moedas transferidas</strong><small>Após a aprovação, o saldo do destinatário é atualizado.</small></p></div></div><div className="aside-note"><ShieldCheck size={17}/><span>Sem professor em comum, a transferência não pode ser enviada.</span></div></aside></div> : <div className="content-card"><div className="card-heading"><div><h2>Histórico de transferências</h2><p>Acompanhe o andamento das suas solicitações.</p></div></div>{items.length ? items.map((transfer) => <div className="transfer-history-row" key={transfer.id}><div className="transaction-icon icon-purple"><ArrowUpRight size={18}/></div><div className="transaction-detail"><strong>{transfer.senderId === user?.id ? `Para ${transfer.receiverName}` : `De ${transfer.senderName}`}</strong><span>{transfer.reason}</span><small>{new Date(transfer.createdAt).toLocaleString('pt-BR')}</small></div><strong className="history-amount">{transfer.amount} moedas</strong><span className={`status-pill ${transfer.status}`}>{transfer.status === 'pending' ? 'Em análise' : transfer.status === 'approved' ? 'Aprovada' : 'Recusada'}</span></div>) : <div className="empty-state">Você ainda não possui solicitações.</div>}</div>}
  </div>
}

export function TransactionsPage() {
  const { user } = useApp()
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all')
  const [items, setItems] = useState<Transaction[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    loadTransactions().then(setItems).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o extrato.')
    })
  }, [user?.id])
  const visible = items.filter((item) => filter === 'all'
    || (filter === 'in' && item.amount > 0) || (filter === 'out' && item.amount < 0))
  return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">TRANSPARÊNCIA EM CADA MOVIMENTO</span><h1>Meu extrato</h1><p>Confira o histórico completo das movimentações da sua conta.</p></div><div className="balance-chip"><Coins size={18}/><div><strong>{user?.balance ?? 0}</strong><span>saldo atual</span></div></div></div>{error && <div className="alert alert-error">{error}</div>}<div className="content-card"><div className="card-heading"><div><h2>Todas as movimentações</h2><p>{items.length} registros</p></div><div className="filter-chips"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas</button><button className={filter === 'in' ? 'active' : ''} onClick={() => setFilter('in')}>Entradas</button><button className={filter === 'out' ? 'active' : ''} onClick={() => setFilter('out')}>Saídas</button></div></div>{visible.map((transaction) => <div className="transaction-row transaction-row-large" key={transaction.id}><TransactionIconLocal kind={transaction.kind}/><div className="transaction-detail"><strong>{transaction.title}</strong><span>{transaction.description}</span><small>{transaction.date}{transaction.code ? ` · Cupom ${transaction.code}` : ''}</small></div><strong className={`transaction-amount ${transaction.amount < 0 ? 'negative' : 'positive-text'}`}>{transaction.amount === 0 ? '—' : `${transaction.amount > 0 ? '+' : ''}${fmt(transaction.amount)}`} {transaction.amount !== 0 && <small>moedas</small>}</strong></div>)}{!error && visible.length === 0 && <div className="empty-state">Nenhuma movimentação encontrada.</div>}</div></div>
}

function TransactionIconLocal({ kind }: { kind: Transaction['kind'] }) {
  return <div className={`transaction-icon ${kind === 'redemption' ? 'icon-orange' : kind === 'sent' || kind === 'award' ? 'icon-red' : 'icon-green'}`}>{kind === 'sent' || kind === 'award' ? <ArrowUpRight size={17}/> : <ArrowDownLeft size={17}/>}</div>
}
