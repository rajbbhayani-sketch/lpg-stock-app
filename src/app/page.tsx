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

const FILTERS = ["All", "Vegetables", "Dairy", "Other"];

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
  const [activeFilter, setActiveFilter] = useState("All");
  const [todayText, setTodayText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedName = localStorage.getItem("workerName");
    if (savedName) setWorkerName(savedName);

    setTodayText(
      new Date().toLocaleDateString("en-GB", {
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
      console.error("loadItems error:", error);
      alert(`loadItems error: ${error.message}`);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(data || []);
    setLoading(false);
  }

  async function saveHistory(
    itemName: string,
    oldQuantity: string,
    newQuantity: string
  ) {
    if (!workerName.trim()) return;

    const { error } = await supabase.from("stock_history").insert({
      item_name: itemName,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      changed_by: workerName.trim(),
      changed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("saveHistory error:", error);
    }
  }

  async function updateQuantity(item: StockItem, change: number) {
    if (!workerName.trim()) {
      alert("Please enter your name first.");
      return;
    }

    const currentQty = Number(item.quantity);
    if (Number.isNaN(currentQty)) {
      alert("Quantity is not a number.");
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
      console.error("updateQuantity error:", error);
      alert(`updateQuantity error: ${error.message}`);
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
      alert("Please enter your name first.");
      return;
    }

    if (!formData.item_name.trim()) {
      alert("Product name is required.");
      return;
    }

    if (Number.isNaN(Number(formData.quantity))) {
      alert("Quantity must be a number.");
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
      const { error } = await supabase
        .from("stock_items")
        .update(payload)
        .eq("id", editingItem.id);

      if (error) {
        console.error("handleSaveProduct update error:", error);
        alert(`Save error: ${error.message}`);
        return;
      }

      await saveHistory(editingItem.item_name, editingItem.quantity, payload.quantity);
    } else {
      const { error } = await supabase.from("stock_items").insert(payload);

      if (error) {
        console.error("handleSaveProduct insert error:", error);
        alert(`Add product error: ${error.message}`);
        return;
      }

      await saveHistory(payload.item_name, "0", payload.quantity);
    }

    closeForm();
    await loadItems();
  }

  async function handleDeleteProduct(item: StockItem) {
    const confirmDelete = window.confirm(`Delete ${item.item_name}?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("stock_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error("handleDeleteProduct error:", error);
      alert(`Delete error: ${error.message}`);
      return;
    }

    await saveHistory(item.item_name, item.quantity, "DELETED");
    await loadItems();
  }

  function getMeterPercent(qty: number) {
    return Math.min((qty / 10) * 100, 100);
  }

  function getMeterStyle(qty: number) {
    if (qty <= 2) return "bg-gradient-to-r from-red-500 to-orange-400";
    if (qty <= 5) return "bg-gradient-to-r from-yellow-400 to-orange-400";
    return "bg-gradient-to-r from-emerald-400 to-green-500";
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
    if (score < 45) return "Needs attention";
    if (score < 75) return "Medium";
    return "Good";
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.item_name
        .toLowerCase()
        .includes(searchText.toLowerCase());

      const matchesFilter =
        activeFilter === "All" || (item.category || "Other") === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [items, searchText, activeFilter]);

  const lowStockCount = items.filter((i) => Number(i.quantity) <= 2).length;
  const healthScore = getHealthScore();

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefaf2] via-[#f3f8ff] to-[#fff5eb] pb-28 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="rounded-[30px] bg-white/90 p-4 shadow-xl ring-1 ring-black/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
                LPG BioMarkt
              </p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                Storage
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Live smart stock update
              </p>
            </div>

            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
              <p className="text-[11px] text-slate-500">Today</p>
              <p className="text-sm font-bold text-slate-800">{todayText}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 p-4 text-white shadow">
              <p className="text-xs text-white/80">Products</p>
              <p className="mt-1 text-3xl font-extrabold">{items.length}</p>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-orange-400 to-amber-400 p-4 text-white shadow">
              <p className="text-xs text-white/80">Low stock</p>
              <p className="mt-1 text-3xl font-extrabold">{lowStockCount}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Live Storage Health
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {getHealthLabel(healthScore)}
                </p>
              </div>

              <p className="text-3xl font-black text-slate-900">{healthScore}%</p>
            </div>

            <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  healthScore < 45
                    ? "bg-gradient-to-r from-red-500 to-orange-400"
                    : healthScore < 75
                    ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                    : "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500"
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
            placeholder="Your name"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium outline-none"
          />

          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search tomato, salad..."
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium outline-none"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  activeFilter === filter
                    ? "bg-slate-900 text-white shadow"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            onClick={openAddForm}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-base font-bold text-white shadow-lg"
          >
            + Add Product
          </button>
        </div>

        {showForm && (
          <div className="mt-5 rounded-[30px] bg-white/95 p-4 shadow-xl ring-1 ring-black/5">
            <h2 className="text-2xl font-black text-slate-900">
              {editingItem ? "Edit Product" : "Add Product"}
            </h2>

            <div className="mt-4 space-y-3">
              <input
                value={formData.item_name}
                onChange={(e) =>
                  setFormData({ ...formData, item_name: e.target.value })
                }
                placeholder="Product name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />

              <input
                value={formData.product_number}
                onChange={(e) =>
                  setFormData({ ...formData, product_number: e.target.value })
                }
                placeholder="Product number"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />

              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Dairy">Dairy</option>
                <option value="Other">Other</option>
              </select>

              <input
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="Quantity"
                type="number"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />

              <input
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="Unit (kg, pack, box)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />

              <input
                value={formData.product_date}
                onChange={(e) =>
                  setFormData({ ...formData, product_date: e.target.value })
                }
                type="date"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />

              <input
                value={formData.expiry_date}
                onChange={(e) =>
                  setFormData({ ...formData, expiry_date: e.target.value })
                }
                type="date"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />

              <textarea
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                placeholder="Note"
                className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={closeForm}
                className="rounded-2xl bg-slate-200 px-4 py-3 font-bold text-slate-700"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveProduct}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 font-bold text-white"
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-[28px] bg-white/90 p-6 text-center shadow-xl ring-1 ring-black/5">
              Loading products...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[28px] bg-white/90 p-6 text-center shadow-xl ring-1 ring-black/5">
              No products found.
            </div>
          ) : (
            filteredItems.map((item) => {
              const qty = Number(item.quantity);

              return (
                <div
                  key={item.id}
                  className="rounded-[30px] bg-white/90 p-4 shadow-xl ring-1 ring-black/5"
                >
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    {item.item_name}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                      {item.quantity} {item.unit}
                    </span>

                    <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700 ring-1 ring-violet-100">
                      {item.category || "Other"}
                    </span>

                    {qty <= 2 ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600 ring-1 ring-red-100">
                        Low stock
                      </span>
                    ) : (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700 ring-1 ring-sky-100">
                        Good level
                      </span>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Product meter
                      </p>
                      <p className="text-sm font-bold text-slate-700">{qty}/10</p>
                    </div>

                    <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${getMeterStyle(qty)}`}
                        style={{ width: `${getMeterPercent(qty)}%` }}
                      />
                    </div>
                  </div>

                  {item.note ? (
                    <div className="mt-4 rounded-2xl bg-gradient-to-r from-fuchsia-50 to-violet-50 px-4 py-3 ring-1 ring-violet-100">
                      <p className="text-sm font-medium text-violet-700">{item.note}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 ring-1 ring-slate-200">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Last updated by
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {item.updated_by || "-"}
                    </p>
                    {item.updated_at ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.updated_at).toLocaleString("en-GB")}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateQuantity(item, -1)}
                      className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 text-lg font-bold text-white shadow-lg transition hover:scale-[1.02] active:scale-95"
                    >
                      <span className="text-2xl leading-none">−</span>
                      <span>Minus</span>
                    </button>

                    <button
                      onClick={() => updateQuantity(item, 1)}
                      className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-lg font-bold text-white shadow-lg transition hover:scale-[1.02] active:scale-95"
                    >
                      <span className="text-2xl leading-none">+</span>
                      <span>Plus</span>
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openEditForm(item)}
                      className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 font-bold text-white"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(item)}
                      className="rounded-2xl bg-gradient-to-r from-slate-700 to-slate-900 px-4 py-3 font-bold text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <BottomNav />
      </div>
    </main>
  );
}