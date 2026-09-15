import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { 
  FolderCheck, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  RefreshCw, 
  FileSearch, 
  UserCheck, 
  FolderOpen,
  RotateCcw,
  FilePenLine,
  Calendar
} from 'lucide-react';

export type DocCategory = 
  | 'rg' 
  | 'cpf' 
  | 'residencia' 
  | 'ctps' 
  | 'contrato' 
  | 'prorrogacao' 
  | 'aso' 
  | 'banco' 
  | 'vacinacao' 
  | 'titulo' 
  | 'epi' 
  | 'ponto' 
  | 'desconhecido';

export interface AuditClassifyResult {
  fileName: string;
  category: DocCategory;
  isSigned: boolean;
  docDate?: string;
  notes: string;
}

interface ChecklistItem {
  id: string;
  category: DocCategory;
  label: string;
  required: boolean;
  status: 'conforme' | 'assinatura_pendente' | 'vencido' | 'pendente';
  fileName?: string;
  docDate?: string;
  expirationDate?: string;
  notes?: string;
}

const defaultChecklist: ChecklistItem[] = [
  { id: '1', category: 'rg', label: 'RG / Identidade ou CNH', required: true, status: 'pendente' },
  { id: '2', category: 'cpf', label: 'CPF / Comprovante Receita Federal', required: true, status: 'pendente' },
  { id: '3', category: 'residencia', label: 'Comprovante de Residência', required: true, status: 'pendente' },
  { id: '4', category: 'ctps', label: 'Carteira de Trabalho (CTPS)', required: true, status: 'pendente' },
  { id: '5', category: 'contrato', label: 'Contrato de Trabalho / Admissão Inicial', required: true, status: 'pendente' },
  { id: '6', category: 'prorrogacao', label: 'Termo de Prorrogação de Experiência', required: false, status: 'pendente' },
  { id: '7', category: 'aso', label: 'ASO Admissional / Periódico (Saúde Ocupacional)', required: true, status: 'pendente' },
  { id: '8', category: 'banco', label: 'Comprovante Bancário / Chave PIX', required: true, status: 'pendente' },
  { id: '9', category: 'vacinacao', label: 'Carteira de Vacinação', required: false, status: 'pendente' },
  { id: '10', category: 'titulo', label: 'Título de Eleitor', required: false, status: 'pendente' },
  { id: '11', category: 'epi', label: 'Ficha de Entrega de EPI', required: false, status: 'pendente' },
];

export function FolderAuditTab() {
  const { employees } = useData();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);
  const [analyzing, setAnalyzing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);

  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (!result) {
          reject(new Error('Falha ao processar arquivo.'));
          return;
        }
        const base64Clean = result.split(',')[1];
        resolve(base64Clean);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const classifyWithGemini = async (fileBase64: string, fileName: string, mimeType: string): Promise<AuditClassifyResult> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave VITE_GEMINI_API_KEY não configurada no .env');

    let resolvedMime = mimeType;
    const lower = fileName.toLowerCase();
    if (!resolvedMime || resolvedMime === '') {
      if (lower.endsWith('.pdf')) resolvedMime = 'application/pdf';
      else if (lower.endsWith('.png')) resolvedMime = 'image/png';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) resolvedMime = 'image/jpeg';
      else resolvedMime = 'application/pdf';
    }

    const prompt = `
Você é um auditor de RH e Segurança do Trabalho da VP Ecologia.
Analise detalhadamente o CONTEÚDO VISUAL E TEXTUAL deste arquivo. Não se baseie apenas no nome do arquivo, analise o texto real.

CATEGORIAS PERMITIDAS:
- "aso": Atestado de Saúde Ocupacional, ASO, Exame Médico Clínico Admissional, Periódico, Demissional, Ficha Clínica, avaliação de APTO/INAPTO, PCMSO, NR-7, carimbo ou assinatura de médico do trabalho com CRM.
- "contrato": Contrato Individual de Trabalho, Contrato de Experiência formal de admissão.
- "prorrogacao": Aditivo ou Termo de Prorrogação de Contrato de Experiência.
- "epi": Ficha de Entrega e Controle de EPI.
- "rg": Registro Geral ou CNH.
- "cpf": Comprovante de CPF.
- "residencia": Comprovante de endereço residencial (energia, água, internet, gás).
- "ctps": Carteira de Trabalho física ou digital.
- "banco": Cartão bancário, extrato ou chave PIX.
- "vacinacao": Cartão de Vacinação.
- "titulo": Título de Eleitor.
- "ponto": Folha ou cartão de ponto.
- "desconhecido": Outro documento ou ilegível.

VALIDAÇÕES OBRIGATÓRIAS:
1. isSigned: true se houver assinatura manuscrita, carimbo médico com rubrica ou assinatura digital visível. Se a linha de assinatura estiver em branco, defina false.
2. docDate: Se for "aso", procure a DATA DO EXAME MÉDICO ou de emissão (retorne estritamente em formato YYYY-MM-DD). Caso não encontre, retorne null.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "category": "aso" | "contrato" | "prorrogacao" | "epi" | "rg" | "cpf" | "residencia" | "ctps" | "banco" | "vacinacao" | "titulo" | "ponto" | "desconhecido",
  "isSigned": true | false,
  "docDate": "YYYY-MM-DD" | null,
  "notes": "Breve justificativa objetiva"
}
`;

    const modelName = 'gemini-3.6-flash';
    let lastError: any = null;

    // Até 3 tentativas com backoff sem timeout rígido de abort
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: resolvedMime,
                        data: fileBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        );

        if (response.status === 503 || response.status === 429) {
          if (attempt < 3) {
            await delay(2500 * attempt);
            continue;
          }
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API Gemini (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(rawText || '{}');

        return {
          fileName,
          category: parsed.category || 'desconhecido',
          isSigned: parsed.isSigned !== false,
          docDate: parsed.docDate || undefined,
          notes: parsed.notes || '',
        };
      } catch (err: any) {
        lastError = err;
        if (attempt < 3) {
          await delay(2000);
        }
      }
    }

    throw lastError || new Error('Falha na comunicação com a API Gemini.');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAnalyzing(true);
    const logs: string[] = [`Iniciando análise de ${files.length} arquivo(s)...`];
    setAuditLogs([...logs]);
    const updatedChecklist = [...checklist];
    const today = new Date();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.startsWith('.') || file.name.toLowerCase().endsWith('.ini')) continue;

      logs.push(`Analisando (${i + 1}/${files.length}): ${file.name}...`);
      setAuditLogs([...logs]);

      try {
        const base64 = await fileToBase64(file);
        const classification = await classifyWithGemini(base64, file.name, file.type);

        if (classification.category !== 'desconhecido') {
          const matchIndex = updatedChecklist.findIndex(item => item.category === classification.category);

          if (matchIndex !== -1) {
            const item = updatedChecklist[matchIndex];
            item.fileName = file.name;
            item.notes = classification.notes;

            // Tratamento específico de ASO: data, prazo de 1 ano e assinatura
            if (classification.category === 'aso' && classification.docDate) {
              item.docDate = classification.docDate;
              const [y, m, d] = classification.docDate.split('-').map(Number);
              const expDate = new Date(y + 1, m - 1, d);
              item.expirationDate = expDate.toISOString().split('T')[0];

              if (expDate < today) {
                item.status = 'vencido';
                logs.push(`❌ ${file.name}: ASO VENCIDO em ${item.expirationDate.split('-').reverse().join('/')}`);
              } else if (!classification.isSigned) {
                item.status = 'assinatura_pendente';
                logs.push(`⚠️ ${file.name}: ASO válido até ${item.expirationDate.split('-').reverse().join('/')}, porém SEM ASSINATURA.`);
              } else {
                item.status = 'conforme';
                logs.push(`✓ ${file.name}: ASO VÁLIDO até ${item.expirationDate.split('-').reverse().join('/')} e assinado.`);
              }
            } else {
              if (!classification.isSigned) {
                item.status = 'assinatura_pendente';
                logs.push(`⚠️ ${file.name}: Identificado como "${item.label}", porém sem assinatura.`);
              } else {
                item.status = 'conforme';
                logs.push(`✓ ${file.name}: Identificado como "${item.label}" e assinado.`);
              }
            }
          } else {
            logs.push(`Documento identificado: ${classification.category} (${file.name})`);
          }
        } else {
          logs.push(`⚠ Arquivo ${file.name} não categorizado no checklist.`);
        }
      } catch (err: any) {
        logs.push(`❌ Erro em ${file.name}: ${err.message}`);
      }
      setAuditLogs([...logs]);
    }

    setChecklist(updatedChecklist);
    setAnalyzing(false);
    e.target.value = '';
  };

  const handleReset = () => {
    setAnalyzing(false);
    setAuditLogs([]);
    setChecklist(defaultChecklist);
  };

  const conformes = checklist.filter(c => c.status === 'conforme').length;
  const percentual = Math.round((conformes / checklist.length) * 100);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderCheck className="w-6 h-6 text-indigo-600" />
            Auditoria Inteligente de Prontuários
          </h1>
          <p className="text-sm text-slate-500">
            Reconhecimento visual com IA Gemini 3.6 — Validação de datas, vencimento de ASO e assinaturas
          </p>
        </div>

        <div className="w-full sm:w-72">
          <select
            value={selectedEmpId}
            onChange={(e) => {
              setSelectedEmpId(e.target.value);
              setChecklist(defaultChecklist);
              setAuditLogs([]);
            }}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm"
          >
            <option value="">Selecione o colaborador...</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role || 'Sem Cargo'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedEmp ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ações de Upload e Status */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-all shadow-sm">
              <UploadCloud className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Auditar Documentos da Pasta
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Envie a pasta completa ou selecione arquivos em PDF e imagem.
              </p>

              <div className="flex flex-col gap-2.5">
                <label className={`w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md cursor-pointer transition-all ${
                  analyzing ? 'bg-slate-400 pointer-events-none' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}>
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Auditando Documentos...
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-4 h-4" />
                      Selecionar Pasta Completa
                    </>
                  )}
                  <input
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={analyzing}
                  />
                </label>

                <label className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-all ${
                  analyzing ? 'pointer-events-none opacity-50' : ''
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Selecionar Arquivos Soltos
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={analyzing}
                  />
                </label>

                {analyzing && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-1 flex items-center justify-center gap-1 text-xs text-rose-600 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" /> Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-600 uppercase">Conformidade Geral</span>
                <span className="text-sm font-bold text-indigo-600">{percentual}% Aprovado</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    percentual >= 80 ? 'bg-emerald-500' : percentual >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${percentual}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-3">
                {conformes} de {checklist.length} itens com validação concluída.
              </p>
            </div>

            {auditLogs.length > 0 && (
              <div className="bg-slate-900 text-slate-300 rounded-2xl p-4 text-xs font-mono max-h-56 overflow-y-auto space-y-1.5 shadow-sm">
                <div className="text-slate-400 font-bold border-b border-slate-700 pb-1 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileSearch className="w-3.5 h-3.5 text-indigo-400" />
                    Logs de Validação Visual
                  </span>
                  <button onClick={handleReset} className="text-[10px] text-slate-400 hover:text-white">
                    Limpar
                  </button>
                </div>
                {auditLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checklist de Documentos */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Prontuário Funcional: {selectedEmp.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Cargo: {selectedEmp.role || 'Não definido'} | CPF: {selectedEmp.cpf || 'Não cadastrado'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <UserCheck className="w-3.5 h-3.5" />
                Auditoria Ativa
              </span>
            </div>

            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    item.status === 'conforme'
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : item.status === 'assinatura_pendente'
                      ? 'border-amber-300 bg-amber-50/50'
                      : item.status === 'vencido'
                      ? 'border-rose-300 bg-rose-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.status === 'conforme' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : item.status === 'assinatura_pendente' ? (
                      <FilePenLine className="w-5 h-5 text-amber-600 shrink-0" />
                    ) : item.status === 'vencido' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    ) : item.required ? (
                      <AlertTriangle className="w-5 h-5 text-slate-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-300 shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          item.status === 'conforme' 
                            ? 'text-emerald-900' 
                            : item.status === 'assinatura_pendente'
                            ? 'text-amber-900'
                            : item.status === 'vencido'
                            ? 'text-rose-900'
                            : 'text-slate-800'
                        }`}>
                          {item.label}
                        </span>
                        {item.required && (
                          <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Obrigatório
                          </span>
                        )}
                      </div>

                      {item.fileName ? (
                        <div className="space-y-0.5 mt-1">
                          <p className="text-xs text-slate-600 font-mono">
                            Arquivo: <span className="font-semibold text-slate-800">{item.fileName}</span>
                          </p>
                          
                          {item.category === 'aso' && item.docDate && (
                            <div className="flex items-center gap-3 text-xs pt-0.5">
                              <span className="text-slate-600 flex items-center gap-1 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Realizado: <b>{item.docDate.split('-').reverse().join('/')}</b>
                              </span>
                              <span className={`flex items-center gap-1 font-bold ${
                                item.status === 'vencido' ? 'text-rose-700' : 'text-emerald-700'
                              }`}>
                                Validade: <b>{item.expirationDate?.split('-').reverse().join('/')}</b>
                              </span>
                            </div>
                          )}

                          {item.notes && (
                            <p className={`text-[11px] ${
                              item.status === 'assinatura_pendente' ? 'text-amber-700 font-semibold' : 
                              item.status === 'vencido' ? 'text-rose-700 font-semibold' : 'text-slate-500'
                            }`}>
                              {item.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Aguardando envio ou documento não localizado na pasta
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {item.status === 'conforme' ? (
                      <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                        Conforme / Válido
                      </span>
                    ) : item.status === 'assinatura_pendente' ? (
                      <span className="text-xs font-bold px-3 py-1 bg-amber-200 text-amber-900 rounded-lg flex items-center gap-1">
                        <FilePenLine className="w-3 h-3" /> Assinatura Pendente
                      </span>
                    ) : item.status === 'vencido' ? (
                      <span className="text-xs font-bold px-3 py-1 bg-rose-200 text-rose-900 rounded-lg flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> ASO Vencido
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400">
          <FolderCheck className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-500" />
          <p className="text-base font-semibold text-slate-700">Nenhum colaborador selecionado</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Selecione um funcionário no menu suspenso para auditar a pasta funcional com validação de prazos e assinaturas.
          </p>
        </div>
      )}
    </div>
  );
}

export default FolderAuditTab;