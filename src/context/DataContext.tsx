import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Employee,
  MedicalCertificate,
  TimeCardEntry,
  Vacation,
} from '@/types';

interface DataContextValue {
  employees: Employee[];
  vacations: Vacation[];
  timeCardEntries: TimeCardEntry[];
  certificates: MedicalCertificate[];
  loading: boolean;
  error: string | null;
  refreshEmployees: () => Promise<void>;
  refreshVacations: () => Promise<void>;
  refreshTimeCards: () => Promise<void>;
  refreshCertificates: () => Promise<void>;
  addEmployee: (data: Omit<Employee, 'id' | 'created_at'>) => Promise<void>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
  dismissEmployee: (id: string, dismissalDate: string) => Promise<void>;
  addVacation: (data: Omit<Vacation, 'id' | 'created_at'>) => Promise<void>;
  upsertTimeCard: (data: Partial<TimeCardEntry> & { employee_id: string; reference_date: string }) => Promise<void>;
  batchUpsertTimeCards: (rows: (Partial<TimeCardEntry> & { employee_id: string; reference_date: string })[]) => Promise<void>;
  addCertificate: (data: Omit<MedicalCertificate, 'id' | 'created_at'>) => Promise<void>;
  deleteCertificate: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [timeCardEntries, setTimeCardEntries] = useState<TimeCardEntry[]>([]);
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true });
    if (error) { setError(error.message); return; }
    setEmployees((data ?? []) as Employee[]);
  }

  async function refreshVacations() {
    const { data, error } = await supabase
      .from('vacations')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) { setError(error.message); return; }
    setVacations((data ?? []) as Vacation[]);
  }

  async function refreshTimeCards() {
    const { data, error } = await supabase
      .from('time_card_entries')
      .select('*')
      .order('reference_date', { ascending: false });
    if (error) { setError(error.message); return; }
    setTimeCardEntries((data ?? []) as TimeCardEntry[]);
  }

  async function refreshCertificates() {
    const { data, error } = await supabase
      .from('medical_certificates')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) { setError(error.message); return; }
    setCertificates((data ?? []) as MedicalCertificate[]);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        refreshEmployees(),
        refreshVacations(),
        refreshTimeCards(),
        refreshCertificates(),
      ]);
      setLoading(false);
    })();
  }, []);

  async function addEmployee(data: Omit<Employee, 'id' | 'created_at'>) {
    const { error } = await supabase.from('employees').insert(data);
    if (error) throw error;
    await refreshEmployees();
  }

  async function updateEmployee(id: string, data: Partial<Employee>) {
    const { error } = await supabase
      .from('employees')
      .update(data)
      .eq('id', id);
    if (error) throw error;
    await refreshEmployees();
  }

  async function dismissEmployee(id: string, dismissalDate: string) {
    const { error } = await supabase
      .from('employees')
      .update({ status: 'dismissed', dismissal_date: dismissalDate })
      .eq('id', id);
    if (error) throw error;
    await refreshEmployees();
  }

  async function addVacation(data: Omit<Vacation, 'id' | 'created_at'>) {
    const { error } = await supabase.from('vacations').insert(data);
    if (error) throw error;
    await refreshVacations();
  }

  async function upsertTimeCard(
    data: Partial<TimeCardEntry> & { employee_id: string; reference_date: string },
  ) {
    const { error } = await supabase
      .from('time_card_entries')
      .upsert(data, { onConflict: 'employee_id,reference_date' });
    if (error) throw error;
    await refreshTimeCards();
  }

  async function batchUpsertTimeCards(
    rows: (Partial<TimeCardEntry> & { employee_id: string; reference_date: string })[],
  ) {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from('time_card_entries')
      .upsert(rows, { onConflict: 'employee_id,reference_date' });
    if (error) throw error;
    await refreshTimeCards();
  }

  async function addCertificate(data: Omit<MedicalCertificate, 'id' | 'created_at'>) {
    const { error } = await supabase.from('medical_certificates').insert(data);
    if (error) throw error;
    await refreshCertificates();
  }

  async function deleteCertificate(id: string) {
    const { error } = await supabase
      .from('medical_certificates')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await refreshCertificates();
  }

  const value: DataContextValue = {
    employees,
    vacations,
    timeCardEntries,
    certificates,
    loading,
    error,
    refreshEmployees,
    refreshVacations,
    refreshTimeCards,
    refreshCertificates,
    addEmployee,
    updateEmployee,
    dismissEmployee,
    addVacation,
    upsertTimeCard,
    batchUpsertTimeCards,
    addCertificate,
    deleteCertificate,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
