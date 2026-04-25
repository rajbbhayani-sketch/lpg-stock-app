"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import BottomNav from "../../components/BottomNav";

type ProductItem = {
  id: string;
  item_name: string;
  product_number: string | null;
  quantity: string;
  unit: string | null;
  product_date: string | null;
  expiry_date: string | null;
};

export default function ProductDetailsPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);

    const { data, error } = await supabase
      .from("stock_items")
      .select("id, item_name, product_number, quantity, unit, product_date, expiry_date")
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

  function getDaysLeft(expiryDate: string | null) {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getLifeBadge(daysLeft: number | null) {
    if (daysLeft === null) return "bg-stone-100 text-stone-600";
    if (daysLeft < 0) return "bg-red-100 text-red-700";
    if (daysLeft <= 2) return "bg-amber-100 text-amber-700";
    return "bg-[#e8f2eb] text-[#1f4d2b]";
  }

  function getLifeText(daysLeft: number | null) {
    if (daysLeft === null) return "Kein Datum";
    if (daysLeft < 0) return "Abgelaufen";
    if (daysLeft === 0) return "Letzter Tag";
    if (daysLeft === 1) return "1 Tag übrig";
    return `${daysLeft} Tage übrig`;
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] pb-28 text-stone-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2f5d3a]">
            LPG BioMarkt
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Produkte</h1>
          <p className="mt-1 text-sm text-stone-500">Produktnummer, Datum und Haltbarkeit</p>
        </section>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">Produkte werden geladen...</div>
          ) : items.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">Keine Produkte gefunden.</div>
          ) : (
            items.map((item) => {
              const daysLeft = getDaysLeft(item.expiry_date);

              return (
                <article key={item.id} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                  <h2 className="text-2xl font-black">{item.item_name}</h2>

                  <div className="mt-4 space-y-3">
                    {[
                      ["Produktnummer", item.product_number || "-"],
                      ["Menge", `${item.quantity} ${item.unit || ""}`],
                      ["Produktdatum", item.product_date ? new Date(item.product_date).toLocaleDateString("de-DE") : "-"],
                      ["Ablaufdatum", item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("de-DE") : "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
                        <p className="mt-1 text-sm font-bold">{value}</p>
                      </div>
                    ))}

                    <div className="rounded-2xl bg-stone-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-stone-500">Haltbarkeit</p>
                      <div className="mt-2">
                        <span className={`rounded-full px-3 py-1 text-sm font-bold ${getLifeBadge(daysLeft)}`}>
                          {getLifeText(daysLeft)}
                        </span>
                      </div>
                    </div>
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