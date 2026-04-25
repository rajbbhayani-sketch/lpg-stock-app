"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import BottomNav from "../../components/BottomNav";

type StockItem = {
  id: string;
  item_name: string;
  quantity: string;
  unit: string | null;
  note: string | null;
  updated_by: string | null;
  updated_at: string | null;
  category?: string | null;
};

function getNumber(value: string) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function isUpdatedToday(dateValue?: string | null) {
  if (!dateValue) return false;

  const updated = new Date(dateValue);
  const today = new Date();

  return (
    updated.getDate() === today.getDate() &&
    updated.getMonth() === today.getMonth() &&
    updated.getFullYear() === today.getFullYear()
  );
}

function getReason(item: StockItem) {
  const qty = getNumber(item.quantity);
  const updatedToday = isUpdatedToday(item.updated_at);

  if (qty <= 0) return "Leer";
  if (qty <= 2) return "Niedriger Bestand";
  if (!updatedToday) return "Heute nicht aktualisiert";

  return "OK";
}

function getReasonClass(reason: string) {
  if (reason === "Leer") return "bg-red-50 text-red-700 border-red-100";
  if (reason === "Niedriger Bestand") return "bg-amber-50 text-amber-800 border-amber-100";
  if (reason === "Heute nicht aktualisiert") return "bg-stone-100 text-stone-700 border-stone-200";
  return "bg-[#e8f2eb] text-[#1f4d2b] border-[#d5eadb]";
}

export default function EinkaufPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayText, setTodayText] = useState("");

  useEffect(() => {
    setTodayText(
      new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );

    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);

    const { data, error } = await supabase
      .from("stock_items")
      .select("id, item_name, quantity, unit, note, updated_by, updated_at, category")
      .order("item_name", { ascending: true });

    if (error) {
      alert(`Fehler beim Laden: ${error.message}`);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(data || []);
    setLoading(false);
  }

  const shoppingItems = useMemo(() => {
    return items
      .filter((item) => {
        const qty = getNumber(item.quantity);
        const updatedToday = isUpdatedToday(item.updated_at);

        return qty <= 2 || !updatedToday;
      })
      .sort((a, b) => {
        const aQty = getNumber(a.quantity);
        const bQty = getNumber(b.quantity);

        if (aQty <= 0 && bQty > 0) return -1;
        if (aQty > 0 && bQty <= 0) return 1;

        if (aQty <= 2 && bQty > 2) return -1;
        if (aQty > 2 && bQty <= 2) return 1;

        return a.item_name.localeCompare(b.item_name);
      });
  }, [items]);

  const emptyCount = shoppingItems.filter((item) => getNumber(item.quantity) <= 0).length;
  const lowCount = shoppingItems.filter((item) => getNumber(item.quantity) > 0 && getNumber(item.quantity) <= 2).length;
  const notUpdatedCount = shoppingItems.filter((item) => !isUpdatedToday(item.updated_at)).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f1e8] to-[#ece6dc] pb-28 text-stone-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2f5d3a]">
                LPG BioMarkt
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">
                Einkaufsliste
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Produkte, die geprüft oder gekauft werden müssen
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f1e8] px-3 py-2 text-right">
              <p className="text-[11px] text-stone-500">Heute</p>
              <p className="text-sm font-bold">{todayText}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-red-600 p-3 text-white">
              <p className="text-[11px] text-white/75">Leer</p>
              <p className="mt-1 text-2xl font-black">{emptyCount}</p>
            </div>

            <div className="rounded-2xl bg-[#d6a21e] p-3 text-white">
              <p className="text-[11px] text-white/75">Wenig</p>
              <p className="mt-1 text-2xl font-black">{lowCount}</p>
            </div>

            <div className="rounded-2xl bg-stone-800 p-3 text-white">
              <p className="text-[11px] text-white/75">Prüfen</p>
              <p className="mt-1 text-2xl font-black">{notUpdatedCount}</p>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-sm">
            Einkaufsliste wird geladen...
          </section>
        ) : shoppingItems.length === 0 ? (
          <section className="mt-5 rounded-[28px] border border-[#d5eadb] bg-[#e8f2eb] p-6 text-center shadow-sm">
            <p className="text-lg font-black text-[#1f4d2b]">Alles sieht gut aus.</p>
            <p className="mt-1 text-sm text-[#1f4d2b]">
              Kein Produkt ist leer, niedrig oder offen.
            </p>
          </section>
        ) : (
          <section className="mt-5 space-y-3">
            {shoppingItems.map((item) => {
              const reason = getReason(item);

              return (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{item.item_name}</h2>
                      <p className="mt-1 text-sm font-semibold text-stone-700">
                        Aktuell: {item.quantity} {item.unit || ""}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getReasonClass(reason)}`}
                    >
                      {reason}
                    </span>
                  </div>

                  {item.note ? (
                    <div className="mt-3 rounded-xl bg-[#fff8df] px-3 py-2 text-xs font-medium text-stone-700">
                      {item.note}
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2">
                    <p className="text-xs text-stone-500">Letzte Aktualisierung</p>
                    <p className="text-sm font-bold">{item.updated_by || "-"}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleString("de-DE")
                        : "Noch nicht aktualisiert"}
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <BottomNav />
      </div>
    </main>
  );
}