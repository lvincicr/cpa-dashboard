import { differenceInDays } from "date-fns";
import type { Row } from "./types";

type SourceRow = Record<string, unknown>;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function iso(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length ? v : null;
}

export function combineReports(regRows: SourceRow[], actRows: SourceRow[]): Row[] {
  const byId = new Map<string, { reg?: SourceRow; act?: SourceRow }>();

  for (const r of regRows) {
    const id = str(r["User ID"]) ?? "";
    if (!id) continue;
    const current = byId.get(id) ?? {};
    current.reg = r;
    byId.set(id, current);
  }
  for (const a of actRows) {
    const id = str(a["User ID"]) ?? "";
    if (!id) continue;
    const current = byId.get(id) ?? {};
    current.act = a;
    byId.set(id, current);
  }

  const out: Row[] = [];

  for (const [userId, pair] of byId.entries()) {
    const reg = pair.reg ?? {};
    const act = pair.act ?? {};

    const nome = (reg["Customer Name"] as string | null) ?? null;

    const regDateISO = iso(reg["Registration Date"]);
    const qualDateISO = iso(reg["Qualification Date"]);

    const firstDeposit = toNum(reg["First Deposit"]);
    const depositCount = toNum(reg["Deposit Count"]) ?? 0;
    const withdrawals =
      toNum(act["Withdrawals"]) ?? toNum(reg["Withdrawals"]) ?? null; // prefer Activity

    const posReg = toNum(reg["Position Count"]) ?? 0;
    const posAct = toNum(act["Position Count"]) ?? 0;
    const posAny = Math.max(posReg, posAct);

    const lotsReg = toNum(reg["Lot Amount"]) ?? 0;
    const lotsAct = toNum(act["Lot Amount"]) ?? 0;
    const lotsAny = Math.max(lotsReg, lotsAct);

    const commAct = toNum(act["Commissions"]);
    const commReg = toNum(reg["Commission"]);
    const commissions = commAct ?? commReg ?? null;

    const registrato = 1;
    const depositato = depositCount > 0 || (firstDeposit ?? 0) > 0 ? 1 : 0;
    const operativo = posAny > 0 ? 1 : 0;
    const qualificato = lotsAny >= 1 || !!qualDateISO ? 1 : 0;

    let tempoQual: number | null = null;
    if (regDateISO && qualDateISO) {
      tempoQual = differenceInDays(new Date(qualDateISO), new Date(regDateISO));
    }

    const noCommissioni = lotsAny > 1 && (commissions ?? 0) === 0 ? 1 : 0;

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

  return out.sort((a, b) => {
    const ad = a.DATA ? new Date(a.DATA).getTime() : 0;
    const bd = b.DATA ? new Date(b.DATA).getTime() : 0;
    if (bd !== ad) return bd - ad;
    return a["USER ID"].localeCompare(b["USER ID"]);
  });
}
