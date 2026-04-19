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
      console.error("product-details loadItems error:", error);
      alert(`product-details error: ${error.message}`);
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

    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getLifeBadge(daysLeft: number | null) {
    if (daysLeft === null) return "bg-slate-100 text-slate-600";
    if (daysLeft < 0) return "bg-red-100 text-red-700";
    if (daysLeft <= 2) return "bg-orange-100 text-orange-700";
    return "bg-emerald-100 text-emerald-700";
  }

  function getLifeText(daysLeft: number | null) {
    if (daysLeft === null) return "No expiry";
    if (daysLeft < 0) return "Expired";
    if (daysLeft === 0) return "Last day";
    if (daysLeft === 1) return "1 day left";
    return `${daysLeft} days left`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefaf2] via-[#f3f8ff] to-[#fff5eb] pb-28 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="rounded-[30px] bg-white/90 p-4 shadow-xl ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
            LPG BioMarkt
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
            Products
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Product number, date, expiry and quantity
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-[28px] bg-white/90 p-6 text-center shadow-lg ring-1 ring-black/5">
              Loading products...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[28px] bg-white/90 p-6 text-center shadow-lg ring-1 ring-black/5">
              No products found.
            </div>
          ) : (
            items.map((item) => {
              const daysLeft = getDaysLeft(item.expiry_date);

              return (
                <div
                  key={item.id}
                  className="rounded-[30px] bg-white/90 p-4 shadow-xl ring-1 ring-black/5"
                >
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    {item.item_name}
                  </h2>

                  <div className="mt-3 space-y-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Product Number
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {item.product_number || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Quantity
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {item.quantity} {item.unit || ""}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Product Date
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {item.product_date
                          ? new Date(item.product_date).toLocaleDateString("en-GB")
                          : "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Expiry Date
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {item.expiry_date
                          ? new Date(item.expiry_date).toLocaleDateString("en-GB")
                          : "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Life of Product
                      </p>
                      <div className="mt-2">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${getLifeBadge(
                            daysLeft
                          )}`}
                        >
                          {getLifeText(daysLeft)}
                        </span>
                      </div>
                    </div>
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