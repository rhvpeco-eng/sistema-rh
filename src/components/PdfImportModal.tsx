import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface PdfImportModalProps {
  open: boolean;
  onClose: () => void;
  employee?: any;
  employees?: any[];
  onApply?: (result: any) => void;
}

export function PdfImportModal({ open, onClose, employee, onApply }: PdfImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!open) return null;

  const fileToBase64 = (fileToConvert: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileToConvert);
      reader.onload = () => {
        const result = reader.result as string;
        const cleanBase64 = result.split(',')[1];
        resolve(cleanBase64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleProcessDocument = async () => {
    if (!file) {
      setErrorMessage('Por favor, selecione um arquivo de ponto.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave VITE_GEMINI_API_KEY não localizada no arquivo .env.');
      }

      const base64Data = await fileToBase64(file);
      const mimeType = file.type || 'application/pdf';

      const promptText = `
Você é um especialista em DP e RH. Analise minuciosamente este cartão/folha de ponto.
Identifique o ano e o mês de referência principal deste documento.
Extraia os horários dia a dia.
Retorne rigorosamente apenas um JSON sem markdown no seguinte formato:
{
  "year": 2026,
  "month": 8,
  "entries": [
    {
      "date": "2026-08-01",
      "entry1": "08:00",
      "exitLunch": "12:00",
      "returnLunch": "13:00",
      "exit2": "17:00"
    }
  ]
}

Regras:
1. "month" deve ser o número convencional do mês de 1 a 12 (ex: Agosto = 8, Julho = 7).
2. "date" deve ser sempre "YYYY-MM-DD" com o mesmo ano e mês de referência.
3. Se um dia não tiver marcação (fim de semana, falta ou folga), deixe os horários como "" ou null, mas traga o dia na lista.
`;

      const requestBody = JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      });

      // Modelos em ordem de tentativa para contornar instabilidades de alta demanda (503)
    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
      let resData: any = null;
      let lastError = '';

      for (const model of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: requestBody,
            }
          );

          if (response.ok) {
            resData = await response.json();
            break; // Requisição com sucesso, encerra as tentativas
          } else {
            lastError = await response.text();
            // Se for erro 503 (sobrecarga), aguarda 1.5s antes de tentar o próximo
            if (response.status === 503) {
              await new Promise((r) => setTimeout(r, 1500));
            }
          }
        } catch (err: any) {
          lastError = err.message || 'Falha de conexão';
        }
      }

      if (!resData) {
        throw new Error(`A API do Google está sobrecarregada no momento. Tente novamente em alguns segundos. Detalhes: ${lastError}`);
      }

      const rawJson = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawJson) {
        throw new Error('Não foi possível ler os dados do documento.');
      }

      const parsedData = JSON.parse(rawJson);
      const entriesList = Array.isArray(parsedData.entries) ? parsedData.entries : [];

      let detectedYear = parsedData.year ? Number(parsedData.year) : 2026;
      let detectedMonthIndex = parsedData.month ? Number(parsedData.month) - 1 : 7;

      if (entriesList.length > 0 && entriesList[0].date) {
        const parts = entriesList[0].date.split('-');
        if (parts.length >= 2) {
          detectedYear = parseInt(parts[0], 10);
          detectedMonthIndex = parseInt(parts[1], 10) - 1; // Base 0 do JavaScript
        }
      }

      const payload = {
        resolvedEmployeeId: employee?.id,
        header: {
          month: detectedMonthIndex,
          year: detectedYear,
        },
        entries: entriesList,
      };

      setSuccessMessage(`Concluído! ${entriesList.length} dias identificados.`);

      if (onApply) {
        setTimeout(() => {
          onApply(payload);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao processar folha de ponto.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-semibold text-white">Importar Cartão de Ponto</h3>
            {employee && (
              <p className="text-xs text-slate-400 mt-1">Funcionário: {employee.name || employee.full_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-6 text-center transition-colors">
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              id="file-upload"
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-10 h-10 text-indigo-400 mb-2" />
              <span className="text-sm font-medium text-slate-200">
                {file ? file.name : 'Clique para selecionar PDF ou Imagem'}
              </span>
              <span className="text-xs text-slate-400 mt-1">PDF, PNG ou JPG</span>
            </label>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-lg text-sm text-slate-300">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleProcessDocument}
            disabled={!file || isProcessing}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Lendo com IA...
              </>
            ) : (
              'Processar Ponto'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PdfImportModal;