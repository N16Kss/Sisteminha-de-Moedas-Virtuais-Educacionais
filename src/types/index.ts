export type Role = 'student' | 'teacher' | 'company'
export type TransactionKind = 'received' | 'sent' | 'redemption' | 'award' | 'transfer'
export type TransferStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  institution: string
  department?: string
  classroom?: string
  balance: number
}
export interface Transaction {
  id: string
  title: string
  description: string
  date: string
  amount: number
  kind: TransactionKind
  code?: string
}
export interface Benefit {
  id: string
  title: string
  company: string
  description: string
  cost: number
  category: string
  image: string
  active: boolean
}
export interface TransferRequest {
  id: string
  senderId: string
  senderName: string
  receiverId: string
  receiverName: string
  amount: number
  reason: string
  classroom: string
  sharedTeachers: string[]
  status: TransferStatus
  createdAt: string
}
export interface Institution {
  id: string
  name: string
}
export interface SharedClassroom {
  shared: boolean
  classroom: string
  teachers: string[]
}
export interface CompanyRedemption {
  code: string
  benefit: string
  company: string
  student: string
  companyId: string
  used: boolean
  createdAt: string
}
export interface CouponValidation {
  valid: boolean
  message: string
  benefit?: string
  student?: string
}
