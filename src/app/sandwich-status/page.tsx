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

type SandwichRecipe = {
  id: string;
  name: string;
  type: string | null;
  icon: string | null;
  ingredients: string[] | null;
};

const EMPTY_FORM = {
  name: "",
  type: "Vegan",
  icon: "🥪",
  ingredientText: "",
};

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

function parseIngredients(text: string) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function SandwichStatusPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [recipes, setRecipes] = useState<SandwichRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayText, setTodayText] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<SandwichRecipe | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    setTodayText(
      new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );

    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadStock(), loadRecipes()]);
    setLoading(false);
  }

  async function loadStock() {
    const { data, error } = await supabase
      .from("stock_items")
      .select("id, item_name, quantity, unit")
      .order("item_name", { ascending: true });

    if (error) {
      alert(`Lager konnte nicht geladen werden: ${error.message}`);
      setStockItems([]);
      return;
    }

    setStockItems(data || []);
  }

  async function loadRecipes() {
    const { data, error } = await supabase
      .from("sandwich_recipes")
      .select("id, name, type, icon, ingredients")
      .order("name", { ascending: true });

    if (error) {
      alert(`Sandwich-Rezepte konnten nicht geladen werden: ${error.message}`);
      setRecipes([]);
      return;
    }

    setRecipes(data || []);
  }

  function openAddForm() {
    setEditingRecipe(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditForm(recipe: SandwichRecipe) {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name || "",
      type: recipe.type || "Vegan",
      icon: recipe.icon || "🥪",
      ingredientText: (recipe.ingredients || []).join(", "),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingRecipe(null);
    setFormData(EMPTY_FORM);
  }

  async function saveRecipe() {
    const name = formData.name.trim();
    const ingredients = parseIngredients(formData.ingredientText);

    if (!name) {
      alert("Bitte Sandwich-Name eingeben.");
      return;
    }

    if (ingredients.length === 0) {
      alert("Bitte mindestens eine Zutat eingeben.");
      return;
    }

    const payload = {
      name,
      type: formData.type.trim() || null,
      icon: formData.icon.trim() || "🥪",
      ingredients,
      updated_at: new Date().toISOString(),
    };

    if (editingRecipe) {
      const { error } = await supabase
        .from("sandwich_recipes")
        .update(payload)
        .eq("id", editingRecipe.id);

      if (error) {
        alert(`Speichern fehlgeschlagen: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("sandwich_recipes").insert(payload);

      if (error) {
        alert(`Hinzufügen fehlgeschlagen: ${error.message}`);
        return;
      }
    }

    closeForm();
    await loadRecipes();
  }

  async function deleteRecipe(recipe: SandwichRecipe) {
    const ok = window.confirm(`${recipe.name} wirklich löschen?`);
    if (!ok) return;

    const { error } = await supabase
      .from("sandwich_recipes")
      .delete()
      .eq("id", recipe.id);

    if (error) {
      alert(`Löschen fehlgeschlagen: ${error.message}`);
      return;
    }

    await loadRecipes();
  }

  const sandwichStatus = useMemo(() => {
    return recipes.map((recipe) => {
      const ingredients = recipe.ingredients || [];

      const available = ingredients.filter((ingredient) =>
        ingredientAvailable(ingredient, stockItems)
      );

      const missing = ingredients.filter(
        (ingredient) => !ingredientAvailable(ingredient, stockItems)
      );

      const progress =
        ingredients.length === 0
          ? 0
          : Math.round((available.length / ingredients.length) * 100);

      return {
        ...recipe,
        ingredients,
        available,
        missing,
        progress,
      };
    });
  }, [recipes, stockItems]);

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
                Zutaten prüfen und Sandwiches bearbeiten
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

          <button
            onClick={openAddForm}
            className="mt-4 w-full rounded-2xl bg-[#1f4d2b] px-4 py-3 font-black text-white"
          >
            + Sandwich hinzufügen
          </button>
        </section>

        {showForm ? (
          <section className="mt-5 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">
                {editingRecipe ? "Sandwich bearbeiten" : "Sandwich hinzufügen"}
              </h2>

              <button
                onClick={closeForm}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700"
              >
                Schließen
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Name
                </label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="z.B. Kringel Tofu Chili"
                  className="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-semibold outline-none focus:border-[#1f4d2b]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Typ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-semibold outline-none focus:border-[#1f4d2b]"
                >
                  <option value="Vegan">Vegan</option>
                  <option value="Vegetarisch">Vegetarisch</option>
                  <option value="Käse">Käse</option>
                  <option value="Ei / Käse">Ei / Käse</option>
                  <option value="Fleisch">Fleisch</option>
                  <option value="Sonstiges">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Icon
                </label>
                <input
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="🥪"
                  className="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-semibold outline-none focus:border-[#1f4d2b]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Zutaten
                </label>
                <textarea
                  value={formData.ingredientText}
                  onChange={(e) =>
                    setFormData({ ...formData, ingredientText: e.target.value })
                  }
                  placeholder="Tofu, Salat, Gurke, Tomate scharf"
                  className="mt-1 min-h-[110px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-semibold outline-none focus:border-[#1f4d2b]"
                />
                <p className="mt-2 text-xs text-stone-500">
                  Zutaten bitte mit Komma trennen.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={closeForm}
                className="rounded-2xl bg-stone-200 px-4 py-3 font-bold text-stone-700"
              >
                Abbrechen
              </button>

              <button
                onClick={saveRecipe}
                className="rounded-2xl bg-[#1f4d2b] px-4 py-3 font-black text-white"
              >
                Speichern
              </button>
            </div>
          </section>
        ) : null}

        {loading ? (
          <section className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-sm">
            Sandwich Status wird geladen...
          </section>
        ) : sandwichStatus.length === 0 ? (
          <section className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-sm">
            Noch keine Sandwiches vorhanden.
          </section>
        ) : (
          <section className="mt-5 space-y-4">
            {sandwichStatus.map((sandwich) => (
              <article
                key={sandwich.id}
                className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm"
              >
                <div className="bg-[#fbfaf7] px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f5f1e8] text-3xl">
                      {sandwich.icon || "🥪"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-xl font-black leading-tight">
                            {sandwich.name}
                          </h2>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-stone-500">
                            {sandwich.type || "Sonstiges"}
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

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => openEditForm(sandwich)}
                      className="rounded-2xl bg-stone-800 px-4 py-3 font-bold text-white"
                    >
                      Bearbeiten
                    </button>

                    <button
                      onClick={() => deleteRecipe(sandwich)}
                      className="rounded-2xl border border-red-200 bg-white px-4 py-3 font-bold text-red-700"
                    >
                      Löschen
                    </button>
                  </div>
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