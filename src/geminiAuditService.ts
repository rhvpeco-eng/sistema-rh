import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export type DocCategory = 
  | 'rg' 
  | 'cpf' 
  | 'cnh'
  | 'residencia' 
  | 'aso' 
  | 'ctps' 
  | 'contrato' 
  | 'epi' 
  | 'ponto' 
  | 'desconhecido';

export interface AuditClassifyResult {
  fileName: string;
  category: DocCategory;
  confidence: number;
  identifiedName?: string;
  documentNumber?: string;
}

export async function classifyDocumentWithGemini(
  fileBase64: string,
  fileName: string,
  mimeType: string = 'application/pdf'
): Promise<AuditClassifyResult> {
  const prompt = `
Analise a imagem ou página deste documento de RH/Departamento Pessoal da empresa VP Ecologia.
Classifique o arquivo rigorosamente em APENAS UMA das categorias abaixo:
- "rg": Registro Geral / Cédula de Identidade
- "cpf": Cartão de CPF ou Comprovante de Inscrição da Receita
- "cnh": Carteira Nacional de Habilitação
- "residencia": Comprovante de Residência (luz, água, telefone, etc.)
- "aso": Atestado de Saúde Ocupacional (Exame Médico Admissional/Periódico)
- "ctps": Carteira de Trabalho (CTPS Física ou Digital)
- "contrato": Contrato de Trabalho, Termo de Estágio ou Ficha de Admissão
- "epi": Ficha de Entrega de Equipamentos de Proteção Individual
- "ponto": Cartão de Ponto ou Folha de Ponto Mensal
- "desconhecido": Nenhum dos anteriores ou ilegível

Retorne exclusivamente um JSON válido no formato:
{
  "category": "rg" | "cpf" | "cnh" | "residencia" | "aso" | "ctps" | "contrato" | "epi" | "ponto" | "desconhecido",
  "confidence": 0.95,
  "identifiedName": "Nome da pessoa encontrada no documento (se houver)",
  "documentNumber": "Número do RG/CPF/PIS/Registro (se houver)"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: fileBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const outputText = response.text;
    if (!outputText) throw new Error('Sem resposta da IA.');

    const parsed = JSON.parse(outputText);
    return {
      fileName,
      category: parsed.category || 'desconhecido',
      confidence: parsed.confidence || 0.8,
      identifiedName: parsed.identifiedName,
      documentNumber: parsed.documentNumber,
    };
  } catch (err: any) {
    console.error(`Erro ao analisar ${fileName} com Gemini:`, err);
    return {
      fileName,
      category: 'desconhecido',
      confidence: 0,
    };
  }
}