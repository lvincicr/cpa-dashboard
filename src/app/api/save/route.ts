import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server only

export async function POST(req: Request) {
  try {
    const rows = (await req.json()) as any[];
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = rows.map(r => ({
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

    const { error } = await supabase
      .from("clients")
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw error;

    return NextResponse.json({ ok: true, upserted: payload.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}