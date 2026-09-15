import {
  BarChart3,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Stethoscope,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { Button, Select } from './FormControls';
import {
  computeAquisitivePeriods,
  computeTenure,
  exportCSV,
  formatDateBR,
} from '@/utils/rhCalculations';
import { departments } from '@/types';
import type { LucideIcon } from 'lucide-react';

type ReportType =
  | 'active'
  | 'dismissed'
  | 'vacation_expiring'
  | 'vacation_taken'
  | 'absences'
  | 'certificates';

const reportTypes: { id: ReportType; label: string; icon: LucideIcon }[] = [
  { id: 'active', label: 'Colaboradores Ativos', icon: UserCheck },
  { id: 'dismissed', label: 'Demitidos', icon: UserX },
  { id: 'vacation_expiring', label: 'Férias a Vencer', icon: CalendarX },
  { id: 'vacation_taken', label: 'Férias Gozadas', icon: CheckCircle2 },
  { id: 'absences', label: 'Faltas e Atrasos', icon: ClipboardList },
  { id: 'certificates', label: 'Atestados', icon: Stethoscope },
];

export function ReportsTab() {
  const { employees, vacations, timeCardEntries, certificates } = useData();
  const [reportType, setReportType] = useState<ReportType>('active');
  const [deptFilter, setDeptFilter] = useState('all');

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? '—';
  const empDept = (id: string) => employees.find((e) => e.id === id)?.department ?? '—';

  const filteredEmployees = useMemo(
    () => employees.filter((e) => deptFilter === 'all' || e.department === deptFilter),
    [employees, deptFilter],
  );

  // ---- Data for each report ----

  const activeData = useMemo(
    () => filteredEmployees.filter((e) => e.status === 'active'),
    [filteredEmployees],
  );

  const dismissedData = useMemo(
    () => filteredEmployees.filter((e) => e.status === 'dismissed'),
    [filteredEmployees],
  );

  const vacationExpiringData = useMemo(() => {
    return filteredEmployees
      .filter((e) => e.status === 'active')
      .map((emp) => {
        const empVacs = vacations.filter((v) => v.employee_id === emp.id);
        const periods = computeAquisitivePeriods(emp.admission_date, empVacs);
        const expired = periods.filter((p) => p.isExpired);
        const upcoming = periods.filter(
          (p) => !p.isExpired && !p.hasVacationRegistered,
        );
        return {
          emp,
          expiredCount: expired.length,
          nearestDeadline: upcoming.length > 0
            ? upcoming[0].concessionDeadline
            : expired[0]?.concessionDeadline ?? null,
        };
      })
      .filter((x) => x.expiredCount > 0 || x.nearestDeadline !== null);
  }, [filteredEmployees, vacations]);

  const vacationTakenData = useMemo(() => {
    return vacations
      .filter((v) => {
        const emp = employees.find((e) => e.id === v.employee_id);
        return emp && (deptFilter === 'all' || emp.department === deptFilter);
      })
      .sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [vacations, employees, deptFilter]);

  const absencesData = useMemo(() => {
    return filteredEmployees
      .filter((e) => e.status === 'active')
      .map((emp) => {
        const entries = timeCardEntries.filter((t) => t.employee_id === emp.id);
        const totalLate = entries.reduce((s, t) => s + (t.late_minutes || 0), 0);
        const totalAbsences = entries.filter((t) => t.absent).length;
        const totalOvertime = entries.reduce((s, t) => s + (t.overtime_minutes || 0), 0);
        return { emp, totalLate, totalAbsences, totalOvertime };
      })
      .filter((x) => x.totalAbsences > 0 || x.totalLate > 0)
      .sort((a, b) => b.totalAbsences - a.totalAbsences || b.totalLate - a.totalLate);
  }, [filteredEmployees, timeCardEntries]);

  const certificatesData = useMemo(() => {
    return certificates
      .filter((c) => {
        const emp = employees.find((e) => e.id === c.employee_id);
        return emp && (deptFilter === 'all' || emp.department === deptFilter);
      })
      .sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [certificates, employees, deptFilter]);

  // ---- CSV exports ----

  function handleExport() {
    switch (reportType) {
      case 'active':
        exportCSV(
          'colaboradores_ativos.csv',
          ['Nome', 'Departamento', 'Cargo', 'Salário Base', 'Admissão', 'Tempo de Empresa'],
          activeData.map((e) => [
            e.name, e.department, e.position ?? '',
            e.base_salary.toFixed(2), formatDateBR(e.admission_date),
            computeTenure(e.admission_date),
          ]),
        );
        break;
      case 'dismissed':
        exportCSV(
          'colaboradores_demitidos.csv',
          ['Nome', 'Departamento', 'Cargo', 'Admissão', 'Demissão', 'Tempo de Empresa'],
          dismissedData.map((e) => [
            e.name, e.department, e.position ?? '',
            formatDateBR(e.admission_date), formatDateBR(e.dismissal_date),
            computeTenure(e.admission_date, e.dismissal_date ?? undefined),
          ]),
        );
        break;
      case 'vacation_expiring':
        exportCSV(
          'ferias_a_vencer.csv',
          ['Nome', 'Departamento', 'Períodos Vencidos', 'Data Limite Concessão'],
          vacationExpiringData.map((x) => [
            x.emp.name, x.emp.department,
            String(x.expiredCount), formatDateBR(x.nearestDeadline),
          ]),
        );
        break;
      case 'vacation_taken':
        exportCSV(
          'ferias_gozadas.csv',
          ['Colaborador', 'Departamento', 'Início', 'Fim', 'Dias', 'Período Aquisitivo'],
          vacationTakenData.map((v) => [
            empName(v.employee_id), empDept(v.employee_id),
            formatDateBR(v.start_date), formatDateBR(v.end_date),
            String(v.days_taken), formatDateBR(v.aquisitive_period_start),
          ]),
        );
        break;
      case 'absences':
        exportCSV(
          'faltas_e_atrasos.csv',
          ['Nome', 'Departamento', 'Faltas', 'Minutos de Atraso', 'Minutos de Extras'],
          absencesData.map((x) => [
            x.emp.name, x.emp.department,
            String(x.totalAbsences), String(x.totalLate), String(x.totalOvertime),
          ]),
        );
        break;
      case 'certificates':
        exportCSV(
          'atestados.csv',
          ['Colaborador', 'Departamento', 'Início', 'Dias', 'CID', 'Médico', 'Arquivo'],
          certificatesData.map((c) => [
            empName(c.employee_id), empDept(c.employee_id),
            formatDateBR(c.start_date), String(c.days),
            c.cid ?? '', c.doctor_name ?? '', c.file_name ?? '',
          ]),
        );
        break;
    }
  }

  const reportLabel = reportTypes.find((r) => r.id === reportType)?.label ?? '';
  const hasData =
    (reportType === 'active' && activeData.length > 0) ||
    (reportType === 'dismissed' && dismissedData.length > 0) ||
    (reportType === 'vacation_expiring' && vacationExpiringData.length > 0) ||
    (reportType === 'vacation_taken' && vacationTakenData.length > 0) ||
    (reportType === 'absences' && absencesData.length > 0) ||
    (reportType === 'certificates' && certificatesData.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Central de Relatórios</h2>
          <p className="text-sm text-slate-400">
            Relatórios analíticos com filtros e exportação CSV
          </p>
        </div>
        <Button onClick={handleExport} disabled={!hasData}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Sub-report tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {reportTypes.map((r) => {
          const Icon = r.icon;
          const isActive = reportType === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={[
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Department filter */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <BarChart3 className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-600">Filtrar por departamento:</span>
        <Select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="w-auto"
        >
          <option value="all">Todos</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
      </div>

      {/* Report tables */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-700">{reportLabel}</h3>
        </div>
        <div className="overflow-x-auto">
          {/* Active */}
          {reportType === 'active' && (
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Nome</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Cargo</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Departamento</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-600">Salário Base</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Admissão</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Tempo de Empresa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeData.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{e.name}</td>
                    <td className="px-5 py-3 text-slate-600">{e.position || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{e.department}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700">
                      R$ {e.base_salary.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDateBR(e.admission_date)}</td>
                    <td className="px-5 py-3 text-slate-500">{computeTenure(e.admission_date)}</td>
                  </tr>
                ))}
                {activeData.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Nenhum colaborador ativo.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Dismissed */}
          {reportType === 'dismissed' && (
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Nome</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Cargo</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Departamento</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Admissão</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Demissão</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Tempo de Empresa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dismissedData.map((e) => (
                  <tr key={e.id} className="bg-slate-50/30 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-500 line-through">{e.name}</td>
                    <td className="px-5 py-3 text-slate-400">{e.position || '—'}</td>
                    <td className="px-5 py-3 text-slate-400">{e.department}</td>
                    <td className="px-5 py-3 text-slate-400">{formatDateBR(e.admission_date)}</td>
                    <td className="px-5 py-3 text-red-600">{formatDateBR(e.dismissal_date)}</td>
                    <td className="px-5 py-3 text-slate-400">{computeTenure(e.admission_date, e.dismissal_date ?? undefined)}</td>
                  </tr>
                ))}
                {dismissedData.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Nenhum colaborador demitido.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Vacation Expiring */}
          {reportType === 'vacation_expiring' && (
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Nome</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Departamento</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Períodos Vencidos</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Data Limite para Concessão</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Risco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacationExpiringData.map((x) => (
                  <tr key={x.emp.id} className={x.expiredCount > 0 ? 'bg-red-50/40' : 'hover:bg-slate-50'}>
                    <td className="px-5 py-3 font-medium text-slate-800">{x.emp.name}</td>
                    <td className="px-5 py-3 text-slate-500">{x.emp.department}</td>
                    <td className="px-5 py-3 text-center">
                      {x.expiredCount > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-md bg-red-100 px-2 py-0.5 font-bold text-red-700">
                          {x.expiredCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatDateBR(x.nearestDeadline)}</td>
                    <td className="px-5 py-3 text-center">
                      {x.expiredCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          Pagamento em dobro
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          A vencer
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {vacationExpiringData.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Nenhuma férias a vencer.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Vacation Taken */}
          {reportType === 'vacation_taken' && (
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Colaborador</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Departamento</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Início</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Fim</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Dias</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Período Aquisitivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacationTakenData.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{empName(v.employee_id)}</td>
                    <td className="px-5 py-3 text-slate-500">{empDept(v.employee_id)}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDateBR(v.start_date)}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDateBR(v.end_date)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-md bg-emerald-50 px-2 py-0.5 font-mono font-semibold text-emerald-600">
                        {v.days_taken}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDateBR(v.aquisitive_period_start)}</td>
                  </tr>
                ))}
                {vacationTakenData.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Nenhuma férias registrada.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Absences */}
          {reportType === 'absences' && (
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Nome</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Departamento</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Faltas</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Minutos de Atraso</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Minutos de Extras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {absencesData.map((x) => (
                  <tr key={x.emp.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{x.emp.name}</td>
                    <td className="px-5 py-3 text-slate-500">{x.emp.department}</td>
                    <td className="px-5 py-3 text-center">
                      {x.totalAbsences > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-md bg-red-50 px-2 py-0.5 font-mono font-semibold text-red-600">
                          {x.totalAbsences}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-amber-600">{x.totalLate}</td>
                    <td className="px-5 py-3 text-center font-mono text-emerald-600">{x.totalOvertime}</td>
                  </tr>
                ))}
                {absencesData.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Nenhuma falta ou atraso registrado.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Certificates */}
          {reportType === 'certificates' && (
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Colaborador</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Departamento</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Início</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Dias Abonados</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">CID</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Médico</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificatesData.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{empName(c.employee_id)}</td>
                    <td className="px-5 py-3 text-slate-500">{empDept(c.employee_id)}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDateBR(c.start_date)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-md bg-amber-50 px-2 py-0.5 font-mono font-semibold text-amber-600">
                        {c.days}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.cid || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{c.doctor_name || '—'}</td>
                    <td className="px-5 py-3">
                      {c.file_name ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          {c.file_name.length > 20 ? c.file_name.substring(0, 17) + '...' : c.file_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {certificatesData.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Nenhum atestado lançado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
