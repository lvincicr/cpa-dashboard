import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Row } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Trust but coerce the pieces we need (lightweight mapping)
    const rows: Row[] = body as Row[];

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = rows.map((r) => ({
      user_id: r["USER ID"],
      nome: r["NOME"] ?? null,
      data: r["DATA"],
      registrato: !!r["REGISTRATO"],
      depositato: !!r["DEPOSITATO"],
      importo: r["IMPORTO"],
      prelievi: r["PRELIEVI"],
      operativo: !!r["OPERATIVO"],
      qualificato: !!r["QUALIFICATO"],
      commissioni: r["COMMISSIONI"],
      data_qualifica: r["DATA QUALIFICA"],
      tempo_qual: r["TEMPO QUAL"],
      no_commissioni: !!r["NO COMMISSIONI"],
    }));

    const { error } = await supabase.from("clients").upsert(payload, { onConflict: "user_id" });
    if (error) throw error;

    return NextResponse.json({ ok: true, upserted: payload.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
