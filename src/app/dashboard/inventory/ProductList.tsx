"use client";

import { formatINR, formatNumber } from "@/lib/format";
import { EditProductModal } from "./EditProductModal";

export function ProductList({ initialList }: { initialList: any[] }) {
  const [filterCategory, setFilterCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(20);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const categories = ["All", ...Array.from(new Set(initialList.map((p) => p.category).filter(Boolean)))];

  const filteredList = useMemo(() => {
    if (filterCategory === "All") return initialList;
    return initialList.filter((p) => p.category === filterCategory);
  }, [initialList, filterCategory]);

  const visibleList = filteredList.slice(0, visibleCount);


  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Failed to delete product");
    }
  };

  return (
    <div>
      {editingProduct && <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} />}
      <div className="flex items-center gap-4 border-b border-slate-100 p-4">
        <div className="text-sm font-semibold text-slate-700">Filter by Category:</div>
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setVisibleCount(20);
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500"
        >
          {categories.map((c: any) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-2.5 text-left">Product</th>
              <th className="px-5 py-2.5 text-left">HSN</th>
              <th className="px-5 py-2.5 text-left">Category</th>
              <th className="px-5 py-2.5 text-right">Purchase</th>
              <th className="px-5 py-2.5 text-right">Selling</th>
              <th className="px-5 py-2.5 text-right">GST</th>
              <th className="px-5 py-2.5 text-right">Stock</th>
              <th className="px-5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleList.map((p) => {
              const low = Number(p.currentStock) <= Number(p.minStockLevel);
              
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-slate-900">{p.name}</div>
                    <div className="flex gap-1.5 text-[10px]">
                      {p.trackExpiry && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700">EXPIRY</span>}
                      {p.isScheduleH && <span className="rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700">SCH-H</span>}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-600">{p.hsnCode}</td>
                  <td className="px-5 py-2.5 text-slate-600">{p.category}</td>
                  <td className="px-5 py-2.5 text-right text-slate-700">{formatINR(p.purchasePrice)}</td>
                  
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-900">
                      {formatINR(p.sellingPrice)}
                  </td>
                  
                  <td className="px-5 py-2.5 text-right text-slate-700">{Number(p.gstRate)}%</td>
                  
                  <td className={`px-5 py-2.5 text-right font-bold ${low ? "text-rose-600" : "text-slate-900"}`}>
                      {`${formatNumber(Number(p.currentStock), 1)} ${p.unit}`}
                  </td>
                  
                  <td className="px-5 py-2.5 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditingProduct(p)} className="text-xs font-bold text-orange-600 hover:text-orange-700">Edit</button>
                        <button onClick={() => deleteProduct(p.id, p.name)} className="text-xs font-bold text-rose-500 hover:text-rose-700">Delete</button>
                      </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {visibleCount < filteredList.length && (
          <div className="p-4 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="rounded-xl border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
