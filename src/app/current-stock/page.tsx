"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import BottomNav from "../../components/BottomNav";

type StockItem = {
  id: string;
  item_name: string;
  quantity: string;
  unit: string | null;
  category?: string | null;
  note?: string | null;
  updated_at?: string | null;
};

type Shelf = {
  title: string;
  subtitle: string;
  category: string;
  icon: string;
};

const SHELVES: Shelf[] = [
  {
    title: "Gemüse Regal",
    subtitle: "Frische Zutaten",
    category: "Vegetables",
    icon: "🥬",
  },
  {
    title: "Milchprodukte Regal",
    subtitle: "Kühlwaren",
    category: "Dairy",
    icon: "🧀",
  },
  {
    title: "Sonstiges Regal",
    subtitle: "Weitere Lagerware",
    category: "Other",
    icon: "📦",
  },
];

function productIcon(name: string, category?: string | null) {
  const text = name.toLowerCase();

  if (text.includes("tomato") || text.includes("tomate")) return "🍅";
  if (text.includes("salad") || text.includes("salat")) return "🥗";
  if (text.includes("mozzarella") || text.includes("cheese") || text.includes("käse")) return "🧀";
  if (text.includes("milk") || text.includes("milch")) return "🥛";
  if (text.includes("bread") || text.includes("brot")) return "🥖";
  if (text.includes("onion") || text.includes("zwiebel")) return "🧅";
  if (text.includes("pepper") || text.includes("paprika")) return "🫑";

  if (category === "Vegetables") return "🥬";
  if (category === "Dairy") return "🧀";

  return "📦";
}

function stockStatus(qty: number) {
  if (qty <= 0) return { label: "Leer", color: "bg-red-100 text-red-700" };
  if (qty <= 2) return { label: "Niedrig", color: "bg-amber-100 text-amber-800" };
  return { label: "OK", color: "bg-[#e8f2eb] text-[#1f4d2b]" };
}

function meterColor(qty: number) {
  if (qty <= 0) return "bg-red-500";
  if (qty <= 2) return "bg-amber-500";
  return "bg-[#2f7d46]";
}

function meterPercent(qty: number) {
  return Math.min((qty / 10) * 100, 100);
}

export default function CurrentStockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayText, setTodayText] = useState("");

  useEffect(() => {
    setTodayText(
      new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );

    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);

    const { data, error } = await supabase
      .from("stock_items")
      .select("id, item_name, quantity, unit, category, note, updated_at")
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

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity);
      return sum + (Number.isNaN(qty) ? 0 : qty);
    }, 0);
  }, [items]);

  const lowStockCount = useMemo(() => {
    return items.filter((item) => Number(item.quantity) <= 2).length;
  }, [items]);

  function getShelfItems(category: string) {
    return items.filter((item) => (item.category || "Other") === category);
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] pb-28 text-stone-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2f5d3a]">
                LPG BioMarkt
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">
                Aktueller Bestand
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Übersicht der Küchenregale
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f1e8] px-3 py-2 text-right">
              <p className="text-[11px] text-stone-500">Heute</p>
              <p className="text-sm font-bold">{todayText}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#1f4d2b] p-3 text-white">
              <p className="text-[11px] text-white/75">Produkte</p>
              <p className="mt-1 text-2xl font-black">{items.length}</p>
            </div>

            <div className="rounded-2xl bg-stone-800 p-3 text-white">
              <p className="text-[11px] text-white/75">Menge</p>
              <p className="mt-1 text-2xl font-black">{totalQuantity}</p>
            </div>

            <div className="rounded-2xl bg-[#d6a21e] p-3 text-white">
              <p className="text-[11px] text-white/75">Niedrig</p>
              <p className="mt-1 text-2xl font-black">{lowStockCount}</p>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-sm">
            Bestand wird geladen...
          </section>
        ) : (
          <div className="mt-5 space-y-5">
            {SHELVES.map((shelf) => {
              const shelfItems = getShelfItems(shelf.category);
              const shelfQty = shelfItems.reduce((sum, item) => {
                const qty = Number(item.quantity);
                return sum + (Number.isNaN(qty) ? 0 : qty);
              }, 0);

              return (
                <section
                  key={shelf.category}
                  className="overflow-hidden rounded-[30px] border border-stone-200 bg-white shadow-sm"
                >
                  <div className="border-b border-stone-200 bg-[#fbfaf7] px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f5d3a]">
                          {shelf.subtitle}
                        </p>
                        <h2 className="mt-1 text-2xl font-black">{shelf.title}</h2>
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f1e8] text-3xl">
                        {shelf.icon}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
                        {shelfItems.length} Produkte
                      </span>
                      <span className="rounded-full bg-[#e8f2eb] px-3 py-1 text-xs font-bold text-[#1f4d2b]">
                        Gesamt: {shelfQty}
                      </span>
                    </div>
                  </div>

                  <div className="relative px-5 py-5">
                    <div className="absolute left-4 right-4 top-8 h-2 rounded-full bg-[#9b7653]" />
                    <div className="absolute left-4 right-4 top-[132px] h-2 rounded-full bg-[#9b7653]" />
                    <div className="absolute left-4 right-4 bottom-8 h-2 rounded-full bg-[#9b7653]" />
                    <div className="absolute left-7 top-7 bottom-7 w-2 rounded-full bg-[#6f5138]" />
                    <div className="absolute right-7 top-7 bottom-7 w-2 rounded-full bg-[#6f5138]" />

                    <div className="relative z-10 space-y-3">
                      {shelfItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                          Keine Produkte in diesem Regal.
                        </div>
                      ) : (
                        shelfItems.map((item) => {
                          const qty = Number(item.quantity);
                          const status = stockStatus(qty);

                          return (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f5f1e8] text-3xl">
                                  {productIcon(item.item_name, item.category)}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h3 className="text-lg font-black leading-tight">
                                        {item.item_name}
                                      </h3>
                                      <p className="mt-1 text-sm text-stone-500">
                                        {item.quantity} {item.unit || ""}
                                      </p>
                                    </div>

                                    <span
                                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${status.color}`}
                                    >
                                      {status.label}
                                    </span>
                                  </div>

                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                                    <div
                                      className={`h-full rounded-full ${meterColor(qty)}`}
                                      style={{ width: `${meterPercent(qty)}%` }}
                                    />
                                  </div>

                                  {item.note ? (
                                    <p className="mt-2 rounded-xl bg-[#fff8df] px-3 py-2 text-xs font-medium text-stone-700">
                                      {item.note}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <BottomNav />
      </div>
    </main>
  );
}