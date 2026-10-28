import type { ScheduleStatus, ValidationIssue, VacationPeriod, VacationRules } from '../rules/vacation'

export interface PeriodResponse {
  id: string
  startDate: string
  endDate: string
  status: 'draft' | 'confirmed'
  adminOverride: boolean
  overrideReason: string | null
  confirmedAt: string | null
}

export interface ScheduleResponse {
  settings: VacationRules
  periods: PeriodResponse[]
  totalDays: number
  status: ScheduleStatus
  canEdit: boolean
  disabledDates: string[]
  issues: ValidationIssue[]
}

export interface EmployeeSummary {
  id: string
  name: string
  email: string
  isActive: boolean
  totalDays: number
  status: ScheduleStatus
  periods: PeriodResponse[]
}

export interface Coincidence {
  employeeA: Pick<EmployeeSummary, 'id' | 'name'>
  employeeB: Pick<EmployeeSummary, 'id' | 'name'>
  startDate: string
  endDate: string
  days: number
}

export interface ReportResponse {
  settings: VacationRules
  generatedAt: string
  summary: {
    employees: number
    withSchedule: number
    confirmed: number
    partial: number
    draft: number
    empty: number
    totalVacationDays: number
  }
  employees: EmployeeSummary[]
  coincidences: Coincidence[]
}

export interface EmployeeSessionPayload {
  employeeId: string
  email: string
  name: string
  kind: 'employee'
}

export interface AdminSessionPayload {
  adminId: string
  email: string
  name: string
  kind: 'admin'
}

export type { ScheduleStatus, VacationPeriod, VacationRules }
