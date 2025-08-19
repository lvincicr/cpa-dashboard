import { differenceInDays } from "date-fns";
import type { Row } from "./types";

type AnyObj = Record<string, any>;

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function iso(v: any): string | null {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : null;
}

export function combineReports(regRows: AnyObj[], actRows: AnyObj[]): Row[] {
  // index by User ID
  const byId = new Map<string, { reg?: AnyObj; act?: AnyObj }>();

  for (const r of regRows) {
    const id = String(r["User ID"] ?? "");
    if (!id) continue;
    const current = byId.get(id) || {};
    current.reg = r;
    byId.set(id, current);
  }
  for (const a of actRows) {
    const id = String(a["User ID"] ?? "");
    if (!id) continue;
    const current = byId.get(id) || {};
    current.act = a;
    byId.set(id, current);
  }

  const out: Row[] = [];

  for (const [userId, pair] of byId.entries()) {
    const reg = pair.reg || {};
    const act = pair.act || {};

    const nome = (reg["Customer Name"] ?? null) as string | null;

    // Dates
    const regDateISO = iso(reg["Registration Date"]);
    const qualDateISO = iso(reg["Qualification Date"]);

    // Numbers (safe casts)
    const firstDeposit = toNum(reg["First Deposit"]);
    const depositCount = toNum(reg["Deposit Count"]) ?? 0;
    const withdrawals = toNum(act["Withdrawals"]) ?? toNum(reg["Withdrawals"]) ?? null; // prefer Activity if present

    const posReg = toNum(reg["Position Count"]) ?? 0;
    const posAct = toNum(act["Position Count"]) ?? 0;
    const posAny = Math.max(posReg, posAct);

    const lotsReg = toNum(reg["Lot Amount"]) ?? 0;
    const lotsAct = toNum(act["Lot Amount"]) ?? 0;
    const lotsAny = Math.max(lotsReg, lotsAct);

    const commAct = toNum(act["Commissions"]);
    const commReg = toNum(reg["Commission"]);
    const commissions = commAct ?? commReg ?? null;

    // Flags & derived
    const registrato = 1; // in Registrati by definition
    const depositato = (depositCount > 0 || (firstDeposit ?? 0) > 0) ? 1 : 0;
    const operativo = posAny > 0 ? 1 : 0;
    const qualificato = (lotsAny >= 1 || !!qualDateISO) ? 1 : 0;

    let tempoQual: number | null = null;
    if (regDateISO && qualDateISO) {
      tempoQual = differenceInDays(new Date(qualDateISO), new Date(regDateISO));
    }

    const noCommissioni = (lotsAny > 1 && (commissions ?? 0) === 0) ? 1 : 0;

    out.push({
      NOME: nome,
      "USER ID": userId,
      DATA: regDateISO,
      REGISTRATO: registrato,
      DEPOSITATO: depositato,
      IMPORTO: firstDeposit ?? null,
      PRELIEVI: withdrawals,
      OPERATIVO: operativo,
      QUALIFICATO: qualificato,
      COMMISSIONI: commissions,
      "DATA QUALIFICA": qualDateISO,
      "TEMPO QUAL": tempoQual,
      "NO COMMISSIONI": noCommissioni,
    });
  }

  // stable sort by registration date desc then user id
  return out.sort((a, b) => {
    const ad = a.DATA ? new Date(a.DATA).getTime() : 0;
    const bd = b.DATA ? new Date(b.DATA).getTime() : 0;
    if (bd !== ad) return bd - ad;
    return a["USER ID"].localeCompare(b["USER ID"]);
  });
}