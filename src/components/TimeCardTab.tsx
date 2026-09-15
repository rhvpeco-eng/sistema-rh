import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Employee, TimeCardEntry } from '@/types';
import { PdfImportModal } from './PdfImportModal';
import { 
  Clock, 
  AlertCircle, 
  Save, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  FileUp, 
  UserCheck
} from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const YEARS = [2024, 2025, 2026, 2027];

export function TimeCardTab() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [currentMonthEntries, setCurrentMonthEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status !== 'inactive');
  }, [employees]);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmpId) {
      fetchEntries(selectedEmpId, selectedMonth, selectedYear);
    }
  }, [selectedEmpId, selectedMonth, selectedYear]);

  async function fetchEmployees() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      if (error) throw error;
      if (data) {
        setEmployees(data);
        if (data.length > 0 && !selectedEmpId) {
          setSelectedEmpId(data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar colaboradores:', err);
    }
  }

  async function fetchEntries(empId: string, month: number, year: number) {
    setLoading(true);
    try {
      const startDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayNum = new Date(year, month + 1, 0).getDate();
      const endDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('time_card_entries')
        .select('*')
        .eq('employee_id', empId)
        .gte('reference_date', startDay)
        .lte('reference_date', endDay);

      if (error) throw error;

      const normalized = (data || []).map((item: any) => ({
        id: item.id,
        employee_id: item.employee_id,
        date: item.reference_date,
        entry1: item.entry1 || '',
        exitLunch: item.exit_lunch || '',
        returnLunch: item.return_lunch || '',
        exit2: item.exit2 || '',
      }));

      setCurrentMonthEntries(normalized);
    } catch (err: any) {
      console.error('Erro ao buscar registros:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleTimeChange(dateStr: string, field: 'entry1' | 'exitLunch' | 'returnLunch' | 'exit2', val: string) {
    const next = [...currentMonthEntries];
    const idx = next.findIndex(e => e.date === dateStr);
    if (idx >= 0) {
      next[idx] = { ...next[idx], [field]: val };
    } else {
      next.push({
        id: crypto.randomUUID(),
        employee_id: selectedEmpId,
        date: dateStr,
        entry1: field === 'entry1' ? val : '',
        exitLunch: field === 'exitLunch' ? val : '',
        returnLunch: field === 'returnLunch' ? val : '',
        exit2: field === 'exit2' ? val : '',
      });
    }
    setCurrentMonthEntries(next);
  }

  async function handleApplyImport(result: any) {
    const { entries, resolvedEmployeeId } = result;
    const empId = resolvedEmployeeId || selectedEmpId;
    setSelectedEmpId(empId);

    const emp = activeEmployees.find((e) => e.id === empId) ?? null;
    if (!emp) {
      alert('Colaborador não encontrado.');
      return;
    }

    setSaving(true);
    try {
      if (!entries || entries.length === 0) {
        alert('Nenhum registro encontrado no documento.');
        setSaving(false);
        return;
      }

      let importedCount = 0;
      const updatedEntries = [...currentMonthEntries];

      for (const entry of entries) {
        const dayMatch = String(entry.date).match(/(\d{1,2})$/);
        if (!dayMatch) continue;

        const dayNum = parseInt(dayMatch[1], 10);
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

        const targetMonthStr = String(selectedMonth + 1).padStart(2, '0');
        const targetDayStr = String(dayNum).padStart(2, '0');
        const normalizedDate = `${selectedYear}-${targetMonthStr}-${targetDayStr}`;

        const existingIndex = updatedEntries.findIndex((e) => e.date === normalizedDate);

        const newEntryData = {
          employee_id: empId,
          date: normalizedDate,
          entry1: entry.entry1 || '',
          exitLunch: entry.exitLunch || '',
          returnLunch: entry.returnLunch || '',
          exit2: entry.exit2 || '',
        };

        if (existingIndex >= 0) {
          updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], ...newEntryData };
        } else {
          updatedEntries.push(newEntryData);
        }

        importedCount++;
      }

      setCurrentMonthEntries(updatedEntries);
      setFeedbackMessage({
        type: 'success',
        text: `${importedCount} dias importados com sucesso para ${MONTHS[selectedMonth]} de ${selectedYear}! Clique em "Salvar Alterações".`
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      console.error('Erro ao aplicar dados do PDF:', err);
      alert('Erro ao importar dados do PDF.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveChanges() {
    if (!selectedEmpId) return;
    setSaving(true);
    try {
      const validEntries = currentMonthEntries.filter(
        e => (e.entry1 && e.entry1.trim()) || 
             (e.exitLunch && e.exitLunch.trim()) || 
             (e.returnLunch && e.returnLunch.trim()) || 
             (e.exit2 && e.exit2.trim())
      );

      if (validEntries.length === 0) {
        alert('Não há registros para salvar.');
        setSaving(false);
        return;
      }

      for (const e of validEntries) {
        const dayDate = new Date(e.date + 'T00:00:00');
        const dayOfWeek = dayDate.getDay();
        const metrics = calculateDayMetricsRaw(e, dayOfWeek, selectedEmp);

        const payload = {
          employee_id: selectedEmpId,
          reference_date: e.date,
          entry1: e.entry1 || null,
          exit_lunch: e.exitLunch || null,
          return_lunch: e.returnLunch || null,
          exit2: e.exit2 || null,
          overtime_minutes: metrics.overtimeMinutes,
          late_minutes: metrics.lateMinutes,
          absent: metrics.absent,
        };

        const { data: existing } = await supabase
          .from('time_card_entries')
          .select('id')
          .eq('employee_id', selectedEmpId)
          .eq('reference_date', e.date)
          .maybeSingle();

        if (existing?.id) {
          const { error: updateErr } = await supabase
            .from('time_card_entries')
            .update(payload)
            .eq('id', existing.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from('time_card_entries')
            .insert([payload]);
          if (insertErr) throw insertErr;
        }
      }

      await fetchEntries(selectedEmpId, selectedMonth, selectedYear);

      setFeedbackMessage({ type: 'success', text: 'Cartão de ponto salvo no banco com sucesso!' });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro detalhado ao salvar no Supabase:', err);
      alert(`Erro ao salvar no banco: ${err.message || 'Falha na gravação'}`);
    } finally {
      setSaving(false);
    }
  }

  const daysInMonth = useMemo(() => {
    const count = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  // Função dinâmica que respeita a escala de cada colaborador cadastrado
  function calculateDayMetricsRaw(entry?: any, dayOfWeek: number = 1, emp?: any) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!entry || (!entry.entry1 && !entry.exit2 && !entry.exitLunch)) {
      return { 
        workedMin: 0, 
        overtimeMinutes: 0, 
        lateMinutes: 0, 
        absent: !isWeekend 
      };
    }

    const toMin = (t?: string) => {
      if (!t || !t.includes(':')) return null;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const e1 = toMin(entry.entry1);
    const lOut = toMin(entry.exitLunch);
    const lIn = toMin(entry.returnLunch);
    const e2 = toMin(entry.exit2);

    let workedMin = 0;

    if (e1 !== null && lOut !== null && lIn !== null && e2 !== null) {
      workedMin = (lOut - e1) + (e2 - lIn);
    } else if (e1 !== null && e2 !== null) {
      if (lOut !== null && lIn !== null && lIn > lOut) {
        workedMin = (lOut - e1) + (e2 - lIn);
      } else {
        workedMin = e2 - e1;
      }
    } else if (e1 !== null && lOut !== null) {
      workedMin = lOut - e1;
    }

    if (workedMin < 0) workedMin = 0;

    // Fim de semana trabalhado: 100% horas extras
    if (isWeekend) {
      return {
        workedMin,
        overtimeMinutes: workedMin,
        lateMinutes: 0,
        absent: false
      };
    }

    // Detecção da escala cadastrada no perfil do funcionário:
    // Padrão 1: Entrada 08:00 (Segunda a Sexta 08:00 às 17:00 com 1h de almoço = 8h diárias)
    // Padrão 2: Entrada 07:00 (Segunda a Quinta 07:00 às 17:00 = 9h / Sexta 07:00 às 16:00 = 8h)
    const empEntryStr = emp?.work_start_time || emp?.entry_time || '07:00';
    const isSchedule08 = empEntryStr.startsWith('08') || (emp?.schedule && emp?.schedule.includes('08:00'));

    let dailyTargetMinutes = 480; // 8 horas padrão
    let expectedEntryMinutes = 420; // 07:00

    if (isSchedule08) {
      dailyTargetMinutes = 480; // 8 horas todos os dias (seg a sex)
      expectedEntryMinutes = 480; // 08:00
    } else {
      // Escala 07:00: Sexta = 8h (480 min), Seg-Qui = 9h (540 min)
      dailyTargetMinutes = (dayOfWeek === 5) ? 480 : 540;
      expectedEntryMinutes = 420; // 07:00
    }

    // Tolerância de 5 minutos na entrada
    let lateMinutes = 0;
    if (e1 !== null && e1 > (expectedEntryMinutes + 5)) {
      lateMinutes += (e1 - expectedEntryMinutes);
    }

    // Intervalo excedente superior a 65 min
    if (lOut !== null && lIn !== null && (lIn - lOut) > 65) {
      lateMinutes += (lIn - lOut - 60);
    }

    // Horas extras: o que passar da carga diária prevista
    let overtimeMinutes = workedMin > dailyTargetMinutes ? workedMin - dailyTargetMinutes : 0;

    return {
      workedMin,
      overtimeMinutes,
      lateMinutes,
      absent: false
    };
  }

  function calculateDayMetrics(entry?: any, dayOfWeek: number = 1) {
    const raw = calculateDayMetricsRaw(entry, dayOfWeek, selectedEmp);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (raw.absent) {
      return { workedMin: 0, overtime: '—', delay: '—', absent: true };
    }

    const formatMin = (m: number) => {
      if (m <= 0) return '—';
      const h = Math.floor(m / 60);
      const min = m % 60;
      return h > 0 ? `${h}h${min > 0 ? ` ${min}m` : ''}` : `${min}m`;
    };

    return {
      workedMin: raw.workedMin,
      overtime: formatMin(raw.overtimeMinutes),
      delay: formatMin(raw.lateMinutes),
      absent: false
    };
  }

  const stats = useMemo(() => {
    let totalWorkedMinutes = 0;
    let totalExtraMinutes = 0;
    let absentDays = 0;

    daysInMonth.forEach(day => {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = currentMonthEntries.find(e => e.date === dateStr);
      const dayDate = new Date(selectedYear, selectedMonth, day);
      const dayOfWeek = dayDate.getDay();

      const raw = calculateDayMetricsRaw(entry, dayOfWeek, selectedEmp);
      if (raw.absent) absentDays++;
      totalWorkedMinutes += raw.workedMin;
      totalExtraMinutes += raw.overtimeMinutes;
    });

    const hours = Math.floor(totalWorkedMinutes / 60);
    const minutes = totalWorkedMinutes % 60;

    const extraH = Math.floor(totalExtraMinutes / 60);
    const extraM = totalExtraMinutes % 60;

    return {
      workedDisplay: `${hours}h ${minutes}min`,
      overtimeDisplay: `${extraH}h ${extraM}min`,
      absentDays
    };
  }, [daysInMonth, currentMonthEntries, selectedYear, selectedMonth, selectedEmp]);

  // Mensagem dinâmica com a escala de trabalho do colaborador selecionado
  const scheduleDescription = useMemo(() => {
    const empEntry = selectedEmp?.work_start_time || selectedEmp?.entry_time || '07:00';
    if (empEntry.startsWith('08')) {
      return 'Grade: Seg-Sex 08:00–17:00 (8h diárias) | Almoço: 1h';
    }
    return 'Grade: Seg-Qui 07:00–17:00 (9h) | Sex 07:00–16:00 (8h) | Almoço: 1h';
  }, [selectedEmp]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cartão de Ponto</h2>
          <p className="text-sm font-medium text-slate-600 mt-0.5">{scheduleDescription}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium transition-all shadow-sm"
          >
            <FileUp className="w-4 h-4" />
            Importar PDF de Ponto Escaneado
          </button>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Gravando no Banco...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Colaborador
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-slate-900 outline-none"
          >
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Mês de Referência
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-slate-900 outline-none"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Ano
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-slate-900 outline-none"
          >
            {YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horas Trabalhadas</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.workedDisplay}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Horas Extras</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.overtimeDisplay}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Faltas / Sem Registro</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.absentDays} dias</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Colaborador</span>
            <p className="text-sm font-semibold text-slate-900">{selectedEmp?.status === 'active' ? 'Ativo' : 'Regular'}</p>
          </div>
        </div>
      </div>

      {/* Grade Diária */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            Grade de {MONTHS[selectedMonth]} {selectedYear}
          </h3>
          <span className="text-xs text-slate-500">{daysInMonth.length} dias no período</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Dia</th>
                <th className="py-3.5 px-2">Entrada 1</th>
                <th className="py-3.5 px-2">Saída Almoço</th>
                <th className="py-3.5 px-2">Retorno</th>
                <th className="py-3.5 px-2">Saída 2</th>
                <th className="py-3.5 px-2 text-center text-emerald-700 font-bold">Extras</th>
                <th className="py-3.5 px-2 text-center text-amber-700 font-bold">Atraso</th>
                <th className="py-3.5 px-2 text-center text-rose-700 font-bold">Falta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {daysInMonth.map((day) => {
                const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const entry = currentMonthEntries.find((e) => e.date === dateStr);
                const dayDate = new Date(selectedYear, selectedMonth, day);
                const dayOfWeek = dayDate.getDay();
                const dayOfWeekStr = dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                const metrics = calculateDayMetrics(entry, dayOfWeek);

                return (
                  <tr key={day} className={isWeekend ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50/80'}>
                    <td className="py-2.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      <span className="inline-block w-6 font-bold">{String(day).padStart(2, '0')}</span>
                      <span className={`text-xs ml-1 font-semibold ${isWeekend ? 'text-amber-600' : 'text-slate-400'}`}>
                        {dayOfWeekStr}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="time"
                        value={entry?.entry1 || ''}
                        onChange={(e) => handleTimeChange(dateStr, 'entry1', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none w-24"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="time"
                        value={entry?.exitLunch || ''}
                        onChange={(e) => handleTimeChange(dateStr, 'exitLunch', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none w-24"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="time"
                        value={entry?.returnLunch || ''}
                        onChange={(e) => handleTimeChange(dateStr, 'returnLunch', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none w-24"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="time"
                        value={entry?.exit2 || ''}
                        onChange={(e) => handleTimeChange(dateStr, 'exit2', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none w-24"
                      />
                    </td>
                    
                    <td className="py-2 px-2 text-center text-xs font-bold text-emerald-600">
                      {metrics.overtime}
                    </td>

                    <td className="py-2 px-2 text-center text-xs font-semibold text-amber-600">
                      {metrics.delay}
                    </td>

                    <td className="py-2 px-2 text-center text-xs font-semibold text-rose-600">
                      {metrics.absent ? 'Sim' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isPdfModalOpen && (
        <PdfImportModal
          open={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          employee={selectedEmp}
          employees={activeEmployees}
          onApply={handleApplyImport}
        />
      )}
    </div>
  );
}

export default TimeCardTab;