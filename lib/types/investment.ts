export type InvestmentType = 'real_estate' | 'financial' | 'vehicle' | 'other'
export type InterestType = 'simple' | 'compound'
export type InterestFrequency = 'monthly' | 'annual'

export interface Investment {
  id: string
  userId: string
  name: string
  type: InvestmentType
  totalAmount?: number
  startDate: string
  notes?: string
  hasInterest: boolean
  interestRate?: number
  interestType?: InterestType
  interestFrequency?: InterestFrequency
  createdAt: string
  updatedAt: string
}

export interface InvestmentPayment {
  id: string
  investmentId: string
  userId: string
  date: string
  amount: number
  notes?: string
  createdAt: string
}
