import {
  AlertTriangle,
  CalendarHeart,
  CalendarPlus,
  Clock,
  Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { Button, Field, Select, TextInput } from './FormControls';
import { Modal } from './Modal';
import {
  computeAquisitivePeriods,
  formatDateBR,
  type AquisitivePeriod,
} from '@/utils/rhCalculations';
import type { Employee } from '@/types';

export function VacationsTab() {
  const { employees, vacations, addVacation } = useData();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [vacationForm, setVacationForm] = useState({
    startDate: '',
    endDate: '',
    aquisitivePeriodStart: '',
  });
  const [saving, setSaving] = useState(false);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees],
  );

  const selectedEmp = activeEmployees.find((e) => e.id === selectedEmpId) ?? null;

  const empVacations = useMemo(
    () => (selectedEmp ? vacations.filter((v) => v.employee_id === selectedEmp.id) : []),
    [vacations, selectedEmp],
  );

  const periods: AquisitivePeriod[] = useMemo(
    () => (selectedEmp ? computeAquisitivePeriods(selectedEmp.admission_date, empVacations) : []),
    [selectedEmp, empVacations],
  );

  const expiredCount = periods.filter((p) => p.isExpired).length;

  function openRegisterVacation(period: AquisitivePeriod) {
    setVacationForm({
      startDate: '',
      endDate: '',
      aquisitivePeriodStart: period.start,
    });
    setModalOpen(true);
  }

  async function handleSaveVacation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmp) return;
    setSaving(true);
    try {
      const start = new Date(vacationForm.startDate + 'T00:00:00');
      const end = new Date(vacationForm.endDate + 'T00:00:00');
      const daysTaken = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const period = periods.find((p) => p.start === vacationForm.aquisitivePeriodStart);
      await addVacation({
        employee_id: selectedEmp.id,
        start_date: vacationForm.startDate,
        end_date: vacationForm.endDate,
        aquisitive_period_start: vacationForm.aquisitivePeriodStart,
        aquisitive_period_end: period?.end ?? '',
        days_taken: daysTaken,
      });
      setModalOpen(false);
    } catch {
      alert('Erro ao registrar férias.');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Controle de Férias</h2>
        <p className="text-sm text-slate-400">
          Cálculo automático de períodos aquisitivos e alertas da CLT
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Field label="Selecione o Colaborador" className="max-w-md">
          <Select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
          >
            <option value="">Escolha um colaborador...</option>
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} — {emp.department}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {!selectedEmp && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <CalendarHeart className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">
            Selecione um colaborador para visualizar o controle de férias.
          </p>
        </div>
      )}

      {selectedEmp && (
        <>
          {/* CLT Alert */}
          {expiredCount > 0 && (
            <div className="animate-pulse rounded-xl border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 shrink-0 text-red-500" />
                <div>
                  <p className="font-bold text-red-700">
                    Férias Vencidas - Risco de Pagamento em Dobro
                  </p>
                  <p className="text-sm text-red-600">
                    {expiredCount} {expiredCount === 1 ? 'período aquisitivo vencido' : 'períodos aquisitivos vencidos'}{' '}
                    sem férias registradas. A CLT exige concessão antes do prazo limite.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Colaborador</p>
              <p className="mt-1 font-semibold text-slate-800">{selectedEmp.name}</p>
              <p className="text-sm text-slate-500">{selectedEmp.position} · {selectedEmp.department}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Data de Admissão</p>
              <p className="mt-1 font-semibold text-slate-800">{formatDateBR(selectedEmp.admission_date)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Férias Registradas</p>
              <p className="mt-1 font-semibold text-slate-800">{empVacations.length}</p>
            </div>
          </div>

          {/* Aquisitive Periods */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700">Períodos Aquisitivos</h3>
            {periods.map((period) => {
              const periodVacs = empVacations.filter(
                (v) => v.aquisitive_period_start === period.start,
              );
              return (
                <div
                  key={period.index}
                  className={[
                    'rounded-xl border p-4 shadow-sm transition-all',
                    period.isExpired
                      ? 'border-red-300 bg-red-50'
                      : period.hasVacationRegistered
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className={[
                        'flex h-10 w-10 items-center justify-center rounded-lg font-bold',
                        period.isExpired
                          ? 'bg-red-100 text-red-600'
                          : period.hasVacationRegistered
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-100 text-slate-500',
                      ].join(' ')}>
                        {period.index}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          Período {period.index}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDateBR(period.start)} a {formatDateBR(period.end)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-slate-600">
                          Data limite para concessão: <strong>{formatDateBR(period.concessionDeadline)}</strong>
                        </span>
                      </div>

                      {period.isExpired && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Vencido - Risco de pagamento em dobro
                        </span>
                      )}
                      {period.hasVacationRegistered && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Férias registradas: {periodVacs.length}x
                        </span>
                      )}
                    </div>
                  </div>

                  {periodVacs.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Férias Gozadas
                      </p>
                      <div className="space-y-1">
                        {periodVacs.map((v) => (
                          <div key={v.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">
                              {formatDateBR(v.start_date)} a {formatDateBR(v.end_date)}
                            </span>
                            <span className="font-medium text-slate-700">
                              {v.days_taken} dias
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <Button
                      variant="secondary"
                      onClick={() => openRegisterVacation(period)}
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Registrar Gozo de Férias
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Register Vacation Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar Gozo de Férias"
        subtitle={selectedEmp?.name}
        size="md"
      >
        <form onSubmit={handleSaveVacation} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            Período Aquisitivo: {formatDateBR(vacationForm.aquisitivePeriodStart)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Data de Início">
              <TextInput
                type="date"
                required
                value={vacationForm.startDate}
                onChange={(e) => setVacationForm({ ...vacationForm, startDate: e.target.value })}
              />
            </Field>
            <Field label="Data de Fim">
              <TextInput
                type="date"
                required
                value={vacationForm.endDate}
                onChange={(e) => setVacationForm({ ...vacationForm, endDate: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Férias'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
