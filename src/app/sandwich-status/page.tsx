"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import BottomNav from "../../components/BottomNav";

type StockItem = {
  id: string;
  item_name: string;
  quantity: string;
  unit: string | null;
};

type Sandwich = {
  name: string;
  type: string;
  icon: string;
  ingredients: string[];
};

const SANDWICHES: Sandwich[] = [
  {
    name: "Kringel Tofu Chili",
    type: "Vegan",
    icon: "🥯",
    ingredients: ["Tofu", "Salat", "Gurke", "Tomate scharf"],
  },
  {
    name: "Bagel Putenbrust",
    type: "Fleisch",
    icon: "🥯",
    ingredients: ["Pute", "Salat", "Sahne"],
  },
  {
    name: "Simit Rote Bete",
    type: "Vegan",
    icon: "🥨",
    ingredients: ["Rote Bete", "Vegane Mayo", "Salat"],
  },
  {
    name: "Brötchen Camembert",
    type: "Käse",
    icon: "🥖",
    ingredients: ["Brie", "Preiselbeere", "Salat"],
  },
  {
    name: "Käsestange Ei",
    type: "Ei / Käse",
    icon: "🥚",
    ingredients: ["Eier", "Gouda", "Salat"],
  },
  {
    name: "Räuchertofu Sesam-Mandel",
    type: "Vegan",
    icon: "🥪",
    ingredients: ["Räuchertofu", "Salat", "Gurke", "Vegane Mayo"],
  },
  {
    name: "Brötchen Käse und Ei",
    type: "Ei / Käse",
    icon: "🥚",
    ingredients: ["Eier", "Gouda", "Salat"],
  },
  {
    name: "Bergkäse Brötchen",
    type: "Käse",
    icon: "🧀",
    ingredients: ["Bergkäse", "Salat", "Gurke"],
  },
  {
    name: "Dinkel Mozzarella",
    type: "Käse",
    icon: "🧀",
    ingredients: ["Mozzarella", "Pesto", "Rucola", "Tomate"],
  },
  {
    name: "Fleischkäse Brötchen",
    type: "Fleisch",
    icon: "🥩",
    ingredients: ["Fleischkäse", "Senf-Mayo", "Salat"],
  },
  {
    name: "Gouda Brötchen",
    type: "Käse",
    icon: "🧀",
    ingredients: ["Gouda", "Salat", "Gurke"],
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .trim();
}

function ingredientAvailable(ingredient: string, stockItems: StockItem[]) {
  const ingredientText = normalize(ingredient);

  return stockItems.some((item) => {
    const itemName = normalize(item.item_name);
    const quantity = Number(item.quantity);

    const nameMatches =
      itemName.includes(ingredientText) || ingredientText.includes(itemName);

    return nameMatches && !Number.isNaN(quantity) && quantity > 0;
  });
}

function getProgressColor(progress: number) {
  if (progress < 40) return "bg-red-500";
  if (progress < 80) return "bg-amber-500";
  return "bg-[#2f7d46]";
}

function getStatusText(progress: number) {
  if (progress === 100) return "Bereit";
  if (progress >= 60) return "Fast bereit";
  return "Fehlt Ware";
}

function getStatusClass(progress: number) {
  if (progress === 100) return "bg-[#e8f2eb] text-[#1f4d2b] border-[#d5eadb]";
  if (progress >= 60) return "bg-amber-50 text-amber-800 border-amber-100";
  return "bg-red-50 text-red-700 border-red-100";
}

export default function SandwichStatusPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
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

    loadStock();
  }, []);

  async function loadStock() {
    setLoading(true);

    const { data, error } = await supabase
      .from("stock_items")
      .select("id, item_name, quantity, unit")
      .order("item_name", { ascending: true });

    if (error) {
      alert(`Fehler beim Laden: ${error.message}`);
      setStockItems([]);
      setLoading(false);
      return;
    }

    setStockItems(data || []);
    setLoading(false);
  }

  const sandwichStatus = useMemo(() => {
    return SANDWICHES.map((sandwich) => {
      const available = sandwich.ingredients.filter((ingredient) =>
        ingredientAvailable(ingredient, stockItems)
      );

      const missing = sandwich.ingredients.filter(
        (ingredient) => !ingredientAvailable(ingredient, stockItems)
      );

      const progress = Math.round(
        (available.length / sandwich.ingredients.length) * 100
      );

      return {
        ...sandwich,
        available,
        missing,
        progress,
      };
    });
  }, [stockItems]);

  const readyCount = sandwichStatus.filter((item) => item.progress === 100).length;
  const warningCount = sandwichStatus.filter(
    (item) => item.progress > 0 && item.progress < 100
  ).length;
  const blockedCount = sandwichStatus.filter((item) => item.progress === 0).length;

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
                Sandwich Status
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Was können wir mit aktuellem Lager machen?
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f1e8] px-3 py-2 text-right">
              <p className="text-[11px] text-stone-500">Heute</p>
              <p className="text-sm font-bold">{todayText}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#1f4d2b] p-3 text-white">
              <p className="text-[11px] text-white/75">Bereit</p>
              <p className="mt-1 text-2xl font-black">{readyCount}</p>
            </div>

            <div className="rounded-2xl bg-[#d6a21e] p-3 text-white">
              <p className="text-[11px] text-white/75">Teilweise</p>
              <p className="mt-1 text-2xl font-black">{warningCount}</p>
            </div>

            <div className="rounded-2xl bg-red-600 p-3 text-white">
              <p className="text-[11px] text-white/75">Blockiert</p>
              <p className="mt-1 text-2xl font-black">{blockedCount}</p>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-sm">
            Sandwich Status wird geladen...
          </section>
        ) : (
          <section className="mt-5 space-y-4">
            {sandwichStatus.map((sandwich) => (
              <article
                key={sandwich.name}
                className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm"
              >
                <div className="bg-[#fbfaf7] px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f5f1e8] text-3xl">
                      {sandwich.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-xl font-black leading-tight">
                            {sandwich.name}
                          </h2>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-stone-500">
                            {sandwich.type}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                            sandwich.progress
                          )}`}
                        >
                          {getStatusText(sandwich.progress)}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                            Zutaten-Meter
                          </p>
                          <p className="text-sm font-black">{sandwich.progress}%</p>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className={`h-full rounded-full ${getProgressColor(
                              sandwich.progress
                            )}`}
                            style={{
                              width: `${sandwich.progress}%`,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="rounded-2xl bg-[#e8f2eb] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#1f4d2b]">
                      Verfügbar
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#1f4d2b]">
                      {sandwich.available.length > 0
                        ? sandwich.available.join(", ")
                        : "Keine Zutaten verfügbar"}
                    </p>
                  </div>

                  {sandwich.missing.length > 0 ? (
                    <div className="rounded-2xl bg-red-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                        Fehlt
                      </p>
                      <p className="mt-2 text-sm font-semibold text-red-700">
                        {sandwich.missing.join(", ")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#f5f1e8] px-4 py-3">
                      <p className="text-sm font-black text-[#1f4d2b]">
                        Alles vorhanden — kann vorbereitet werden.
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        <BottomNav />
      </div>
    </main>
  );
}