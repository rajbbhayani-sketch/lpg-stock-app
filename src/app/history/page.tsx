"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import BottomNav from "../../components/BottomNav";

type StockHistory = {
  id: string;
  item_name: string;
  old_quantity: string | null;
  new_quantity: string | null;
  changed_by: string | null;
  changed_at: string | null;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);

    const { data, error } = await supabase
      .from("stock_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("history loadHistory error:", error);
      alert(`history error: ${error.message}`);
      setHistory([]);
      setLoading(false);
      return;
    }

    setHistory(data || []);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefaf2] via-[#f3f8ff] to-[#fff5eb] pb-28 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="rounded-[30px] bg-white/90 p-4 shadow-xl ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
            LPG BioMarkt
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
            History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Recent stock changes
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="rounded-[28px] bg-white/90 p-6 text-center shadow-lg ring-1 ring-black/5">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-[28px] bg-white/90 p-6 text-center shadow-lg ring-1 ring-black/5">
              No history yet.
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[28px] bg-white/90 p-4 shadow-lg ring-1 ring-black/5"
              >
                <p className="text-lg font-bold text-slate-800">{entry.item_name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {entry.old_quantity} → {entry.new_quantity}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  By {entry.changed_by || "-"}
                </p>
                {entry.changed_at ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(entry.changed_at).toLocaleString("en-GB")}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>

        <BottomNav />
      </div>
    </main>
  );
}