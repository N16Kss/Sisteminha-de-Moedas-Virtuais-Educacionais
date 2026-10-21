import { useEffect, useState, type FormEvent } from 'react'
import { Award, Check, Coins, Search, ShieldCheck, X, Users, Clock3 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createAward, loadTeacherStudents, loadTransfers, reviewTransfer } from '../services/meritService'
import type { TransferRequest, User } from '../types'

const fmt = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

export function AwardStudentPage() {
  const { user, refreshUser } = useApp()
  const [student, setStudent] = useState('')
  const [students, setStudents] = useState<User[]>([])
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeacherStudents()
      .then(setStudents)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os alunos.'))
      .finally(() => setLoading(false))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    const recipient = students.find((item) => item.id === student)
    if (!recipient) {
      setError('Selecione um aluno vinculado às suas turmas.')
      return
    }
    try {
      await createAward(recipient.id, Number(amount), reason)
      setMessage(`Reconhecimento enviado para ${recipient.name}. O aluno será notificado por e-mail.`)
      setAmount('')
      setReason('')
      await refreshUser()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o reconhecimento.')
    }
  }

  const filteredStudents = students.filter((item) =>
    `${item.name} ${item.classroom ?? ''}`.toLowerCase().includes(query.toLowerCase()))

  return <div className="page-stack">
    <div className="page-title-row"><div><span className="eyebrow">VALORIZE BOAS ATITUDES</span><h1>Reconhecer um aluno</h1><p>Distribua moedas para celebrar participação, colaboração e dedicação.</p></div><div className="balance-chip"><Coins size={18}/><div><strong>{fmt(user?.balance ?? 0)}</strong><span>moedas disponíveis</span></div></div></div>
    <div className="rule-banner"><div className="rule-icon"><Award size={22}/></div><div><strong>Seu saldo é acumulável</strong><p>Você recebe 1.000 moedas por semestre. O saldo não utilizado é acumulado com o próximo crédito semestral.</p></div></div>
    <div className="transfer-layout"><form className="content-card transfer-form" onSubmit={submit}><h2>Detalhes do reconhecimento</h2><p>Um bom reconhecimento começa com uma mensagem significativa.</p><label>Buscar aluno<div className="search-box"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome do aluno..."/></div></label><label>Aluno a reconhecer<select required value={student} onChange={(event) => setStudent(event.target.value)}><option value="">{loading ? 'Carregando alunos...' : 'Selecione um aluno'}</option>{filteredStudents.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.classroom ?? 'Turma não informada'}</option>)}</select></label><label>Quantidade de moedas<div className="amount-input"><Coins size={18}/><input type="number" min="1" max={user?.balance ?? 0} required value={amount} onChange={(event) => setAmount(event.target.value)}/><span>moedas</span></div><small>Você poderá distribuir até {fmt(user?.balance ?? 0)} moedas.</small></label><label>Mensagem de reconhecimento<textarea required rows={4} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: Sua colaboração e participação enriqueceram a discussão de hoje..."/><small className="field-end">{reason.length}/300 · Obrigatório</small></label>{error && <div className="alert alert-error">{error}</div>}{message && <div className="alert alert-success">{message}</div>}<button className="primary-button full-button" type="submit" disabled={loading}><Award size={17}/> Enviar reconhecimento</button></form>
      <aside className="content-card transfer-aside"><div className="aside-illustration"><Award size={28}/></div><h3>Seu reconhecimento importa</h3><p className="muted-copy">Uma mensagem específica mostra ao aluno que o esforço dele foi percebido.</p><div className="recognition-examples"><span>IDEIAS DE RECONHECIMENTO</span><p>“Pela iniciativa em ajudar os colegas durante a atividade.”</p><p>“Pela evolução e dedicação demonstradas ao longo do semestre.”</p><p>“Pela participação que tornou nossa aula mais rica.”</p></div><div className="aside-note"><ShieldCheck size={17}/><span>A justificativa é obrigatória e fica registrada no extrato.</span></div></aside></div>
  </div>
}

export function ApprovalsPage() {
  const [items, setItems] = useState<TransferRequest[]>([])
  const [active, setActive] = useState<TransferRequest | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const transfers = await loadTransfers()
    setItems(transfers)
  }

  useEffect(() => {
    refresh().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as solicitações.')
    }).finally(() => setLoading(false))
  }, [])

  async function decide(approve: boolean) {
    if (!active) return
    setError('')
    try {
      await reviewTransfer(active.id, approve)
      await refresh()
      setActive(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível processar a solicitação.')
    }
  }

  const pending = items.filter((item) => item.status === 'pending')
  return <div className="page-stack">
    <div className="page-title-row"><div><span className="eyebrow">CUIDANDO DA COMUNIDADE</span><h1>Aprovações de transferências</h1><p>Revise as solicitações de alunos que compartilham uma turma com você.</p></div><div className="balance-chip"><ShieldCheck size={18}/><div><strong>{pending.length}</strong><span>pendentes</span></div></div></div>
    <div className="rule-banner"><div className="rule-icon"><ShieldCheck size={22}/></div><div><strong>Critério de aprovação</strong><p>Confira se os alunos pertencem à mesma turma e se você está vinculado a essa turma. Ao aprovar, o saldo é transferido; ao rejeitar, o valor reservado retorna ao remetente.</p></div></div>
    {error && <div className="alert alert-error">{error}</div>}
    <div className="content-card"><div className="card-heading"><div><h2>Solicitações recebidas</h2><p>As transferências só são concluídas após uma aprovação válida.</p></div><span className="status-pill pending">{pending.length} pendentes</span></div>{loading ? <div className="empty-state">Carregando solicitações...</div> : items.length === 0 ? <div className="empty-state">Nenhuma solicitação pendente.</div> : items.map((transfer) => <div className="approval-row" key={transfer.id}><div className="avatar">{transfer.senderName.split(' ').map((name) => name[0]).slice(0, 2).join('')}</div><div className="approval-main"><strong>{transfer.senderName} <span className="muted-inline">para</span> {transfer.receiverName}</strong><p>{transfer.reason}</p><div className="approval-meta"><span><Users size={14}/>{transfer.classroom}</span><span><Clock3 size={14}/>{new Date(transfer.createdAt).toLocaleDateString('pt-BR')}</span><span><ShieldCheck size={14}/>{transfer.sharedTeachers.join(', ')}</span></div></div><div className="approval-value"><strong>{fmt(transfer.amount)}</strong><span>moedas</span></div><div className="approval-actions"><button className="approve-button" onClick={() => { setActive(transfer); setError('') }}><Check size={16}/> Analisar</button></div></div>)}</div>
    {active && <div className="modal-backdrop" onClick={() => setActive(null)}><div className="modal-card review-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setActive(null)}><X size={19}/></button><span className="eyebrow">REVISÃO DE SOLICITAÇÃO</span><h2>Confirmar transferência?</h2><p>{active.senderName} deseja transferir moedas para {active.receiverName}.</p><div className="review-amount"><strong>{fmt(active.amount)}</strong><span>moedas</span></div><div className="review-detail"><span>Turma</span><strong>{active.classroom}</strong><span>Professores em comum</span><strong>{active.sharedTeachers.join(', ')}</strong><span>Motivo informado</span><p>{active.reason}</p></div>{error && <div className="alert alert-error">{error}</div>}<div className="modal-actions"><button className="secondary-button" onClick={() => decide(false)}><X size={16}/> Rejeitar</button><button className="primary-button" onClick={() => decide(true)}><Check size={16}/> Aprovar transferência</button></div></div></div>}
  </div>
}
