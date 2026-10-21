import { api } from '../lib/api'
import type {
  Benefit,
  CompanyRedemption,
  CouponValidation,
  Institution,
  Role,
  SharedClassroom,
  Transaction,
  TransferRequest,
  User,
} from '../types'

interface LoginResponse {
  token: string
  user: User
}

export interface RegistrationInput {
  name: string
  email: string
  password: string
  role: Role
  cpf?: string
  rg?: string
  address?: string
  institution?: string
  course?: string
  department?: string
  cnpj?: string
  responsible?: string
  description?: string
}

export interface PublicStatistics {
  recognizedStudents: number
  distributedCoins: number
}

export async function login(email: string, password: string, role: Role): Promise<User> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
  if (data.user.role !== role) {
    throw new Error('O perfil selecionado não corresponde a esta conta.')
  }
  sessionStorage.setItem('merite_token', data.token)
  return data.user
}

export async function logout() {
  if (sessionStorage.getItem('merite_token')) await api.post('/auth/logout')
}

export async function loadCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export async function registerAccount(input: RegistrationInput) {
  await api.post('/auth/register', input)
}

export async function loadInstitutions(): Promise<Institution[]> {
  const { data } = await api.get<Institution[]>('/institutions')
  return data
}

export async function loadPublicStatistics(): Promise<PublicStatistics> {
  const { data } = await api.get<PublicStatistics>('/public/statistics')
  return data
}

export async function loadBenefits(): Promise<Benefit[]> {
  const { data } = await api.get<Benefit[]>('/benefits')
  return data
}

export async function loadCompanyBenefits(): Promise<Benefit[]> {
  const { data } = await api.get<Benefit[]>('/companies/me/benefits')
  return data
}

export async function loadTransactions(): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>('/transactions/me')
  return data.map((transaction) => ({
    ...transaction,
    date: new Date(transaction.date).toLocaleString('pt-BR'),
  }))
}

export async function loadStudents(): Promise<User[]> {
  const { data } = await api.get<User[]>('/students')
  return data
}

export async function loadTeacherStudents(): Promise<User[]> {
  const { data } = await api.get<User[]>('/teachers/me/students')
  return data
}

export async function loadSharedClassroom(studentId: string): Promise<SharedClassroom> {
  const { data } = await api.get<SharedClassroom>(`/students/${studentId}/shared-classroom`)
  return data
}

export async function loadTransfers(): Promise<TransferRequest[]> {
  const { data } = await api.get<TransferRequest[]>('/transfers/me')
  return data
}

export async function createAward(studentId: string, amount: number, reason: string) {
  await api.post('/teachers/me/awards', { studentId, amount, reason })
}

export async function createTransfer(receiverId: string, amount: number, reason: string) {
  await api.post('/transfers', { receiverId, amount, reason })
}

export async function reviewTransfer(id: string, approve: boolean) {
  await api.post(`/transfers/${id}/${approve ? 'approve' : 'reject'}`)
}

export async function redeemBenefit(benefit: Benefit): Promise<string> {
  const { data } = await api.post<{ code: string }>(`/benefits/${benefit.id}/redeem`)
  return data.code
}

export async function createBenefit(input: Omit<Benefit, 'id' | 'active'>): Promise<Benefit> {
  const { data } = await api.post<Benefit>('/companies/me/benefits', input)
  return data
}

export async function validateCoupon(code: string): Promise<CouponValidation> {
  const { data } = await api.post<CouponValidation>('/companies/me/redemptions/validate', { code })
  return data
}

export async function loadCompanyRedemptions(): Promise<CompanyRedemption[]> {
  const { data } = await api.get<CompanyRedemption[]>('/companies/me/redemptions')
  return data
}
