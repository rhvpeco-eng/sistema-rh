import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Employee } from '@/types';
import { 
  User, 
  FileText, 
  MapPin,
  Briefcase, 
  DollarSign, 
  Users,
  Save, 
  X, 
  Clock, 
  AlertCircle,
  Calendar,
  Plus,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';

export interface DependentItem {
  id: string;
  name: string;
  relationship: string;
  cpf: string;
  birth_date: string;
  is_ir_dependent: boolean;
}

export interface AdmissionFormData {
  // Pessoais
  name: string;
  birth_date: string;
  gender: string;
  marital_status: string;
  education_level: string;
  mother_name: string;
  email: string;
  phone: string;

  // Documentos
  cpf: string;
  rg: string;
  rg_issuer: string;
  rg_issue_date: string;
  pis: string;
  ctps_number: string;
  ctps_series: string;
  ctps_uf: string;
  cnh: string;
  voter_title: string;

  // Endereço
  address_zip: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;

  // Contrato & RH
  role: string;
  department: string;
  status: string;
  admission_date: string;
  contract_type: string;
  registration_number: string;

  // Experiência
  probation_model: string;
  probation_days_1: number;
  probation_days_2: number;
  probation_end_1: string;
  probation_end_2: string;

  // Jornada & Horários
  schedule_preset: string;
  work_days: string;
  work_start_time: string;
  work_end_time: string;
  lunch_start_time: string;
  lunch_end_time: string;
  friday_end_time: string;
  works_saturday: boolean;

  // Financeiro
  salary: string;
  payment_method: string;
  pix_key: string;

  // Benefícios
  opt_vt: boolean;
  vt_value: string;
  vt_routes: string;
  opt_vr: boolean;
  vr_daily_value: string;
  opt_va: boolean;
  va_monthly_value: string;
  opt_health_plan: boolean;
  health_plan_type: string;
  opt_dental_plan: boolean;
  opt_life_insurance: boolean;

  // Dependentes
  dependents: DependentItem[];
}

const baseFormData: AdmissionFormData = {
  name: '',
  birth_date: '',
  gender: 'M',
  marital_status: 'Solteiro(a)',
  education_level: 'Ensino Médio Completo',
  mother_name: '',
  email: '',
  phone: '',

  cpf: '',
  rg: '',
  rg_issuer: '',
  rg_issue_date: '',
  pis: '',
  ctps_number: '',
  ctps_series: '',
  ctps_uf: 'SP',
  cnh: '',
  voter_title: '',

  address_zip: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: 'SP',

  role: '',
  department: 'Administrativo',
  status: 'active',
  admission_date: new Date().toISOString().split('T')[0],
  contract_type: 'CLT Experiência',
  registration_number: '',

  probation_model: '45_45',
  probation_days_1: 45,
  probation_days_2: 45,
  probation_end_1: '',
  probation_end_2: '',

  schedule_preset: '7_17_16',
  work_days: 'Seg-Qui (07-17) / Sex (07-16)',
  work_start_time: '07:00',
  work_end_time: '17:00',
  lunch_start_time: '12:00',
  lunch_end_time: '13:00',
  friday_end_time: '16:00',
  works_saturday: false,

  salary: '',
  payment_method: 'PIX',
  pix_key: '',

  opt_vt: false,
  vt_value: '',
  vt_routes: '',
  opt_vr: true,
  vr_daily_value: '35,00',
  opt_va: false,
  va_monthly_value: '',
  opt_health_plan: false,
  health_plan_type: 'Enfermaria Padrão',
  opt_dental_plan: false,
  opt_life_insurance: true,

  dependents: [],
};

export const emptyFormData = (): AdmissionFormData => ({ ...baseFormData });

function addDaysISO(startDateStr: string, days: number): string {
  if (!startDateStr || isNaN(days) || days <= 0) return '';
  const [y, m, d] = startDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + (days - 1));
  return date.toISOString().split('T')[0];
}

interface AdmissionFormProps {
  open: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSaved?: () => void;
}

export function AdmissionForm({ open, onClose, employee, onSaved }: AdmissionFormProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'docs' | 'address' | 'job' | 'financial' | 'dependents'>('personal');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdmissionFormData>(emptyFormData());

  // Dependentes temporários para inclusão rápida
  const [newDepName, setNewDepName] = useState('');
  const [newDepRelation, setNewDepRelation] = useState('Filho(a)');
  const [newDepCpf, setNewDepCpf] = useState('');
  const [newDepBirth, setNewDepBirth] = useState('');
  const [newDepIr, setNewDepIr] = useState(true);

  // Recalcula prazos de experiência ao alterar datas/dias
  useEffect(() => {
    if (!formData.admission_date) return;
    const d1 = Number(formData.probation_days_1) || 0;
    const d2 = Number(formData.probation_days_2) || 0;

    const end1 = d1 > 0 ? addDaysISO(formData.admission_date, d1) : '';
    const end2 = (d1 + d2) > 0 ? addDaysISO(formData.admission_date, d1 + d2) : '';

    setFormData(prev => ({
      ...prev,
      probation_end_1: end1,
      probation_end_2: end2,
    }));
  }, [formData.admission_date, formData.probation_days_1, formData.probation_days_2]);

  useEffect(() => {
    if (open) {
      if (employee) {
        const is08 = employee.work_start_time?.startsWith('08') || (employee as any).entry_time?.startsWith('08');
        const admDate = employee.admission_date || new Date().toISOString().split('T')[0];
        const days1 = (employee as any).probation_days_1 || 45;
        const days2 = (employee as any).probation_days_2 || 45;

        setFormData({
          ...emptyFormData(),
          ...employee,
          admission_date: admDate,
          probation_model: (employee as any).probation_model || '45_45',
          probation_days_1: days1,
          probation_days_2: days2,
          probation_end_1: addDaysISO(admDate, days1),
          probation_end_2: addDaysISO(admDate, days1 + days2),
          schedule_preset: is08 ? '8_17' : '7_17_16',
          work_start_time: employee.work_start_time || (employee as any).entry_time || '07:00',
          work_end_time: employee.work_end_time || (employee as any).exit_time || '17:00',
          lunch_start_time: employee.lunch_start_time || (employee as any).lunch_start || '12:00',
          lunch_end_time: employee.lunch_end_time || (employee as any).lunch_end || '13:00',
          friday_end_time: (employee as any).friday_end_time || (is08 ? '17:00' : '16:00'),
          dependents: (employee as any).dependents || [],
        });
      } else {
        const initial = emptyFormData();
        initial.probation_end_1 = addDaysISO(initial.admission_date, 45);
        initial.probation_end_2 = addDaysISO(initial.admission_date, 90);
        setFormData(initial);
      }
      setActiveTab('personal');
      setErrorMessage(null);
    }
  }, [employee, open]);

  if (!open) return null;

  const handleProbationModelChange = (model: string) => {
    let d1 = 45;
    let d2 = 45;
    if (model === '30_30') {
      d1 = 30;
      d2 = 30;
    } else if (model === '30_60') {
      d1 = 30;
      d2 = 60;
    } else if (model === '45_45') {
      d1 = 45;
      d2 = 45;
    }

    setFormData(prev => ({
      ...prev,
      probation_model: model,
      probation_days_1: d1,
      probation_days_2: d2,
      probation_end_1: addDaysISO(prev.admission_date, d1),
      probation_end_2: addDaysISO(prev.admission_date, d1 + d2),
    }));
  };

  const handlePresetChange = (preset: string) => {
    if (preset === '7_17_16') {
      setFormData(prev => ({
        ...prev,
        schedule_preset: '7_17_16',
        work_days: 'Seg-Qui (07-17) / Sex (07-16)',
        work_start_time: '07:00',
        work_end_time: '17:00',
        lunch_start_time: '12:00',
        lunch_end_time: '13:00',
        friday_end_time: '16:00',
        works_saturday: false,
      }));
    } else if (preset === '8_17') {
      setFormData(prev => ({
        ...prev,
        schedule_preset: '8_17',
        work_days: 'Segunda a Sexta',
        work_start_time: '08:00',
        work_end_time: '17:00',
        lunch_start_time: '12:00',
        lunch_end_time: '13:00',
        friday_end_time: '17:00',
        works_saturday: false,
      }));
    } else {
      setFormData(prev => ({ ...prev, schedule_preset: 'custom' }));
    }
  };

  const handleAddDependent = () => {
    if (!newDepName.trim()) {
      alert('Informe o nome do dependente.');
      return;
    }
    const item: DependentItem = {
      id: Date.now().toString(),
      name: newDepName,
      relationship: newDepRelation,
      cpf: newDepCpf,
      birth_date: newDepBirth,
      is_ir_dependent: newDepIr,
    };
    setFormData(prev => ({ ...prev, dependents: [...prev.dependents, item] }));
    setNewDepName('');
    setNewDepCpf('');
    setNewDepBirth('');
  };

  const handleRemoveDependent = (id: string) => {
    setFormData(prev => ({
      ...prev,
      dependents: prev.dependents.filter(d => d.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        name: formData.name,
        birth_date: formData.birth_date,
        gender: formData.gender,
        marital_status: formData.marital_status,
        education_level: formData.education_level,
        mother_name: formData.mother_name,
        email: formData.email,
        phone: formData.phone,

        cpf: formData.cpf,
        rg: formData.rg,
        rg_issuer: formData.rg_issuer,
        rg_issue_date: formData.rg_issue_date,
        pis: formData.pis,
        ctps_number: formData.ctps_number,
        ctps_series: formData.ctps_series,
        ctps_uf: formData.ctps_uf,
        cnh: formData.cnh,
        voter_title: formData.voter_title,

        address_zip: formData.address_zip,
        address_street: formData.address_street,
        address_number: formData.address_number,
        address_complement: formData.address_complement,
        address_neighborhood: formData.address_neighborhood,
        address_city: formData.address_city,
        address_state: formData.address_state,

        role: formData.role,
        department: formData.department,
        status: formData.status || 'active',
        admission_date: formData.admission_date,
        contract_type: formData.contract_type,
        registration_number: formData.registration_number,

        probation_model: formData.probation_model,
        probation_days_1: formData.probation_days_1,
        probation_days_2: formData.probation_days_2,
        probation_end_1: formData.probation_end_1,
        probation_end_2: formData.probation_end_2,

        work_start_time: formData.work_start_time,
        work_end_time: formData.work_end_time,
        lunch_start_time: formData.lunch_start_time,
        lunch_end_time: formData.lunch_end_time,
        friday_end_time: formData.friday_end_time,
        entry_time: formData.work_start_time,
        exit_time: formData.work_end_time,
        lunch_start: formData.lunch_start_time,
        lunch_end: formData.lunch_end_time,

        salary: formData.salary,
        payment_method: formData.payment_method,
        pix_key: formData.pix_key,

        dependents: formData.dependents,
      };

      if (employee?.id) {
        const { error } = await supabase
          .from('employees')
          .update(payload)
          .eq('id', employee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([payload]);
        if (error) throw error;
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao gravar informações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {employee ? 'Editar Ficha Cadastral' : 'Ficha de Admissão de Colaborador'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Padrão Corporativo VP Ecologia — Admissão Completa e Registro
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex border-b border-slate-200 px-6 gap-6 bg-white overflow-x-auto text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`py-3.5 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'personal'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            Dados Pessoais
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`py-3.5 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'docs'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`py-3.5 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'address'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Endereço
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('job')}
            className={`py-3.5 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'job'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Contrato & Jornada
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`py-3.5 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'financial'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Benefícios & Salário
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dependents')}
            className={`py-3.5 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'dependents'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Dependentes ({formData.dependents.length})
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ABA 1: DADOS PESSOAIS */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo do colaborador"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Estado Civil *</label>
                  <select
                    value={formData.marital_status || 'Solteiro(a)'}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="União Estável">União Estável</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="Separado(a)">Separado(a)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Sexo</label>
                  <select
                    value={formData.gender || 'M'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Grau de Instrução</label>
                  <select
                    value={formData.education_level || 'Ensino Médio Completo'}
                    onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Fundamental Incompleto">Fundamental Incompleto</option>
                    <option value="Fundamental Completo">Fundamental Completo</option>
                    <option value="Médio Incompleto">Médio Incompleto</option>
                    <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                    <option value="Superior Incompleto">Superior Incompleto</option>
                    <option value="Superior Completo">Superior Completo</option>
                    <option value="Pós-Graduação">Pós-Graduação / Especialização</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome da Mãe</label>
                  <input
                    type="text"
                    value={formData.mother_name || ''}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    placeholder="Nome completo da mãe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@empresa.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: DOCUMENTOS */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={formData.cpf || ''}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">RG</label>
                  <input
                    type="text"
                    value={formData.rg || ''}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    placeholder="00.000.000-0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Órgão Emissor / UF</label>
                  <input
                    type="text"
                    value={formData.rg_issuer || ''}
                    onChange={(e) => setFormData({ ...formData, rg_issuer: e.target.value })}
                    placeholder="SSP/SP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">PIS / PASEP</label>
                  <input
                    type="text"
                    value={formData.pis || ''}
                    onChange={(e) => setFormData({ ...formData, pis: e.target.value })}
                    placeholder="000.00000.00-0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nº Carteira de Trabalho (CTPS)</label>
                  <input
                    type="text"
                    value={formData.ctps_number || ''}
                    onChange={(e) => setFormData({ ...formData, ctps_number: e.target.value })}
                    placeholder="Nº CTPS ou CTPS Digital"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Série / UF CTPS</label>
                  <input
                    type="text"
                    value={formData.ctps_series || ''}
                    onChange={(e) => setFormData({ ...formData, ctps_series: e.target.value })}
                    placeholder="0001 / SP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">CNH (Se houver)</label>
                  <input
                    type="text"
                    value={formData.cnh || ''}
                    onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                    placeholder="Número do documento"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Título de Eleitor</label>
                  <input
                    type="text"
                    value={formData.voter_title || ''}
                    onChange={(e) => setFormData({ ...formData, voter_title: e.target.value })}
                    placeholder="Número da inscrição"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: ENDEREÇO */}
          {activeTab === 'address' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">CEP</label>
                  <input
                    type="text"
                    value={formData.address_zip || ''}
                    onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                    placeholder="00000-000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Logradouro / Rua</label>
                  <input
                    type="text"
                    value={formData.address_street || ''}
                    onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                    placeholder="Ex: Rua, Avenida..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Número</label>
                  <input
                    type="text"
                    value={formData.address_number || ''}
                    onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                    placeholder="Ex: 100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Complemento</label>
                  <input
                    type="text"
                    value={formData.address_complement || ''}
                    onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                    placeholder="Apto, Bloco..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formData.address_neighborhood || ''}
                    onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                    placeholder="Bairro"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.address_city || ''}
                    onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                    placeholder="Cidade"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.address_state || 'SP'}
                    onChange={(e) => setFormData({ ...formData, address_state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: CONTRATO, EXPERIÊNCIA & JORNADA */}
          {activeTab === 'job' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cargo / Função *</label>
                  <input
                    type="text"
                    required
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Ex: Auxiliar de Campo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Departamento</label>
                  <select
                    value={formData.department || 'Administrativo'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Administrativo">Administrativo</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Meio Ambiente">Meio Ambiente</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Financeiro">Financeiro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Data de Admissão *</label>
                  <input
                    type="date"
                    required
                    value={formData.admission_date || ''}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* CARD DE CONTROLE DE EXPERIÊNCIA */}
              <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-bold text-slate-900">
                      CRITÉRIO DO CONTRATO DE EXPERIÊNCIA (CLT)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                    Limite Máximo CLT: 90 dias
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => handleProbationModelChange('45_45')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.probation_model === '45_45'
                        ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">45 + 45 Dias</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Total: 90 dias</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProbationModelChange('30_30')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.probation_model === '30_30'
                        ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">30 + 30 Dias</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Total: 60 dias</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProbationModelChange('30_60')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.probation_model === '30_60'
                        ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">30 + 60 Dias</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Total: 90 dias</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, probation_model: 'custom' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.probation_model === 'custom'
                        ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">Personalizado</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Digitar dias</div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase">1º Período de Experiência</span>
                      {formData.probation_model === 'custom' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={formData.probation_days_1}
                            onChange={(e) => setFormData({ ...formData, probation_days_1: Number(e.target.value) })}
                            className="w-14 border rounded px-1 text-xs text-center py-0.5"
                          />
                          <span className="text-xs text-slate-500">dias</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">{formData.probation_days_1} dias</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-600 mb-1">Vencimento do 1º Período:</label>
                      <input
                        type="date"
                        readOnly
                        value={formData.probation_end_1 || ''}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase">2º Período de Experiência (Término)</span>
                      {formData.probation_model === 'custom' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={formData.probation_days_2}
                            onChange={(e) => setFormData({ ...formData, probation_days_2: Number(e.target.value) })}
                            className="w-14 border rounded px-1 text-xs text-center py-0.5"
                          />
                          <span className="text-xs text-slate-500">dias</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">{formData.probation_days_2} dias</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Vencimento do 2º Período (Final):</label>
                      <input
                        type="date"
                        readOnly
                        value={formData.probation_end_2 || ''}
                        className="w-full bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-emerald-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SELEÇÃO DE JORNADA */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>SELECIONE A GRADE DE HORÁRIO DE TRABALHO</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => handlePresetChange('7_17_16')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.schedule_preset === '7_17_16'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">07:00 às 17:00 (Sexta 16:00)</span>
                      <input
                        type="radio"
                        name="schedule_preset"
                        checked={formData.schedule_preset === '7_17_16'}
                        onChange={() => handlePresetChange('7_17_16')}
                        className="text-indigo-600"
                      />
                    </div>
                    <p className="text-xs text-slate-600">
                      Seg a Qui: 07:00–17:00 (9h) | Sex: 07:00–16:00 (8h)
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      44h Semanais — Padrão Operacional
                    </span>
                  </div>

                  <div
                    onClick={() => handlePresetChange('8_17')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.schedule_preset === '8_17'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">08:00 às 17:00 (Segunda a Sexta)</span>
                      <input
                        type="radio"
                        name="schedule_preset"
                        checked={formData.schedule_preset === '8_17'}
                        onChange={() => handlePresetChange('8_17')}
                        className="text-indigo-600"
                      />
                    </div>
                    <p className="text-xs text-slate-600">
                      Seg a Sex: 08:00–17:00 com 1h de almoço (8h diárias)
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      Padrão Administrativo
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Horário de Segunda a Quinta-feira:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Entrada</label>
                        <input
                          type="time"
                          value={formData.work_start_time || '07:00'}
                          onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Saída Almoço</label>
                        <input
                          type="time"
                          value={formData.lunch_start_time || '12:00'}
                          onChange={(e) => setFormData({ ...formData, lunch_start_time: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Retorno Almoço</label>
                        <input
                          type="time"
                          value={formData.lunch_end_time || '13:00'}
                          onChange={(e) => setFormData({ ...formData, lunch_end_time: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Saída Normal</label>
                        <input
                          type="time"
                          value={formData.work_end_time || '17:00'}
                          onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Saída Específica na Sexta-feira
                      </span>
                      <span className="text-[11px] text-amber-700 font-medium">
                        {formData.schedule_preset === '7_17_16' ? 'Sexta Curta (16:00)' : 'Mesmo horário (17:00)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Horário de Saída na Sexta</label>
                        <input
                          type="time"
                          value={formData.friday_end_time || '16:00'}
                          onChange={(e) => setFormData({ ...formData, friday_end_time: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: BENEFÍCIOS & SALÁRIO */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              {/* Salário e Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Salário Base (R$) *</label>
                  <input
                    type="text"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Forma de Pagamento</label>
                  <select
                    value={formData.payment_method || 'PIX'}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Conta Corrente">Conta Corrente</option>
                    <option value="Conta Salário">Conta Salário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Chave PIX / Dados Bancários</label>
                  <input
                    type="text"
                    value={formData.pix_key || ''}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    placeholder="Chave PIX ou Agência e Conta"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Pacote de Benefícios Admissional */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Benefícios Optados pelo Colaborador
                </span>

                <div className="space-y-3">
                  {/* Vale Transporte */}
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.opt_vt}
                        onChange={(e) => setFormData({ ...formData, opt_vt: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900">Vale Transporte (VT)</span>
                        <p className="text-xs text-slate-500">Desconto legal de até 6% em folha</p>
                      </div>
                    </label>
                    {formData.opt_vt && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Linhas / Trajeto"
                          value={formData.vt_routes}
                          onChange={(e) => setFormData({ ...formData, vt_routes: e.target.value })}
                          className="border rounded-lg px-2.5 py-1 text-xs outline-none w-44"
                        />
                        <input
                          type="text"
                          placeholder="R$ / dia"
                          value={formData.vt_value}
                          onChange={(e) => setFormData({ ...formData, vt_value: e.target.value })}
                          className="border rounded-lg px-2.5 py-1 text-xs outline-none w-20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Vale Refeição */}
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.opt_vr}
                        onChange={(e) => setFormData({ ...formData, opt_vr: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900">Vale Refeição (VR)</span>
                        <p className="text-xs text-slate-500">Cartão alimentação ou refeição diária</p>
                      </div>
                    </label>
                    {formData.opt_vr && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Valor Diário R$:</span>
                        <input
                          type="text"
                          value={formData.vr_daily_value}
                          onChange={(e) => setFormData({ ...formData, vr_daily_value: e.target.value })}
                          className="border rounded-lg px-2.5 py-1 text-xs outline-none w-24 font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Vale Alimentação */}
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.opt_va}
                        onChange={(e) => setFormData({ ...formData, opt_va: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900">Vale Alimentação / Cesta Básica (VA)</span>
                        <p className="text-xs text-slate-500">Auxílio mercado mensal</p>
                      </div>
                    </label>
                    {formData.opt_va && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Valor Mensal R$:</span>
                        <input
                          type="text"
                          value={formData.va_monthly_value}
                          onChange={(e) => setFormData({ ...formData, va_monthly_value: e.target.value })}
                          placeholder="Ex: 250,00"
                          className="border rounded-lg px-2.5 py-1 text-xs outline-none w-24 font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Convênio Médico & Odontológico */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                      <label className="flex items-center gap-3 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={formData.opt_health_plan}
                          onChange={(e) => setFormData({ ...formData, opt_health_plan: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm font-bold text-slate-900">Plano de Saúde</span>
                      </label>
                      {formData.opt_health_plan && (
                        <select
                          value={formData.health_plan_type}
                          onChange={(e) => setFormData({ ...formData, health_plan_type: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1 text-xs outline-none"
                        >
                          <option value="Enfermaria Padrão">Enfermaria (Co-participativo)</option>
                          <option value="Apartamento Individual">Apartamento Individual</option>
                        </select>
                      )}
                    </div>

                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.opt_dental_plan}
                          onChange={(e) => setFormData({ ...formData, opt_dental_plan: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm font-bold text-slate-900">Plano Odontológico</span>
                      </label>
                      <span className="text-xs text-slate-400">Opcional</span>
                    </div>
                  </div>

                  {/* Seguro de Vida */}
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.opt_life_insurance}
                        onChange={(e) => setFormData({ ...formData, opt_life_insurance: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900">Seguro de Vida em Grupo</span>
                        <p className="text-xs text-slate-500">Apólice padrão CCT / Operacional</p>
                      </div>
                    </label>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                      Incluso
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 6: DEPENDENTES */}
          {activeTab === 'dependents' && (
            <div className="space-y-6">
              {/* Formulário para Inserir Novo Dependente */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Adicionar Novo Dependente
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nome Completo do Dependente</label>
                    <input
                      type="text"
                      value={newDepName}
                      onChange={(e) => setNewDepName(e.target.value)}
                      placeholder="Nome do dependente"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Parentesco</label>
                    <select
                      value={newDepRelation}
                      onChange={(e) => setNewDepRelation(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="Filho(a)">Filho(a)</option>
                      <option value="Cônjuge / Companheiro(a)">Cônjuge / Companheiro(a)</option>
                      <option value="Enteado(a)">Enteado(a)</option>
                      <option value="Pai / Mãe">Pai / Mãe</option>
                      <option value="Tutelado(a)">Tutelado(a)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">CPF do Dependente</label>
                    <input
                      type="text"
                      value={newDepCpf}
                      onChange={(e) => setNewDepCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={newDepBirth}
                      onChange={(e) => setNewDepBirth(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={newDepIr}
                        onChange={(e) => setNewDepIr(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      Deduz IR / Sal.-Família
                    </label>
                    <button
                      type="button"
                      onClick={handleAddDependent}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Incluir
                    </button>
                  </div>
                </div>
              </div>

              {/* Listagem de Dependentes */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Dependentes Cadastrados ({formData.dependents.length})
                </span>

                {formData.dependents.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-sm text-slate-400">Nenhum dependente vinculado a este colaborador.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.dependents.map((dep) => (
                      <div
                        key={dep.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-all shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{dep.name}</span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {dep.relationship}
                            </span>
                            {dep.is_ir_dependent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Dedução IR
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-4">
                            <span>CPF: {dep.cpf || 'Não informado'}</span>
                            <span>Nascimento: {dep.birth_date || 'Não informado'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependent(dep.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remover dependente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rodapé com Botões */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Ficha Completa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdmissionForm;