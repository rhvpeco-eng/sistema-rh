export interface WorkSchedule {
  days: string;
  start: string;       // "08:00"
  lunch_start: string;  // "12:00"
  lunch_end: string;    // "13:00"
  end: string;          // "17:00"
  saturday: boolean;
  saturday_start: string;
  saturday_end: string;
}

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  rg: string | null;
  pis: string | null;
  birth_date: string | null;
  address: string | null;
  position: string | null;
  department: string;
  base_salary: number;
  admission_date: string;
  work_schedule: WorkSchedule;
  status: 'active' | 'dismissed';
  dismissal_date: string | null;
  full_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Vacation {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  aquisitive_period_start: string;
  aquisitive_period_end: string;
  days_taken: number;
  created_at: string;
}

export interface TimeCardEntry {
  id: string;
  employee_id: string;
  reference_date: string;
  entry1: string | null;
  exit_lunch: string | null;
  return_lunch: string | null;
  exit2: string | null;
  overtime_minutes: number;
  late_minutes: number;
  absent: boolean;
  created_at: string;
}

export interface MedicalCertificate {
  id: string;
  employee_id: string;
  cid: string | null;
  start_date: string;
  days: number;
  doctor_name: string | null;
  file_name: string | null;
  file_data: string | null;
  created_at: string;
}

export const departments = [
  'Administrativo',
  'Financeiro',
  'Recursos Humanos',
  'Tecnologia',
  'Comercial',
  'Operações',
  'Logística',
] as const;

export type Department = (typeof departments)[number];

export const defaultWorkSchedule: WorkSchedule = {
  days: 'Seg-Sex',
  start: '08:00',
  lunch_start: '12:00',
  lunch_end: '13:00',
  end: '17:00',
  saturday: false,
  saturday_start: '08:00',
  saturday_end: '12:00',
};

export type TabId =
  | 'employees'
  | 'vacations'
  | 'timecard'
  | 'certificates'
  | 'reports';
