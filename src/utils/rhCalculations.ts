import type { Employee, TimeCardEntry, Vacation } from '@/types';

// ---- Date helpers ----

export function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ---- Aquisitive period calculation ----

export interface AquisitivePeriod {
  index: number;
  start: string;
  end: string;
  concessionDeadline: string; // 11 months after period end
  isExpired: boolean;          // period ended and no vacation registered
  hasVacationRegistered: boolean;
}

export function computeAquisitivePeriods(
  admissionDate: string,
  vacations: Vacation[],
): AquisitivePeriod[] {
  const admission = new Date(admissionDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const periods: AquisitivePeriod[] = [];

  // Always compute at least the current and previous periods
  const monthsSinceAdmission =
    (now.getFullYear() - admission.getFullYear()) * 12 +
    (now.getMonth() - admission.getMonth());

  const totalPeriods = Math.max(2, Math.ceil(monthsSinceAdmission / 12) + 1);

  for (let i = 0; i < totalPeriods; i++) {
    const start = new Date(admission);
    start.setFullYear(start.getFullYear() + i);

    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);

    const concessionDeadline = new Date(end);
    concessionDeadline.setMonth(concessionDeadline.getMonth() + 11);

    const periodVacations = vacations.filter(
      (v) => v.aquisitive_period_start === toISO(start),
    );

    const isExpired = now > end && periodVacations.length === 0;

    periods.push({
      index: i + 1,
      start: toISO(start),
      end: toISO(end),
      concessionDeadline: toISO(concessionDeadline),
      isExpired,
      hasVacationRegistered: periodVacations.length > 0,
    });
  }

  return periods;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---- Time card calculation ----

export interface DayCalculation {
  workedMinutes: number;
  expectedMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  absent: boolean;
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function calculateDay(
  entry: Partial<TimeCardEntry>,
  employee: Employee,
  dayOfWeek: number, // 0 = Sunday, 6 = Saturday
): DayCalculation {
  const schedule = employee.work_schedule;
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  // If no entries at all, mark absent (unless Sunday or Saturday off)
  const hasEntries = entry.entry1 || entry.exit_lunch || entry.return_lunch || entry.exit2;
  if (!hasEntries) {
    if (isSunday) return { workedMinutes: 0, expectedMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, absent: false };
    if (isSaturday && !schedule.saturday) return { workedMinutes: 0, expectedMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, absent: false };
    return { workedMinutes: 0, expectedMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, absent: true };
  }

  // Calculate expected minutes
  let expectedMinutes = 0;
  let expStart: number | null = null;
  let expEnd: number | null = null;
  let expLunchStart: number | null = null;
  let expLunchEnd: number | null = null;

  if (isSaturday && schedule.saturday) {
    expStart = timeToMinutes(schedule.saturday_start);
    expEnd = timeToMinutes(schedule.saturday_end);
    expectedMinutes = (expEnd ?? 0) - (expStart ?? 0);
  } else if (!isSaturday && !isSunday) {
    expStart = timeToMinutes(schedule.start);
    expLunchStart = timeToMinutes(schedule.lunch_start);
    expLunchEnd = timeToMinutes(schedule.lunch_end);
    expEnd = timeToMinutes(schedule.end);
    expectedMinutes = (expEnd ?? 0) - (expStart ?? 0) - ((expLunchEnd ?? 0) - (expLunchStart ?? 0));
  }

  // Calculate worked minutes
  const e1 = timeToMinutes(entry.entry1 ?? null);
  const el = timeToMinutes(entry.exit_lunch ?? null);
  const rl = timeToMinutes(entry.return_lunch ?? null);
  const e2 = timeToMinutes(entry.exit2 ?? null);

  let workedMinutes = 0;
  if (e1 !== null && el !== null) workedMinutes += el - e1;
  if (rl !== null && e2 !== null) workedMinutes += e2 - rl;

  // Calculate late minutes
  let lateMinutes = 0;
  if (expStart !== null && e1 !== null && e1 > expStart) {
    lateMinutes += e1 - expStart;
  }
  if (expEnd !== null && e2 !== null && e2 < expEnd) {
    lateMinutes += expEnd - e2;
  }
  if (expLunchEnd !== null && rl !== null && rl > expLunchEnd) {
    lateMinutes += rl - expLunchEnd;
  }

  // Calculate overtime
  const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);

  return {
    workedMinutes,
    expectedMinutes,
    overtimeMinutes,
    lateMinutes,
    absent: false,
  };
}

// ---- Company time helpers ----

export function formatMinutes(min: number): string {
  if (min === 0) return '0min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getMonthName(month: number): string {
  const names = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return names[month];
}

// ---- Tenure calculation ----

export function computeTenure(admissionDate: string, endDate?: string): string {
  const start = new Date(admissionDate + 'T00:00:00');
  const end = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const totalMonths = years * 12 + months;

  if (totalMonths < 1) return 'Menos de 1 mês';
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
  if (m === 0) return `${y} ${y === 1 ? 'ano' : 'anos'}`;
  return `${y} ${y === 1 ? 'ano' : 'anos'} e ${m} ${m === 1 ? 'mês' : 'meses'}`;
}

// ---- CSV export ----

export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [
    headers.join(';'),
    ...rows.map((r) => r.map((c) => {
      const s = String(c).replace(/;/g, ',').replace(/\n/g, ' ');
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
