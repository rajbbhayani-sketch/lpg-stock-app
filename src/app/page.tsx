"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/BottomNav";

type StockItem = {
  id: string;
  item_name: string;
  quantity: string;
  unit: string | null;
  note: string | null;
  updated_by: string | null;
  updated_at: string | null;
  category?: string | null;
  product_number?: string | null;
  product_date?: string | null;
  expiry_date?: string | null;
};

const UNITS = ["kg", "g", "Box", "Packung", "Stück", "Liter"];
const QUICK_QTY = ["0.5", "1", "2", "3", "5", "10"];
const QUICK_ADD = [1, 2, 5];

const COMMON_PRODUCTS = [
  "Tomate",
  "Gurke",
  "Salat",
  "Rucola",
  "Paprika",
  "Rote Bete",
  "Petersilie",
  "Kresse",
  "Gouda",
  "Mozzarella",
  "Brie",
  "Bergkäse",
  "Camembert",
  "Pute",
  "Salami",
  "Schinken",
  "Tofu",
  "Räuchertofu",
  "Eier",
  "Mayo",
  "Senf-Mayo",
  "Vegane Mayo",
  "Pesto",
  "Sahne",
  "Dill",
  "Meerrettich",
  "Preiselbeere",
  "Tomate scharf",
  "Olivencreme",
];

const EMPTY_FORM = {
  item_name: "",
  quantity: "",
  unit: "kg",
  note: "",
  category: "Other",
};

function guessCategory(name: string) {
  const text = name.toLowerCase();

  if (
    text.includes("tomate") ||
    text.includes("gurke") ||
    text.includes("salat") ||
    text.includes("rucola") ||
    text.includes("paprika") ||
    text.includes("rote bete") ||
    text.includes("petersilie") ||
    text.includes("kresse")
  ) {
    return "Vegetables";
  }

  if (
    text.includes("gouda") ||
    text.includes("mozzarella") ||
    text.includes("brie") ||
    text.includes("bergkäse") ||
    text.includes("camembert") ||
    text.includes("pute") ||
    text.includes("salami") ||
    text.includes("schinken") ||
    text.includes("tofu") ||
    text.includes("ei")
  ) {
    return "Dairy";
  }

  return "Other";
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

export default function Home() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [workerName, setWorkerName] = useState("");
  const [todayText, setTodayText] = useState("");
  const [loading, setLoading] = useState(true);

  const [quickForm, setQuickForm] = useState(EMPTY_FORM);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("workerName");
    if (savedName) setWorkerName(savedName);

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
      .select("*")
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

  const productSuggestions = useMemo(() => {
    const existing = items.map((item) => item.item_name);
    return Array.from(new Set([...COMMON_PRODUCTS, ...existing])).sort();
  }, [items]);

  const filteredSuggestions = useMemo(() => {
    const value = quickForm.item_name.toLowerCase();

    if (!value) return productSuggestions;

    return productSuggestions.filter((name) =>
      name.toLowerCase().includes(value)
    );
  }, [productSuggestions, quickForm.item_name]);

  const stats = useMemo(() => {
    const notUpdatedToday = items.filter((item) => !isUpdatedToday(item.updated_at));
    const lowItems = items.filter((item) => Number(item.quantity) <= 2);
    const emptyItems = items.filter((item) => Number(item.quantity) <= 0);

    return {
      totalProducts: items.length,
      updatedToday: items.length - notUpdatedToday.length,
      notUpdatedToday,
      lowItems,
      emptyItems,
    };
  }, [items]);

  async function saveHistory(
    itemName: string,
    oldQuantity: string,
    newQuantity: string
  ) {
    await supabase.from("stock_history").insert({
      item_name: itemName,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      changed_by: workerName.trim() || "Küche",
      changed_at: new Date().toISOString(),
    });
  }

  async function quickSave() {
    const name = quickForm.item_name.trim();
    const qty = quickForm.quantity.trim();
    const unit = quickForm.unit.trim();

    if (!name) {
      alert("Bitte Produkt auswählen oder eingeben.");
      return;
    }

    if (!qty || Number.isNaN(Number(qty))) {
      alert("Bitte Menge eingeben.");
      return;
    }

    const existingItem = items.find(
      (item) => item.item_name.toLowerCase() === name.toLowerCase()
    );

    const payload = {
      item_name: name,
      quantity: qty,
      unit,
      note: quickForm.note.trim() || null,
      category: guessCategory(name),
      updated_by: workerName.trim() || "Küche",
      updated_at: new Date().toISOString(),
    };

    if (existingItem) {
      const { error } = await supabase
        .from("stock_items")
        .update(payload)
        .eq("id", existingItem.id);

      if (error) {
        alert(`Speichern fehlgeschlagen: ${error.message}`);
        return;
      }

      await saveHistory(existingItem.item_name, existingItem.quantity, qty);
    } else {
      const { error } = await supabase.from("stock_items").insert(payload);

      if (error) {
        alert(`Produkt hinzufügen fehlgeschlagen: ${error.message}`);
        return;
      }

      await saveHistory(name, "0", qty);
    }

    setQuickForm(EMPTY_FORM);
    setEditingItem(null);
    setShowSuggestions(false);
    await loadItems();
  }

  async function updateQuantity(item: StockItem, change: number) {
    const currentQty = Number(item.quantity);

    if (Number.isNaN(currentQty)) {
      alert("Menge ist keine Zahl.");
      return;
    }

    const newQty = Math.max(0, currentQty + change);

    const { error } = await supabase
      .from("stock_items")
      .update({
        quantity: String(newQty),
        updated_by: workerName.trim() || "Küche",
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert(`Fehler beim Aktualisieren: ${error.message}`);
      return;
    }

    await saveHistory(item.item_name, String(currentQty), String(newQty));
    await loadItems();
  }

  function openEdit(item: StockItem) {
    setEditingItem(item);
    setQuickForm({
      item_name: item.item_name || "",
      quantity: item.quantity || "",
      unit: item.unit || "kg",
      note: item.note || "",
      category: item.category || "Other",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteItem(item: StockItem) {
    const ok = window.confirm(`${item.item_name} wirklich löschen?`);
    if (!ok) return;

    const { error } = await supabase
      .from("stock_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(`Löschen fehlgeschlagen: ${error.message}`);
      return;
    }

    await saveHistory(item.item_name, item.quantity, "GELÖSCHT");
    await loadItems();
  }

  function getStatus(qty: number) {
    if (qty <= 0) return "Leer";
    if (qty <= 2) return "Wenig";
    return "OK";
  }

  function getStatusClass(qty: number, updatedToday: boolean) {
    if (!updatedToday) return "bg-red-50 text-red-700";
    if (qty <= 0) return "bg-red-50 text-red-700";
    if (qty <= 2) return "bg-amber-50 text-amber-800";
    return "bg-[#e8f2eb] text-[#1f4d2b]";
  }

  function getMeterColor(qty: number, updatedToday: boolean) {
    if (!updatedToday) return "bg-red-500";
    if (qty <= 0) return "bg-red-500";
    if (qty <= 2) return "bg-amber-500";
    return "bg-[#2f7d46]";
  }

  function getMeterPercent(qty: number) {
    return Math.min((qty / 10) * 100, 100);
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
                Lager
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Schnelle Tagesaktualisierung
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
              <p className="mt-1 text-2xl font-black">{stats.totalProducts}</p>
            </div>

            <div className="rounded-2xl bg-[#2f7d46] p-3 text-white">
              <p className="text-[11px] text-white/75">Heute</p>
              <p className="mt-1 text-2xl font-black">{stats.updatedToday}</p>
            </div>

            <div className="rounded-2xl bg-[#d6a21e] p-3 text-white">
              <p className="text-[11px] text-white/75">Wenig</p>
              <p className="mt-1 text-2xl font-black">{stats.lowItems.length}</p>
            </div>
          </div>

          {stats.notUpdatedToday.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-black text-amber-900">
                ⚠️ {stats.notUpdatedToday.length} Produkt(e) heute noch nicht aktualisiert
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Bitte Bestand prüfen und speichern.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-[#d5eadb] bg-[#e8f2eb] px-4 py-3">
              <p className="text-sm font-black text-[#1f4d2b]">
                ✅ Alle Produkte wurden heute aktualisiert
              </p>
            </div>
          )}

          {stats.lowItems.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm font-black text-red-700">
                Niedriger Bestand
              </p>
              <p className="mt-1 text-xs text-red-700">
                {stats.lowItems.map((item) => item.item_name).join(", ")}
              </p>
            </div>
          ) : null}
        </section>

        <section className="mt-5 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">
              {editingItem ? "Produkt bearbeiten" : "Schnelle Eingabe"}
            </h2>

            {editingItem ? (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setQuickForm(EMPTY_FORM);
                }}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700"
              >
                Neu
              </button>
            ) : null}
          </div>

          <div className="relative mt-4">
            <label className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Produkt
            </label>

            <input
              value={quickForm.item_name}
              onChange={(e) => {
                setQuickForm({
                  ...quickForm,
                  item_name: e.target.value,
                  category: guessCategory(e.target.value),
                });
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Produkt suchen oder neu eingeben..."
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-semibold outline-none focus:border-[#1f4d2b]"
            />

            {showSuggestions && (
              <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl">
                {filteredSuggestions.length === 0 ? (
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="w-full px-4 py-3 text-left text-sm text-stone-500"
                  >
                    Neues Produkt verwenden
                  </button>
                ) : (
                  filteredSuggestions.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setQuickForm({
                          ...quickForm,
                          item_name: name,
                          category: guessCategory(name),
                        });
                        setShowSuggestions(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-stone-50"
                    >
                      <span>{name}</span>
                      <span className="text-xs text-stone-400">Auswählen</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Menge
            </label>

            <input
              value={quickForm.quantity}
              onChange={(e) =>
                setQuickForm({ ...quickForm, quantity: e.target.value })
              }
              type="number"
              step="0.1"
              placeholder="z.B. 4.5"
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-lg font-black outline-none focus:border-[#1f4d2b]"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_QTY.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuickForm({ ...quickForm, quantity: q })}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    quickForm.quantity === q
                      ? "bg-[#1f4d2b] text-white"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Einheit
            </label>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {UNITS.map((unit) => (
                <button
                  key={unit}
                  onClick={() => setQuickForm({ ...quickForm, unit })}
                  className={`rounded-2xl px-3 py-3 text-sm font-bold ${
                    quickForm.unit === unit
                      ? "bg-[#1f4d2b] text-white"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Notiz
            </label>

            <input
              value={quickForm.note}
              onChange={(e) =>
                setQuickForm({ ...quickForm, note: e.target.value })
              }
              placeholder="Optional: geöffnet, neu geliefert..."
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-[#1f4d2b]"
            />
          </div>

          <button
            onClick={quickSave}
            className="mt-5 w-full rounded-2xl bg-[#1f4d2b] px-4 py-4 text-base font-black text-white shadow-sm active:scale-[0.99]"
          >
            {editingItem ? "Änderung speichern" : "Bestand speichern"}
          </button>
        </section>

        <section className="mt-5 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Einkaufsliste</h2>
          <p className="mt-1 text-sm text-stone-500">
            Automatisch aus leerem oder niedrigem Bestand
          </p>

          <div className="mt-4 space-y-2">
            {stats.lowItems.length === 0 ? (
              <div className="rounded-2xl bg-[#e8f2eb] px-4 py-3 text-sm font-bold text-[#1f4d2b]">
                Keine Produkte auf der Einkaufsliste.
              </div>
            ) : (
              stats.lowItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"
                >
                  <div>
                    <p className="font-black">{item.item_name}</p>
                    <p className="text-xs text-stone-500">
                      Aktuell: {item.quantity} {item.unit || ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    Kaufen
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {loading ? (
            <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">
              Produkte werden geladen...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">
              Keine Produkte gefunden.
            </div>
          ) : (
            items.map((item) => {
              const qty = Number(item.quantity);
              const safeQty = Number.isNaN(qty) ? 0 : qty;
              const updatedToday = isUpdatedToday(item.updated_at);

              return (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black">{item.item_name}</h3>
                      <p className="mt-1 text-sm font-semibold text-stone-700">
                        {item.quantity} {item.unit || ""}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                        safeQty,
                        updatedToday
                      )}`}
                    >
                      {!updatedToday ? "Nicht heute" : getStatus(safeQty)}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className={`h-full rounded-full ${getMeterColor(
                        safeQty,
                        updatedToday
                      )}`}
                      style={{
                        width: `${getMeterPercent(safeQty)}%`,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  {item.note ? (
                    <p className="mt-3 rounded-xl bg-[#fff8df] px-3 py-2 text-xs font-medium text-stone-700">
                      {item.note}
                    </p>
                  ) : null}

                  <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2">
                    <p className="text-xs text-stone-500">Aktualisiert von</p>
                    <p className="text-sm font-bold">
                      {item.updated_by || "-"}
                    </p>
                    {item.updated_at ? (
                      <p className="mt-1 text-xs text-stone-500">
                        {new Date(item.updated_at).toLocaleString("de-DE")}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {QUICK_ADD.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => updateQuantity(item, amount)}
                        className="h-11 rounded-2xl bg-[#e8f2eb] text-sm font-black text-[#1f4d2b]"
                      >
                        +{amount}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateQuantity(item, -1)}
                      className="h-12 rounded-2xl border border-red-200 bg-red-50 font-bold text-red-700"
                    >
                      − Minus
                    </button>

                    <button
                      onClick={() => updateQuantity(item, 1)}
                      className="h-12 rounded-2xl bg-[#1f4d2b] font-bold text-white"
                    >
                      + Plus
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded-2xl bg-stone-800 px-4 py-3 font-bold text-white"
                    >
                      Bearbeiten
                    </button>

                    <button
                      onClick={() => deleteItem(item)}
                      className="rounded-2xl border border-red-200 bg-white px-4 py-3 font-bold text-red-700"
                    >
                      Löschen
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <BottomNav />
      </div>
    </main>
  );
}