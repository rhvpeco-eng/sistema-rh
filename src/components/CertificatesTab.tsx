import {
  FileText,
  Eye,
  FileUp,
  Plus,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { Button, Field, Select, TextInput } from './FormControls';
import { Modal } from './Modal';
import { formatDateBR, todayISO } from '@/utils/rhCalculations';
import type { MedicalCertificate } from '@/types';

export function CertificatesTab() {
  const { employees, certificates, addCertificate, deleteCertificate } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<MedicalCertificate | null>(null);
  const [selectedEmpFilter, setSelectedEmpFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    cid: '',
    start_date: todayISO(),
    days: 1,
    doctor_name: '',
    file_name: '',
    file_data: '',
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees],
  );

  const filteredCerts = useMemo(() => {
    if (selectedEmpFilter === 'all') return certificates;
    return certificates.filter((c) => c.employee_id === selectedEmpFilter);
  }, [certificates, selectedEmpFilter]);

  function empName(id: string): string {
    return employees.find((e) => e.id === id)?.name ?? 'Colaborador';
  }

  function empDept(id: string): string {
    return employees.find((e) => e.id === id)?.department ?? '—';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, file_name: file.name }));
    // Read as data URL for simulated preview
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, file_data: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addCertificate({
        employee_id: form.employee_id,
        cid: form.cid || null,
        start_date: form.start_date,
        days: form.days,
        doctor_name: form.doctor_name || null,
        file_name: form.file_name || null,
        file_data: form.file_data || null,
      });
      setModalOpen(false);
      setForm({
        employee_id: '',
        cid: '',
        start_date: todayISO(),
        days: 1,
        doctor_name: '',
        file_name: '',
        file_data: '',
      });
    } catch {
      alert('Erro ao lançar atestado.');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este atestado?')) return;
    try {
      await deleteCertificate(id);
    } catch {
      alert('Erro ao excluir atestado.');
    }
  }

  function openPreview(cert: MedicalCertificate) {
    setPreviewCert(cert);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Atestados Médicos</h2>
          <p className="text-sm text-slate-400">
            Lançamento de afastamentos e upload de documentos
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Lançar Atestado
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Field label="Filtrar por Colaborador" className="max-w-md">
          <Select
            value={selectedEmpFilter}
            onChange={(e) => setSelectedEmpFilter(e.target.value)}
          >
            <option value="all">Todos os Colaboradores</option>
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-5 py-3 font-semibold text-slate-600">Colaborador</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Departamento</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Início</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Dias</th>
                <th className="px-5 py-3 font-semibold text-slate-600">CID</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Médico</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Documento</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCerts.map((cert) => (
                <tr key={cert.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {empName(cert.employee_id)}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{empDept(cert.employee_id)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDateBR(cert.start_date)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-md bg-amber-50 px-2 py-0.5 font-mono font-semibold text-amber-600">
                      {cert.days}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {cert.cid ? (
                      <span className="font-mono text-xs">{cert.cid}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{cert.doctor_name || '—'}</td>
                  <td className="px-5 py-3">
                    {cert.file_name ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        {cert.file_name.length > 20
                          ? cert.file_name.substring(0, 17) + '...'
                          : cert.file_name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">Sem arquivo</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {cert.file_name && (
                        <button
                          onClick={() => openPreview(cert)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          title="Visualizar PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCerts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <Stethoscope className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    Nenhum atestado lançado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Lançar Atestado Médico"
        subtitle="Registre o afastamento e anexe o documento"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Colaborador" className="sm:col-span-2">
              <Select
                required
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="CID (opcional)">
              <TextInput
                value={form.cid}
                onChange={(e) => setForm({ ...form, cid: e.target.value })}
                placeholder="Ex: M54.5"
              />
            </Field>
            <Field label="Data de Início">
              <TextInput
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </Field>
            <Field label="Quantidade de Dias">
              <TextInput
                type="number"
                min="1"
                required
                value={form.days}
                onChange={(e) => setForm({ ...form, days: parseInt(e.target.value) || 1 })}
              />
            </Field>
            <Field label="Médico Emissor">
              <TextInput
                value={form.doctor_name}
                onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
                placeholder="Dr(a). Nome do médico"
              />
            </Field>
          </div>

          {/* Upload field */}
          <Field label="Upload de Arquivo PDF">
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-slate-400">
              {form.file_name ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{form.file_name}</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, file_name: '', file_data: '' })}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2">
                  <FileUp className="h-8 w-8 text-slate-300" />
                  <span className="text-sm text-slate-500">
                    Clique para anexar o atestado (PDF)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </Field>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Lançar Atestado'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PDF Preview Modal */}
      <Modal
        open={previewCert !== null}
        onClose={() => setPreviewCert(null)}
        title="Visualizar Documento"
        subtitle={previewCert ? empName(previewCert.employee_id) : ''}
        size="lg"
      >
        {previewCert && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400">Arquivo: </span>
                <span className="font-medium text-slate-700">{previewCert.file_name}</span>
              </div>
              <div>
                <span className="text-slate-400">Data: </span>
                <span className="font-medium text-slate-700">{formatDateBR(previewCert.start_date)}</span>
              </div>
              <div>
                <span className="text-slate-400">Dias: </span>
                <span className="font-medium text-slate-700">{previewCert.days}</span>
              </div>
              <div>
                <span className="text-slate-400">Médico: </span>
                <span className="font-medium text-slate-700">{previewCert.doctor_name || '—'}</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {previewCert.file_data ? (
                <iframe
                  src={previewCert.file_data}
                  className="h-[400px] w-full"
                  title="Preview do documento"
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-slate-400">
                  <div className="text-center">
                    <FileText className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    <p className="text-sm">Preview do documento não disponível</p>
                    <p className="text-xs">Arquivo: {previewCert.file_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
