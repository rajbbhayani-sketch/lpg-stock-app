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

const FILTERS = ["Alle", "Vegetables", "Dairy", "Other"];

const EMPTY_FORM = {
  item_name: "",
  quantity: "0",
  unit: "",
  note: "",
  category: "Other",
  product_number: "",
  product_date: "",
  expiry_date: "",
};

export default function Home() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [workerName, setWorkerName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [todayText, setTodayText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedName = localStorage.getItem("workerName");
    if (savedName) setWorkerName(savedName);

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

  async function saveHistory(itemName: string, oldQuantity: string, newQuantity: string) {
    if (!workerName.trim()) return;

    await supabase.from("stock_history").insert({
      item_name: itemName,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      changed_by: workerName.trim(),
      changed_at: new Date().toISOString(),
    });
  }

  async function updateQuantity(item: StockItem, change: number) {
    if (!workerName.trim()) {
      alert("Bitte zuerst Namen eingeben.");
      return;
    }

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
        updated_by: workerName.trim(),
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

  function openAddForm() {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(item: StockItem) {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name || "",
      quantity: item.quantity || "0",
      unit: item.unit || "",
      note: item.note || "",
      category: item.category || "Other",
      product_number: item.product_number || "",
      product_date: item.product_date || "",
      expiry_date: item.expiry_date || "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSaveProduct() {
    if (!workerName.trim()) {
      alert("Bitte zuerst Namen eingeben.");
      return;
    }

    if (!formData.item_name.trim()) {
      alert("Produktname ist erforderlich.");
      return;
    }

    if (Number.isNaN(Number(formData.quantity))) {
      alert("Menge muss eine Zahl sein.");
      return;
    }

    const payload = {
      item_name: formData.item_name.trim(),
      quantity: String(Math.max(0, Number(formData.quantity))),
      unit: formData.unit.trim() || null,
      note: formData.note.trim() || null,
      category: formData.category || "Other",
      product_number: formData.product_number.trim() || null,
      product_date: formData.product_date || null,
      expiry_date: formData.expiry_date || null,
      updated_by: workerName.trim(),
      updated_at: new Date().toISOString(),
    };

    if (editingItem) {
      const { error } = await supabase.from("stock_items").update(payload).eq("id", editingItem.id);

      if (error) {
        alert(`Speichern fehlgeschlagen: ${error.message}`);
        return;
      }

      await saveHistory(editingItem.item_name, editingItem.quantity, payload.quantity);
    } else {
      const { error } = await supabase.from("stock_items").insert(payload);

      if (error) {
        alert(`Produkt konnte nicht hinzugefügt werden: ${error.message}`);
        return;
      }

      await saveHistory(payload.item_name, "0", payload.quantity);
    }

    closeForm();
    await loadItems();
  }

  async function handleDeleteProduct(item: StockItem) {
    const ok = window.confirm(`${item.item_name} wirklich löschen?`);
    if (!ok) return;

    const { error } = await supabase.from("stock_items").delete().eq("id", item.id);

    if (error) {
      alert(`Löschen fehlgeschlagen: ${error.message}`);
      return;
    }

    await saveHistory(item.item_name, item.quantity, "GELÖSCHT");
    await loadItems();
  }

  function getMeterPercent(qty: number) {
    return Math.min((qty / 10) * 100, 100);
  }

  function getMeterColor(qty: number) {
    if (qty <= 2) return "bg-red-500";
    if (qty <= 5) return "bg-amber-500";
    return "bg-[#2f7d46]";
  }

  function getHealthScore() {
    if (items.length === 0) return 0;

    let total = 0;
    for (const item of items) {
      const qty = Number(item.quantity);
      if (Number.isNaN(qty)) total += 0;
      else if (qty <= 2) total += 35;
      else if (qty <= 5) total += 70;
      else total += 100;
    }

    return Math.round(total / items.length);
  }

  function getHealthLabel(score: number) {
    if (score < 45) return "Aufmerksamkeit nötig";
    if (score < 75) return "Mittel";
    return "Gut";
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchText.toLowerCase());
      const matchesFilter = activeFilter === "Alle" || (item.category || "Other") === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [items, searchText, activeFilter]);

  const lowStockCount = items.filter((i) => Number(i.quantity) <= 2).length;
  const healthScore = getHealthScore();

  return (
    <main className="min-h-screen bg-[#f5f1e8] pb-28 text-stone-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2f5d3a]">
                LPG BioMarkt
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Lagerverwaltung</h1>
              <p className="mt-1 text-sm text-stone-500">Täglicher Bestand für die Küche</p>
            </div>

            <div className="rounded-2xl bg-[#f5f1e8] px-3 py-2 text-right">
              <p className="text-[11px] text-stone-500">Heute</p>
              <p className="text-sm font-bold">{todayText}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#1f4d2b] p-4 text-white">
              <p className="text-xs text-white/75">Produkte</p>
              <p className="mt-1 text-3xl font-black">{items.length}</p>
            </div>

            <div className="rounded-2xl bg-[#d6a21e] p-4 text-white">
              <p className="text-xs text-white/80">Niedriger Bestand</p>
              <p className="mt-1 text-3xl font-black">{lowStockCount}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-stone-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Lagerstatus
                </p>
                <p className="mt-1 text-lg font-black">{getHealthLabel(healthScore)}</p>
              </div>
              <p className="text-3xl font-black">{healthScore}%</p>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full rounded-full ${
                  healthScore < 45
                    ? "bg-red-500"
                    : healthScore < 75
                    ? "bg-amber-500"
                    : "bg-[#2f7d46]"
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>

          <input
            value={workerName}
            onChange={(e) => {
              setWorkerName(e.target.value);
              localStorage.setItem("workerName", e.target.value);
            }}
            placeholder="Name eingeben"
            className="mt-4 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-medium outline-none focus:border-[#2f5d3a]"
          />

          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Produkt suchen..."
            className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-medium outline-none focus:border-[#2f5d3a]"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  activeFilter === filter
                    ? "bg-[#1f4d2b] text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            onClick={openAddForm}
            className="mt-4 w-full rounded-2xl bg-[#1f4d2b] px-4 py-3 text-base font-bold text-white shadow-sm active:scale-[0.99]"
          >
            + Produkt hinzufügen
          </button>
        </section>

        {showForm && (
          <section className="mt-5 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">
              {editingItem ? "Produkt bearbeiten" : "Produkt hinzufügen"}
            </h2>

            <div className="mt-4 space-y-3">
              <input value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} placeholder="Produktname" className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
              <input value={formData.product_number} onChange={(e) => setFormData({ ...formData, product_number: e.target.value })} placeholder="Produktnummer" className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />

              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none">
                <option value="Vegetables">Gemüse</option>
                <option value="Dairy">Milchprodukte</option>
                <option value="Other">Sonstiges</option>
              </select>

              <input value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="Menge" type="number" className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
              <input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="Einheit: kg, Packung, Box" className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
              <input value={formData.product_date} onChange={(e) => setFormData({ ...formData, product_date: e.target.value })} type="date" className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
              <input value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} type="date" className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
              <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Notiz" className="min-h-[90px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={closeForm} className="rounded-2xl bg-stone-200 px-4 py-3 font-bold text-stone-700">
                Abbrechen
              </button>
              <button onClick={handleSaveProduct} className="rounded-2xl bg-[#1f4d2b] px-4 py-3 font-bold text-white">
                Speichern
              </button>
            </div>
          </section>
        )}

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">Produkte werden geladen...</div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">Keine Produkte gefunden.</div>
          ) : (
            filteredItems.map((item) => {
              const qty = Number(item.quantity);

              return (
                <article key={item.id} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                  <h2 className="text-2xl font-black">{item.item_name}</h2>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#e8f2eb] px-3 py-1 text-sm font-bold text-[#1f4d2b]">
                      {item.quantity} {item.unit}
                    </span>

                    <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-600">
                      {item.category || "Other"}
                    </span>

                    {qty <= 2 ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-700">
                        Niedrig
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#eef6f0] px-3 py-1 text-sm font-semibold text-[#2f7d46]">
                        Bestand OK
                      </span>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl bg-stone-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Bestandsanzeige</p>
                      <p className="text-sm font-bold">{qty}/10</p>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                      <div className={`h-full rounded-full ${getMeterColor(qty)}`} style={{ width: `${getMeterPercent(qty)}%` }} />
                    </div>
                  </div>

                  {item.note ? (
                    <div className="mt-4 rounded-2xl bg-[#fff8df] px-4 py-3">
                      <p className="text-sm font-medium text-stone-700">{item.note}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-stone-500">Aktualisiert von</p>
                    <p className="mt-1 text-sm font-bold">{item.updated_by || "-"}</p>
                    {item.updated_at ? (
                      <p className="mt-1 text-xs text-stone-500">
                        {new Date(item.updated_at).toLocaleString("de-DE")}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => updateQuantity(item, -1)} className="h-14 rounded-2xl border border-red-200 bg-red-50 text-lg font-bold text-red-700 active:scale-[0.98]">
                      − Minus
                    </button>
                    <button onClick={() => updateQuantity(item, 1)} className="h-14 rounded-2xl bg-[#1f4d2b] text-lg font-bold text-white active:scale-[0.98]">
                      + Plus
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button onClick={() => openEditForm(item)} className="rounded-2xl bg-stone-800 px-4 py-3 font-bold text-white">
                      Bearbeiten
                    </button>
                    <button onClick={() => handleDeleteProduct(item)} className="rounded-2xl border border-red-200 bg-white px-4 py-3 font-bold text-red-700">
                      Löschen
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <BottomNav />
      </div>
    </main>
  );
}