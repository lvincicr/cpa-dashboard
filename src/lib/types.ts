export type Row = {
  NOME: string | null;
  "USER ID": string;
  DATA: string | null; // ISO
  REGISTRATO: number; // 0/1
  DEPOSITATO: number; // 0/1
  IMPORTO: number | null;
  PRELIEVI: number | null; // total withdrawn
  OPERATIVO: number; // 0/1
  QUALIFICATO: number; // 0/1
  COMMISSIONI: number | null;
  "DATA QUALIFICA": string | null; // ISO
  "TEMPO QUAL": number | null; // days
  "NO COMMISSIONI": number; // 0/1
};