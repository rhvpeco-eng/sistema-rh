import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import type { Employee } from '@/types';
import { computeTenure, formatDateBR, todayISO } from '@/utils/rhCalculations';
import { AdmissionForm } from './AdmissionForm';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  UserMinus, 
  AlertCircle,
  FileCheck
} from 'lucide-react';

export function EmployeesTab() {
  const { employees, dismissEmployee } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'dismissed'>('all');
  
  // Controle do Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Filtro de Busca
  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.cpf.includes(search) ||
        (e.role && e.role.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        statusFilter === 'all' ? true : e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [employees, search, statusFilter]);

  const handleNew = () => {
    setSelectedEmployee(null);
    setModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const handleDismiss = async (employee: Employee) => {
    const reason = window.prompt(
      `Desligamento de ${employee.name}\n\nInforme o motivo do desligamento:`
    );
    if (!reason) return;
    try {
      await dismissEmployee(employee.id, todayISO(), reason);
      alert('Colaborador desligado com sucesso.');
    } catch (err: any) {
      alert('Erro ao desligar: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cadastro de Colaboradores</h1>
          <p className="text-sm text-slate-500">Admissão completa, edição e desligamento — Padrão Corporativo</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Somente Ativos</option>
          <option value="dismissed">Desligados</option>
        </select>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Colaborador</th>
                <th className="py-3.5 px-4">Cargo</th>
                <th className="py-3.5 px-4">Departamento</th>
                <th className="py-3.5 px-4">Admissão</th>
                <th className="py-3.5 px-4">Tempo de Casa</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum colaborador encontrado
                  </td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{emp.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{emp.cpf || 'Sem CPF'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {emp.role || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {emp.department || 'Administrativo'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {emp.admission_date ? formatDateBR(emp.admission_date) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {emp.admission_date ? computeTenure(emp.admission_date) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {emp.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Desligado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(emp)}
                          title="Editar Colaborador"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {emp.status === 'active' && (
                          <button
                            onClick={() => handleDismiss(emp)}
                            title="Desligar Colaborador"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Admissão / Edição Direto */}
      <AdmissionForm
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        onSaved={() => {
          setModalOpen(false);
          setSelectedEmployee(null);
        }}
      />
    </div>
  );
}

export default EmployeesTab;