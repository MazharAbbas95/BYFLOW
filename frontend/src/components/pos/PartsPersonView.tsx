import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { InventoryItem, PurchaseOrder } from '../../types';
import {
  Package,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Inbox,
  Truck,
  Check,
} from 'lucide-react';

export const PartsPersonView: React.FC = () => {
  const { currentShop } = useAuth();
  const [subTab, setSubTab] = useState<'AWAITING' | 'INVENTORY' | 'PO'>('AWAITING');
  const [jobsAwaiting, setJobsAwaiting] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New PO modal state
  const [showPoModal, setShowPoModal] = useState(false);
  const [poBookingId, setPoBookingId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState('Atlas Honda Parts Distributor');
  const [poItems, setPoItems] = useState<Array<{ inventoryItemId: string; quantityOrdered: number; unitCost: number }>>([]);

  // Receive PO modal state
  const [selectedPoToReceive, setSelectedPoToReceive] = useState<PurchaseOrder | null>(null);
  const [receiveAmounts, setReceiveAmounts] = useState<Record<string, number>>({});

  // Add inventory item modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [newPart, setNewPart] = useState({
    sku: '',
    name: '',
    quantityOnHand: 10,
    reorderLevel: 5,
    costPrice: 2000,
    sellPrice: 3000,
    category: 'General',
  });

  const loadData = async () => {
    if (!currentShop) return;
    setIsLoading(true);
    try {
      const [jobsRes, invRes, poRes] = await Promise.all([
        api.get(`/inventory/${currentShop.id}/jobs-awaiting-parts`),
        api.get(`/inventory/${currentShop.id}/inventory`),
        api.get(`/inventory/${currentShop.id}/purchase-orders`),
      ]);

      setJobsAwaiting(jobsRes.data.jobs || []);
      setInventory(invRes.data.inventory || []);
      setPurchaseOrders(poRes.data.purchaseOrders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop]);

  const handleOpenPoForJob = (job: any) => {
    setPoBookingId(job.id);
    const neededItems = job.partsBreakdown
      ?.filter((p: any) => p.shortage > 0)
      ?.map((p: any) => ({
        inventoryItemId: p.inventoryItemId || inventory[0]?.id,
        quantityOrdered: p.shortage,
        unitCost: p.unitCost,
      })) || [];

    setPoItems(neededItems.length > 0 ? neededItems : [{ inventoryItemId: inventory[0]?.id || '', quantityOrdered: 1, unitCost: 1000 }]);
    setShowPoModal(true);
  };

  const handleCreatePo = async () => {
    if (!currentShop) return;
    try {
      await api.post(`/inventory/${currentShop.id}/purchase-orders`, {
        supplierName,
        bookingId: poBookingId,
        items: poItems,
      });

      setShowPoModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReceivePo = async () => {
    if (!currentShop || !selectedPoToReceive) return;
    try {
      const receivedItems = Object.entries(receiveAmounts).map(([itemId, qty]) => ({
        itemId,
        quantityReceivedNow: qty,
      }));

      await api.post(`/inventory/${currentShop.id}/purchase-orders/${selectedPoToReceive.id}/receive`, {
        receivedItems,
      });

      setSelectedPoToReceive(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAllocateParts = async (bookingId: string) => {
    try {
      await api.post(`/inventory/bookings/${bookingId}/allocate-parts`);
      alert('Parts allocated and stock deducted. Job sent to Technician for repair!');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateNewPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return;
    try {
      await api.post(`/inventory/${currentShop.id}/inventory`, newPart);
      setShowAddPartModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setSubTab('AWAITING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              subTab === 'AWAITING'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Jobs Awaiting Parts ({jobsAwaiting.length})</span>
          </button>

          <button
            onClick={() => setSubTab('INVENTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              subTab === 'INVENTORY'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventory Catalog ({inventory.length})</span>
          </button>

          <button
            onClick={() => setSubTab('PO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              subTab === 'PO'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Purchase Orders ({purchaseOrders.length})</span>
          </button>
        </div>

        {subTab === 'INVENTORY' && (
          <button
            onClick={() => setShowAddPartModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Part</span>
          </button>
        )}
      </div>

      {/* SUBTAB 1: JOBS AWAITING PARTS */}
      {subTab === 'AWAITING' && (
        <div className="space-y-4 animate-in fade-in">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Loading jobs awaiting parts...
            </div>
          ) : jobsAwaiting.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              No active jobs currently requiring parts.
            </div>
          ) : (
            jobsAwaiting.map((job) => (
              <div
                key={job.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-brand-600">
                      #{job.reference}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono">
                      Plate: {job.vehicle.registrationPlate} • Customer: {job.customer?.name}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      job.allInStock
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {job.allInStock ? 'ALL PARTS IN STOCK' : 'PARTS SHORTAGE DETECTED'}
                  </span>
                </div>

                {/* Stock comparison table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Required Part</th>
                        <th className="py-2.5 px-3 text-center">Qty Needed</th>
                        <th className="py-2.5 px-3 text-center">On-Hand Stock</th>
                        <th className="py-2.5 px-3 text-center">Availability Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {job.partsBreakdown?.map((pb: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{pb.partName}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600">{pb.quantityNeeded}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{pb.quantityOnHand}</td>
                          <td className="py-2.5 px-3 text-center">
                            {pb.shortage > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                Shortage: Need {pb.shortage} more
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Available in stock
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end items-center gap-3 pt-2">
                  {!job.allInStock && (
                    <button
                      onClick={() => handleOpenPoForJob(job)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Order Missing Parts (PO)</span>
                    </button>
                  )}

                  {job.allInStock && (
                    <button
                      onClick={() => handleAllocateParts(job.id)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Allocate Parts & Start Repair (IN_REPAIR)</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB 2: INVENTORY CATALOG */}
      {subTab === 'INVENTORY' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-xs animate-in fade-in">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-left font-bold">SKU</th>
                <th className="py-3 px-4 text-left font-bold">Part Description</th>
                <th className="py-3 px-4 text-left font-bold">Category</th>
                <th className="py-3 px-4 text-center font-bold">Quantity On-Hand</th>
                <th className="py-3 px-4 text-center font-bold">Reorder Level</th>
                <th className="py-3 px-4 text-right font-bold">Cost Price</th>
                <th className="py-3 px-4 text-right font-bold">Sell Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{item.sku}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{item.name}</td>
                  <td className="py-3 px-4 text-slate-500">{item.category || 'General'}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold font-mono ${
                        item.quantityOnHand <= item.reorderLevel
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.quantityOnHand}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500 font-mono">{item.reorderLevel}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    PKR {item.costPrice.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    PKR {item.sellPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUBTAB 3: PURCHASE ORDERS */}
      {subTab === 'PO' && (
        <div className="space-y-4 animate-in fade-in">
          {purchaseOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              No purchase orders created yet.
            </div>
          ) : (
            purchaseOrders.map((po) => (
              <div
                key={po.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                  <div>
                    <span className="font-mono font-bold text-slate-400 text-xs">#{po.poNumber}</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                      Supplier: {po.supplierName}
                    </h4>
                    {po.booking && (
                      <p className="text-xs text-slate-500">
                        Linked Booking: {po.booking.reference} ({po.booking.vehicle?.make} {po.booking.vehicle?.model})
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        po.status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.status === 'PARTIALLY_RECEIVED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {po.status}
                    </span>

                    {po.status !== 'RECEIVED' && (
                      <button
                        onClick={() => {
                          setSelectedPoToReceive(po);
                          const initialAmounts: any = {};
                          po.items.forEach((item) => {
                            initialAmounts[item.id] = Math.max(0, item.quantityOrdered - item.quantityReceived);
                          });
                          setReceiveAmounts(initialAmounts);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
                      >
                        Receive Stock
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  {po.items.map((i) => (
                    <div key={i.id} className="flex justify-between text-slate-700">
                      <span>{i.inventoryItem?.name}</span>
                      <span className="font-mono">
                        Ordered: {i.quantityOrdered} | Received: {i.quantityReceived}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: RECEIVE PO ITEMS */}
      {selectedPoToReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Receive Delivery for {selectedPoToReceive.poNumber}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Receiving parts increases on-hand inventory and automatically checks if booking is ready for repair.
            </p>

            <div className="space-y-3">
              {selectedPoToReceive.items.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{item.inventoryItem?.name}</span>
                    <span className="text-slate-500 text-[11px]">
                      Ordered: {item.quantityOrdered} | Prev Received: {item.quantityReceived}
                    </span>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min={0}
                      max={item.quantityOrdered - item.quantityReceived}
                      value={receiveAmounts[item.id] ?? 0}
                      onChange={(e) =>
                        setReceiveAmounts({
                          ...receiveAmounts,
                          [item.id]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedPoToReceive(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReceivePo}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Confirm Receipt & Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PO */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Purchase Order</h3>
            <p className="text-xs text-slate-500 mb-4">Procure missing parts from external auto distributor:</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Name:</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Parts to Order:</label>
                {poItems.map((pi, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex gap-2 text-xs">
                    <select
                      value={pi.inventoryItemId}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].inventoryItemId = e.target.value;
                        setPoItems(updated);
                      }}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} (SKU: {inv.sku})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={pi.quantityOrdered}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].quantityOrdered = parseInt(e.target.value) || 1;
                        setPoItems(updated);
                      }}
                      className="w-16 p-2 bg-white border border-slate-200 rounded-lg text-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowPoModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePo}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
              >
                Submit Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW PART */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Inventory Item</h3>
            <form onSubmit={handleCreateNewPart} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">SKU</label>
                <input
                  type="text"
                  required
                  value={newPart.sku}
                  onChange={(e) => setNewPart({ ...newPart, sku: e.target.value })}
                  placeholder="e.g. FLT-AIR-02"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Part Name</label>
                <input
                  type="text"
                  required
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  placeholder="e.g. Air Cleaner Filter"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity On Hand</label>
                  <input
                    type="number"
                    value={newPart.quantityOnHand}
                    onChange={(e) => setNewPart({ ...newPart, quantityOnHand: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={newPart.reorderLevel}
                    onChange={(e) => setNewPart({ ...newPart, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Price (PKR)</label>
                  <input
                    type="number"
                    value={newPart.costPrice}
                    onChange={(e) => setNewPart({ ...newPart, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sell Price (PKR)</label>
                  <input
                    type="number"
                    value={newPart.sellPrice}
                    onChange={(e) => setNewPart({ ...newPart, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
