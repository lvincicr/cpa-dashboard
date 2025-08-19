'use client';

import React, { useMemo, useState, useId } from 'react';
import * as XLSX from 'xlsx';
import { combineReports } from '@/lib/transform';
import type { Row } from '@/lib/types';

const sectionStyle =
  'rounded-[10px] p-6 bg-[#131313] shadow-[0px_0px_10px_rgba(255,255,255,0.1)]';
const labelStyle = 'text-gray-400';
const valueStyle = 'text-white font-bold';
const actionBtn =
  'px-4 py-2 bg-gradient-to-r from-[#00A0FF] to-[#00EAFF] hover:opacity-90 text-white font-bold rounded-full';

type SourceRow = Record<string, unknown>;
type Filters = Partial<Record<keyof Row, string>>;

function FilePicker({
  title,
  accept,
  onFile,
  file,
}: {
  title: string;
  accept: string;
  onFile: (f: File | null) => void;
  file: File | null;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
      <label htmlFor={id} className={`${actionBtn} cursor-pointer inline-flex items-center gap-2`}>
        {title}
      </label>
      <span className="text-sm text-gray-400 truncate max-w-[260px]">
        {file ? file.name : 'Nessun file selezionato'}
      </span>
    </div>
  );
}

// stringify helper for filtering/CSV
function stringifyCell(v: Row[keyof Row] | undefined | null): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

export default function Page() {
  const [regFile, setRegFile] = useState<File | null>(null);
  const [actFile, setActFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [globalQ, setGlobalQ] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const nf = useMemo(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }), []);

  async function readXlsx(file: File): Promise<SourceRow[]> {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<SourceRow>(sheet, { defval: null });
  }

  async function handleProcess() {
    setMsg(null);
    if (!regFile || !actFile) {
      setMsg('Please upload both files.');
      return;
    }
    const [reg, act] = await Promise.all([readXlsx(regFile), readXlsx(actFile)]);
    const combined = combineReports(reg, act);
    setRows(combined);
  }

  function setFilter(col: keyof Row, v: string) {
    setFilters((prev) => ({ ...prev, [col]: v }));
  }

  function resetFilters() {
    setFilters({});
    setGlobalQ('');
  }

  function toggleBool(userId: Row['USER ID'], key: keyof Row) {
    setRows((prev) =>
      prev.map((r) => (r['USER ID'] === userId ? { ...r, [key]: (r[key] ? 0 : 1) as Row[typeof key] } : r))
    );
  }

  const overview = useMemo(() => {
    const total = rows.length;
    const dep = rows.filter((r) => r.DEPOSITATO === 1).length;
    const qual = rows.filter((r) => r.QUALIFICATO === 1).length;
    const op = rows.filter((r) => r.OPERATIVO === 1).length;
    const commSum = rows.reduce((a, r) => a + (r.COMMISSIONI ?? 0), 0);
    const wdrSum = rows.reduce((a, r) => a + (r.PRELIEVI ?? 0), 0);
    const depRate = total ? Math.round((dep / total) * 100) : 0;
    const qualRate = total ? Math.round((qual / total) * 100) : 0;
    const opRate = total ? Math.round((op / total) * 100) : 0;
    return { total, dep, qual, op, commSum, wdrSum, depRate, qualRate, opRate };
  }, [rows]);

  const columns = useMemo<(keyof Row)[]>(() => {
    return rows[0] ? (Object.keys(rows[0]) as (keyof Row)[]) : [];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const byCols = (Object.entries(filters) as [keyof Row, string][])
        .every(([k, val]) => {
          if (!val) return true;
          const cell = r[k];
          return stringifyCell(cell).toLowerCase().includes(val.toLowerCase());
        });
      if (!byCols) return false;
      if (!globalQ) return true;
      const hay = (Object.values(r) as Row[keyof Row][])
        .map((v) => stringifyCell(v))
        .join(' ')
        .toLowerCase();
      return hay.includes(globalQ.toLowerCase());
    });
  }, [rows, filters, globalQ]);

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns;
    const csvRows = [headers.join(',')];
    for (const r of filtered) {
      const vals = headers.map((h) => {
        const s = stringifyCell(r[h]);
        const needsQuote = /[",\r\n]/.test(s);
        const safe = s.replace(/"/g, '""');
        return needsQuote ? `"${safe}"` : safe;
      });
      csvRows.push(vals.join(','));
    }
    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen px-8 py-8 bg-transparent text-gray-400">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER / LOGO */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-r from-[#00A0FF] to-[#00EAFF]" />
            <div className="text-white text-2xl font-extrabold tracking-wide">INFOBIZ-CPA</div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={exportCSV} className={actionBtn}>Export CSV</button>
          </div>
        </header>

        {/* TITLE */}
        <h1 className="text-white text-4xl font-bold text-center">Client Dashboard</h1>

        {/* OVERVIEW */}
        <section className={sectionStyle}>
          <h2 className="text-white text-2xl mb-4">Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <div className={labelStyle}>Totale Clienti</div>
              <div className={`${valueStyle} text-2xl sm:text-4xl`}>{overview.total}</div>
            </div>
            <div>
              <div className={labelStyle}>Depositanti</div>
              <div className={valueStyle}>
                {overview.dep} <span className="text-sm text-gray-400">({overview.depRate}%)</span>
              </div>
            </div>
            <div>
              <div className={labelStyle}>Qualificati</div>
              <div className={valueStyle}>
                {overview.qual} <span className="text-sm text-gray-400">({overview.qualRate}%)</span>
              </div>
            </div>
            <div>
              <div className={labelStyle}>Operativi</div>
              <div className={valueStyle}>
                {overview.op} <span className="text-sm text-gray-400">({overview.opRate}%)</span>
              </div>
            </div>
            <div>
              <div className={labelStyle}>Commissioni Totali</div>
              <div className={`${valueStyle} text-2xl sm:text-3xl`}>{nf.format(overview.commSum)}</div>
            </div>
            <div>
              <div className={labelStyle}>Prelievi Totali</div>
              <div className={`${valueStyle} text-2xl sm:text-3xl`}>{nf.format(overview.wdrSum)}</div>
            </div>
          </div>
        </section>

        {/* UPLOAD */}
        <section className={sectionStyle}>
          <h2 className="text-white text-2xl mb-4">Upload Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <div className={labelStyle}>Registrati-*.xlsx</div>
              <FilePicker title="Scegli file Registrati" accept=".xlsx,.xls" onFile={setRegFile} file={regFile} />
            </div>
            <div className="space-y-2">
              <div className={labelStyle}>ActivityRe-*.xlsx</div>
              <FilePicker title="Scegli file Activity" accept=".xlsx,.xls" onFile={setActFile} file={actFile} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={handleProcess} className={actionBtn} disabled={!regFile || !actFile}>
              Processa
            </button>
          </div>
        </section>

        {/* TABLE */}
        <section className={sectionStyle}>
          <h2 className="text-white text-2xl mb-4">Risultati</h2>

          <div className="flex flex-wrap items-center gap-3 pb-3 mb-4 border-b border-white/10">
            <input
              value={globalQ}
              onChange={(e) => setGlobalQ(e.target.value)}
              placeholder="Search all columns"
              className="min-w-[240px] bg-[#0f0f0f] border border-white/10 rounded-md px-3 py-2 text-sm"
            />
            <button onClick={resetFilters} className={actionBtn}>Reset Filters</button>
            {msg && <span className="text-sm text-gray-400">{msg}</span>}
          </div>

          {rows.length === 0 ? (
            <div className="text-gray-400">Carica i file per vedere i risultati.</div>
          ) : (
            <div className="overflow-auto rounded-xl border border-white/10">
              <table className="w-full table-compact text-sm">
                <thead>
                  <tr className="bg-white/5 sticky top-0 z-10">
                    {columns.map((k) => (
                      <th key={k as string} className="text-left whitespace-nowrap py-2 px-3">
                        {k}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-white/5 sticky top-[38px] z-10">
                    {columns.map((k) => (
                      <th key={k as string} className="text-left whitespace-nowrap py-2 px-3">
                        <input
                          className="w-full bg-[#0f0f0f] border border-white/10 rounded-md px-2 py-1 text-xs"
                          placeholder={`Filtra ${String(k)}`}
                          value={filters[k] || ''}
                          onChange={(e) => setFilter(k, e.target.value)}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r['USER ID']} className="odd:bg-white/0 even:bg-white/[0.02] hover:bg-white/[0.04]">
                      {columns.map((k) => {
                        const v = r[k];
                        const isBool = (['REGISTRATO','DEPOSITATO','OPERATIVO','QUALIFICATO','NO COMMISSIONI'] as (keyof Row)[])
                          .includes(k);
                        if (isBool) {
                          return (
                            <td key={String(k)} className="whitespace-nowrap py-2 px-3">
                              <button
                                className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                  v ? 'bg-emerald-600/70' : 'bg-zinc-700/70'
                                }`}
                                onClick={() => toggleBool(r['USER ID'], k)}
                              >
                                {v ? '1' : '0'}
                              </button>
                            </td>
                          );
                        }
                        return (
                          <td key={String(k)} className="whitespace-nowrap py-2 px-3">
                            {stringifyCell(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section className={sectionStyle}>
          <h2 className="text-white text-2xl mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button onClick={exportCSV} className={actionBtn}>Export CSV</button>
            <button onClick={resetFilters} className={actionBtn}>Reset Filters</button>
          </div>
        </section>
      </div>
    </div>
  );
}
