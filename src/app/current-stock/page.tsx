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
  updated_by?: string | null;
  updated_at?: string | null;
};

type Group = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  match: string[];
};

const GROUPS: Group[] = [
  {
    title: "Frischware",
    subtitle: "Gemüse, Salat, frische Zutaten",
    icon: "🥬",
    color: "bg-[#1f4d2b]",
    match: [
      "tomato",
      "tomate",
      "salat",
      "salad",
      "gurke",
      "cucumber",
      "rucola",
      "paprika",
      "rote bete",
      "beet",
      "petersilie",
      "kresse",
      "zucchini",
      "aubergine",
    ],
  },
  {
    title: "Kühlware",
    subtitle: "Käse, Fleisch, Tofu und gekühlte Ware",
    icon: "🧊",
    color: "bg-[#284b63]",
    match: [
      "gouda",
      "mozzarella",
      "brie",
      "bergkäse",
      "käse",
      "camembert",
      "pute",
      "putenbrust",
      "tofu",
      "räuchertofu",
      "leberkäse",
      "fleischkäse",
      "salami",
      "schinken",
      "pastrami",
      "ei",
      "eier",
    ],
  },
  {
    title: "Saucen & Creme",
    subtitle: "Aufstriche, Mayo, Pesto und Cremes",
    icon: "🥣",
    color: "bg-[#8a5a28]",
    match: [
      "mayo",
      "senf",
      "senf-mayo",
      "pesto",
      "preiselbeere",
      "tomatenaufstrich",
      "tomate scharf",
      "olivencreme",
      "olivenöl",
      "bbq",
      "dill",
      "meerrettich",
      "sahne",
      "creme",
      "vegane mayo",
    ],
  },
  {
    title: "Sonstiges",
    subtitle: "Weitere Lagerprodukte",
    icon: "📦",
    color: "bg-stone-800",
    match: [],
  },
];

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

function getStatus(item: StockItem) {
  const qty = getNumber(item.quantity);
  const updatedToday = isUpdatedToday(item.updated_at);

  if (!updatedToday) {
    return {
      label: "Nicht heute",
      className: "bg-red-50 text-red-700 border-red-100",
    };
  }

  if (qty <= 0) {
    return {
      label: "Leer",
      className: "bg-red-50 text-red-700 border-red-100",
    };
  }

  if (qty <= 2) {
    return {
      label: "Wenig",
      className: "bg-amber-50 text-amber-800 border-amber-100",
    };
  }

  return {
    label: "OK",
    className: "bg-[#e8f2eb] text-[#1f4d2b] border-[#d5eadb]",
  };
}

function getMeterColor(item: StockItem) {
  const qty = getNumber(item.quantity);

  if (!isUpdatedToday(item.updated_at)) return "bg-red-500";
  if (qty <= 0) return "bg-red-500";
  if (qty <= 2) return "bg-amber-500";
  return "bg-[#2f7d46]";
}

function getMeterPercent(item: StockItem) {
  const qty = getNumber(item.quantity);
  return Math.min((qty / 10) * 100, 100);
}

function getProductIcon(name: string) {
  const text = name.toLowerCase();

  if (text.includes("tomate") || text.includes("tomato")) return "🍅";
  if (text.includes("salat") || text.includes("salad")) return "🥬";
  if (text.includes("gurke") || text.includes("cucumber")) return "🥒";
  if (text.includes("paprika")) return "🫑";
  if (text.includes("rucola")) return "🌿";
  if (text.includes("käse") || text.includes("gouda") || text.includes("mozzarella") || text.includes("brie")) return "🧀";
  if (text.includes("pute") || text.includes("schinken") || text.includes("salami") || text.includes("fleisch")) return "🥩";
  if (text.includes("tofu")) return "🧈";
  if (text.includes("mayo") || text.includes("pesto") || text.includes("creme") || text.includes("sahne")) return "🥣";
  if (text.includes("ei")) return "🥚";

  return "📦";
}

function getGroupForItem(item: StockItem) {
  const name = item.item_name.toLowerCase();

  const foundGroup = GROUPS.find((group) =>
    group.match.some((word) => name.includes(word.toLowerCase()))
  );

  return foundGroup?.title || "Sonstiges";
}

export default function CurrentStockPage() {
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
      .select("id, item_name, quantity, unit, category, note, updated_by, updated_at")
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

  const stats = useMemo(() => {
    const updatedTodayCount = items.filter((item) =>
      isUpdatedToday(item.updated_at)
    ).length;

    const notUpdatedCount = items.length - updatedTodayCount;

    const lowCount = items.filter((item) => {
      const qty = getNumber(item.quantity);
      return qty <= 2;
    }).length;

    const totalQuantity = items.reduce((sum, item) => {
      return sum + getNumber(item.quantity);
    }, 0);

    return {
      totalProducts: items.length,
      totalQuantity,
      updatedTodayCount,
      notUpdatedCount,
      lowCount,
    };
  }, [items]);

  function getItemsForGroup(groupTitle: string) {
    return items.filter((item) => getGroupForItem(item) === groupTitle);
  }

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
                Aktueller Lagerbestand
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Manager-Übersicht für den heutigen Bestand
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f1e8] px-3 py-2 text-right">
              <p className="text-[11px] text-stone-500">Heute</p>
              <p className="text-sm font-bold">{todayText}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#1f4d2b] p-4 text-white">
              <p className="text-xs text-white/75">Produkte</p>
              <p className="mt-1 text-3xl font-black">{stats.totalProducts}</p>
            </div>

            <div className="rounded-2xl bg-stone-800 p-4 text-white">
              <p className="text-xs text-white/75">Gesamtmenge</p>
              <p className="mt-1 text-3xl font-black">{stats.totalQuantity}</p>
            </div>

            <div className="rounded-2xl bg-[#2f7d46] p-4 text-white">
              <p className="text-xs text-white/75">Heute aktualisiert</p>
              <p className="mt-1 text-3xl font-black">{stats.updatedTodayCount}</p>
            </div>

            <div className="rounded-2xl bg-[#d6a21e] p-4 text-white">
              <p className="text-xs text-white/75">Wenig / Leer</p>
              <p className="mt-1 text-3xl font-black">{stats.lowCount}</p>
            </div>
          </div>

          {stats.notUpdatedCount > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">
                ⚠️ {stats.notUpdatedCount} Produkt(e) wurden heute noch nicht aktualisiert.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Bitte Bestand prüfen und auf der Lagerseite aktualisieren.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-[#d5eadb] bg-[#e8f2eb] px-4 py-3">
              <p className="text-sm font-bold text-[#1f4d2b]">
                ✅ Alle Produkte wurden heute aktualisiert.
              </p>
            </div>
          )}
        </section>

        {loading ? (
          <section className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-sm">
            Lagerbestand wird geladen...
          </section>
        ) : (
          <div className="mt-5 space-y-5">
            {GROUPS.map((group) => {
              const groupItems = getItemsForGroup(group.title);
              const groupQuantity = groupItems.reduce(
                (sum, item) => sum + getNumber(item.quantity),
                0
              );
              const groupNotUpdated = groupItems.filter(
                (item) => !isUpdatedToday(item.updated_at)
              ).length;

              return (
                <section
                  key={group.title}
                  className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm"
                >
                  <div className="border-b border-stone-200 bg-[#fbfaf7] px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f5d3a]">
                          {group.subtitle}
                        </p>
                        <h2 className="mt-1 text-2xl font-black">
                          {group.title}
                        </h2>
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f1e8] text-3xl">
                        {group.icon}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
                        {groupItems.length} Produkte
                      </span>

                      <span className="rounded-full bg-[#e8f2eb] px-3 py-1 text-xs font-bold text-[#1f4d2b]">
                        Gesamt: {groupQuantity}
                      </span>

                      {groupNotUpdated > 0 ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          {groupNotUpdated} offen
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    {groupItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                        Keine Produkte in dieser Kategorie.
                      </div>
                    ) : (
                      groupItems.map((item) => {
                        const qty = getNumber(item.quantity);
                        const status = getStatus(item);
                        const updatedToday = isUpdatedToday(item.updated_at);

                        return (
                          <article
                            key={item.id}
                            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f5f1e8] text-2xl">
                                {getProductIcon(item.item_name)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="text-lg font-black leading-tight">
                                      {item.item_name}
                                    </h3>

                                    <p className="mt-1 text-sm font-semibold text-stone-700">
                                      {item.quantity} {item.unit || ""}
                                    </p>
                                  </div>

                                  <span
                                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}
                                  >
                                    {status.label}
                                  </span>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                                  <div
                                    className={`h-full rounded-full ${getMeterColor(item)}`}
                                    style={{
                                      width: `${getMeterPercent(item)}%`,
                                      transition: "width 0.4s ease",
                                    }}
                                  />
                                </div>

                                {item.note ? (
                                  <div className="mt-3 rounded-xl bg-[#fff8df] px-3 py-2 text-xs font-medium text-stone-700">
                                    {item.note}
                                  </div>
                                ) : null}

                                <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2">
                                  <p className="text-xs text-stone-500">
                                    Aktualisiert von
                                  </p>
                                  <p className="text-sm font-bold text-stone-800">
                                    {item.updated_by || "-"}
                                  </p>

                                  <p
                                    className={`mt-1 text-xs font-medium ${
                                      updatedToday
                                        ? "text-[#1f4d2b]"
                                        : "text-red-700"
                                    }`}
                                  >
                                    {item.updated_at
                                      ? new Date(item.updated_at).toLocaleString("de-DE")
                                      : "Noch nicht aktualisiert"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
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