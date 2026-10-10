import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { InventoryItem, PurchaseOrder } from '../../types';
import {
  Package,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  Inbox,
  Truck,
  Check,
  Search,
  RefreshCw,
  Filter,
  DollarSign,
  Layers,
  ChevronRight,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Edit2,
  ShieldCheck,
  Building2,
  Wrench,
} from 'lucide-react';

const SUPPLIER_PRESETS = [
  'Atlas Honda Parts Distributor',
  'Denso Auto Parts PK',
  'Bosch Automotive Supply',
  'Shell Pakistan Lubricants',
  'Toyota Indus Genuine Parts',
  'Guard Filters & Lubricants',
];

const CATEGORY_PRESETS = [
  'All',
  'Filters',
  'Ignition',
  'Brakes',
  'Lubricants',
  'Suspension',
  'Electrical',
  'General',
];

export const PartsPersonView: React.FC = () => {
  const { currentShop, user } = useAuth();
  const [subTab, setSubTab] = useState<'AWAITING' | 'INVENTORY' | 'PO'>('AWAITING');
  const [jobsAwaiting, setJobsAwaiting] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [poStatusFilter, setPoStatusFilter] = useState<'ALL' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED'>('ALL');

  // New PO modal state
  const [showPoModal, setShowPoModal] = useState(false);
  const [poBookingId, setPoBookingId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState(SUPPLIER_PRESETS[0]);
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<
    Array<{ inventoryItemId: string; quantityOrdered: number; unitCost: number }>
  >([]);
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);

  // Receive PO modal state
  const [selectedPoToReceive, setSelectedPoToReceive] = useState<PurchaseOrder | null>(null);
  const [receiveAmounts, setReceiveAmounts] = useState<Record<string, number>>({});
  const [isReceivingPo, setIsReceivingPo] = useState(false);

  // Add / Edit Inventory item modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newPart, setNewPart] = useState({
    sku: '',
    name: '',
    quantityOnHand: 10,
    reorderLevel: 5,
    costPrice: 2000,
    sellPrice: 3000,
    category: 'General',
  });
  const [isSavingPart, setIsSavingPart] = useState(false);

  // Quick Stock Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async (showSpinner = true) => {
    if (!currentShop) return;
    if (showSpinner) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [jobsRes, invRes, poRes] = await Promise.all([
        api.get(`/inventory/${currentShop.id}/jobs-awaiting-parts`),
        api.get(`/inventory/${currentShop.id}/inventory`),
        api.get(`/inventory/${currentShop.id}/purchase-orders`),
      ]);

      setJobsAwaiting(jobsRes.data.jobs || []);
      setInventory(invRes.data.inventory || []);
      setPurchaseOrders(poRes.data.purchaseOrders || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error loading inventory data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop]);

  /* ── KPI & Summary Metrics ── */
  const metrics = useMemo(() => {
    const totalJobsWaiting = jobsAwaiting.length;
    const readyToAllocateJobs = jobsAwaiting.filter((j) => j.allInStock).length;
    const shortageJobs = jobsAwaiting.filter((j) => !j.allInStock).length;

    const totalSkus = inventory.length;
    const totalUnitsOnHand = inventory.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);
    const totalStockValuation = inventory.reduce(
      (sum, item) => sum + (item.quantityOnHand || 0) * (item.costPrice || 0),
      0
    );

    const lowStockItems = inventory.filter((item) => item.quantityOnHand <= item.reorderLevel);
    const lowStockCount = lowStockItems.length;

    const openPurchaseOrders = purchaseOrders.filter(
      (po) => po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED'
    ).length;

    return {
      totalJobsWaiting,
      readyToAllocateJobs,
      shortageJobs,
      totalSkus,
      totalUnitsOnHand,
      totalStockValuation,
      lowStockCount,
      lowStockItems,
      openPurchaseOrders,
    };
  }, [jobsAwaiting, inventory, purchaseOrders]);

  /* ── Open PO for Job Shortages ── */
  const handleOpenPoForJob = (job: any) => {
    setPoBookingId(job.id);
    setPoNotes(`Procuring replacement parts for vehicle ${job.vehicle?.make} ${job.vehicle?.model} (#${job.reference})`);

    const neededItems = job.partsBreakdown
      ?.filter((p: any) => p.shortage > 0)
      ?.map((p: any) => ({
        inventoryItemId: p.inventoryItemId || (inventory[0]?.id ?? ''),
        quantityOrdered: p.shortage,
        unitCost: p.unitCost,
      })) || [];

    setPoItems(
      neededItems.length > 0
        ? neededItems
        : [{ inventoryItemId: inventory[0]?.id || '', quantityOrdered: 1, unitCost: 1000 }]
    );
    setShowPoModal(true);
  };

  /* ── Open General PO modal ── */
  const handleOpenGeneralPo = () => {
    setPoBookingId(null);
    setPoNotes('Regular workshop stock replenishment');
    // Pre-select first low stock item if available
    const firstLow = metrics.lowStockItems[0];
    setPoItems([
      {
        inventoryItemId: firstLow?.id || inventory[0]?.id || '',
        quantityOrdered: firstLow ? Math.max(5, firstLow.reorderLevel * 2) : 5,
        unitCost: firstLow ? firstLow.costPrice : 1500,
      },
    ]);
    setShowPoModal(true);
  };

  /* ── Create Purchase Order ── */
  const handleCreatePo = async () => {
    if (!currentShop) return;
    if (poItems.length === 0) {
      showToast('Please add at least one line item to the PO', 'error');
      return;
    }

    setIsSubmittingPo(true);
    try {
      const res = await api.post(`/inventory/${currentShop.id}/purchase-orders`, {
        supplierName,
        bookingId: poBookingId,
        notes: poNotes,
        items: poItems,
      });

      showToast(`Purchase Order #${res.data.purchaseOrder?.poNumber || ''} created successfully!`, 'success');
      setShowPoModal(false);
      loadData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to create PO', 'error');
    } finally {
      setIsSubmittingPo(false);
    }
  };

  /* ── Receive PO Items ── */
  const handleReceivePo = async () => {
    if (!currentShop || !selectedPoToReceive) return;

    const hasAnyQty = Object.values(receiveAmounts).some((q) => q > 0);
    if (!hasAnyQty) {
      showToast('Please enter at least one quantity to receive', 'error');
      return;
    }

    setIsReceivingPo(true);
    try {
      const receivedItems = Object.entries(receiveAmounts).map(([itemId, qty]) => ({
        itemId,
        quantityReceivedNow: qty,
      }));

      const res = await api.post(
        `/inventory/${currentShop.id}/purchase-orders/${selectedPoToReceive.id}/receive`,
        { receivedItems }
      );

      const resolvedCount = res.data.resolvedJobsCount || 0;
      if (resolvedCount > 0) {
        showToast(
          `✓ Received delivery for ${selectedPoToReceive.poNumber}! ${resolvedCount} work order(s) awaiting parts are now resolved and ready for repair!`,
          'success'
        );
      } else {
        showToast(
          `Received delivery for ${selectedPoToReceive.poNumber}. Stock updated (${res.data.status})!`,
          'success'
        );
      }
      setSelectedPoToReceive(null);
      loadData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to receive PO items', 'error');
    } finally {
      setIsReceivingPo(false);
    }
  };

  /* ── Allocate Parts & Send to Workshop Floor ── */
  const handleAllocateParts = async (bookingId: string, reference: string) => {
    try {
      await api.post(`/inventory/bookings/${bookingId}/allocate-parts`);
      showToast(`✓ Parts allocated for #${reference}! Job is now IN_REPAIR.`, 'success');
      loadData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to allocate parts', 'error');
    }
  };

  /* ── Create or Edit Inventory Item ── */
  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return;

    setIsSavingPart(true);
    try {
      if (editingItem) {
        await api.put(`/inventory/${currentShop.id}/inventory/${editingItem.id}`, newPart);
        showToast(`SKU ${newPart.sku} updated successfully!`, 'success');
      } else {
        await api.post(`/inventory/${currentShop.id}/inventory`, newPart);
        showToast(`New part ${newPart.name} added to catalog!`, 'success');
      }
      setShowAddPartModal(false);
      setEditingItem(null);
      loadData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save part', 'error');
    } finally {
      setIsSavingPart(false);
    }
  };

  const handleOpenEditPart = (item: InventoryItem) => {
    setEditingItem(item);
    setNewPart({
      sku: item.sku,
      name: item.name,
      quantityOnHand: item.quantityOnHand,
      reorderLevel: item.reorderLevel,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      category: item.category || 'General',
    });
    setShowAddPartModal(true);
  };

  const handleOpenNewPart = () => {
    setEditingItem(null);
    setNewPart({
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      quantityOnHand: 10,
      reorderLevel: 5,
      costPrice: 2000,
      sellPrice: 3200,
      category: 'General',
    });
    setShowAddPartModal(true);
  };

  /* ── Quick Stock Adjustment ── */
  const handleSaveQuickAdjustment = async () => {
    if (!currentShop || !adjustingItem) return;
    try {
      await api.put(`/inventory/${currentShop.id}/inventory/${adjustingItem.id}`, {
        quantityOnHand: adjustmentQty,
      });
      showToast(`Stock updated for ${adjustingItem.name} to ${adjustmentQty} units`, 'success');
      setAdjustingItem(null);
      loadData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    }
  };

  /* ── Filtered Inventory List ── */
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }
      // Low stock filter
      if (lowStockOnly && item.quantityOnHand > item.reorderLevel) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inventory, categoryFilter, lowStockOnly, searchQuery]);

  /* ── Filtered Purchase Orders ── */
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (poStatusFilter !== 'ALL' && po.status !== poStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          po.poNumber.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.booking?.reference.toLowerCase().includes(q) ||
          po.booking?.vehicle?.registrationPlate.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [purchaseOrders, poStatusFilter, searchQuery]);

  /* ── Filtered Jobs Awaiting ── */
  const filteredJobsAwaiting = useMemo(() => {
    if (!searchQuery.trim()) return jobsAwaiting;
    const q = searchQuery.toLowerCase();
    return jobsAwaiting.filter(
      (j) =>
        j.reference.toLowerCase().includes(q) ||
        j.vehicle?.registrationPlate.toLowerCase().includes(q) ||
        j.vehicle?.make.toLowerCase().includes(q) ||
        j.vehicle?.model.toLowerCase().includes(q) ||
        j.customer?.name?.toLowerCase().includes(q)
    );
  }, [jobsAwaiting, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center space-x-2 transition-all transform animate-in slide-in-from-top-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700/60'
              : toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-700/60'
              : 'bg-slate-900 text-sky-200 border-sky-700/60'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <AlertCircle className="w-4 h-4 text-sky-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Parts & Inventory Counter</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-black uppercase tracking-wider">
                  ERP Stock Control
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time stock allocation, procurement purchase orders, and supplier receipts for {currentShop?.name || 'Workshop'}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleOpenGeneralPo}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-sm transition-all flex items-center space-x-1.5 text-xs font-bold"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-brand-600" />
            <span>Create PO</span>
          </button>

          <button
            onClick={handleOpenNewPart}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/15 transition-all flex items-center space-x-1.5 text-xs font-bold hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Part</span>
          </button>

          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
            title="Refresh stock data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Awaiting Parts</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{metrics.totalJobsWaiting}</div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1 mt-0.5">
              <Check className="w-3 h-3 inline mr-0.5" /> {metrics.readyToAllocateJobs} Ready to allocate
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Catalog SKUs</span>
            <div className="text-2xl font-black text-brand-700 mt-1">{metrics.totalSkus}</div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5">
              {metrics.totalUnitsOnHand.toLocaleString()} total units on shelf
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Stock Valuation</span>
            <div className="text-xl font-black text-slate-900 font-mono mt-1">
              PKR {(metrics.totalStockValuation / 1000).toFixed(0)}k
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5">
              Wholesale asset value
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => {
            setSubTab('INVENTORY');
            setLowStockOnly(true);
          }}
          className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            metrics.lowStockCount > 0
              ? 'bg-rose-50/40 border-rose-200 ring-2 ring-rose-100'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Low Stock Alert</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{metrics.lowStockCount}</div>
            <span className="text-[11px] text-rose-600 font-medium mt-0.5">
              Items at/below reorder point
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Low Stock Quick Banner */}
      {metrics.lowStockCount > 0 && subTab === 'INVENTORY' && !lowStockOnly && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center space-x-2 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>
              <strong>{metrics.lowStockCount} items</strong> have reached minimum threshold levels. Order replenishments to prevent workshop repair delays.
            </span>
          </div>
          <button
            onClick={() => setLowStockOnly(true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs self-start sm:self-auto flex items-center space-x-1"
          >
            <span>Filter Low Stock</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSubTab('AWAITING');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
              subTab === 'AWAITING'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Inbox className="w-4 h-4 text-amber-400" />
            <span>Work Orders Awaiting Parts</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              subTab === 'AWAITING' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-700'
            }`}>
              {jobsAwaiting.length}
            </span>
          </button>

          <button
            onClick={() => {
              setSubTab('INVENTORY');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
              subTab === 'INVENTORY'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Package className="w-4 h-4 text-brand-400" />
            <span>Inventory Master Catalog</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              subTab === 'INVENTORY' ? 'bg-slate-800 text-brand-300' : 'bg-slate-100 text-slate-700'
            }`}>
              {inventory.length}
            </span>
          </button>

          <button
            onClick={() => {
              setSubTab('PO');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
              subTab === 'PO'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>Purchase Orders</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              subTab === 'PO' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-700'
            }`}>
              {purchaseOrders.length}
            </span>
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              subTab === 'AWAITING'
                ? 'Search vehicle plate, ref, customer...'
                : subTab === 'INVENTORY'
                ? 'Search SKU, part name, category...'
                : 'Search PO#, supplier, booking...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBTAB 1: WORK ORDERS AWAITING PARTS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {subTab === 'AWAITING' && (
        <div className="space-y-4 animate-in fade-in">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600" />
              <p className="font-semibold text-slate-600">Checking pending work orders and stock availability...</p>
            </div>
          ) : filteredJobsAwaiting.length === 0 ? (
            <div className="p-14 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">No Jobs Awaiting Parts!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All approved customer estimates have had their materials allocated and released to mechanics.
              </p>
            </div>
          ) : (
            filteredJobsAwaiting.map((job) => {
              const shortageCount = job.partsBreakdown?.filter((p: any) => p.shortage > 0).length || 0;

              return (
                <div
                  key={job.id}
                  className={`p-6 rounded-3xl bg-white border transition-all duration-200 shadow-sm space-y-4 ${
                    job.allInStock
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : 'border-amber-200 hover:border-amber-300'
                  }`}
                >
                  {/* Job Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                          #{job.reference}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          Slot: <strong>{job.bookingDate} {job.bookingTime}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          Status: <strong className="uppercase font-mono text-slate-700">{job.status}</strong>
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 pt-0.5">
                        <h3 className="text-lg font-black text-slate-900">
                          {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-black tracking-wider">
                          {job.vehicle.registrationPlate}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Customer: <strong className="text-slate-800">{job.customer?.name}</strong></span>
                        <span>•</span>
                        <span>Reported Problem: <em className="text-slate-700">"{job.reportedProblem}"</em></span>
                      </div>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                          job.allInStock
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            job.allInStock ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        <span>{job.allInStock ? '100% In Stock – Ready to Allocate' : `${shortageCount} Item Shortage`}</span>
                      </span>
                    </div>
                  </div>

                  {/* Stock Comparison Breakdown Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Estimated Part</th>
                          <th className="py-2.5 px-3 text-center">Required Qty</th>
                          <th className="py-2.5 px-3 text-center">Shelf Stock</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-center">Procurement Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {job.partsBreakdown?.map((pb: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center space-x-2">
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                              <span>{pb.partName}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-700 font-bold">{pb.quantityNeeded}</td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold ${
                                  pb.quantityOnHand >= pb.quantityNeeded
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {pb.quantityOnHand} on hand
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              PKR {pb.unitCost.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {pb.shortage > 0 ? (
                                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] inline-flex items-center space-x-1">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Shortage: Need {pb.shortage} more</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center space-x-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Available on Shelf</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500">
                      {job.allInStock ? (
                        <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                          Ready for technician handover. Deducting stock will immediately update job to <strong>IN_REPAIR</strong>.
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline mr-1" />
                          Cannot start repairs until missing parts are ordered from supplier or received.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {!job.allInStock && (
                        <button
                          onClick={() => handleOpenPoForJob(job)}
                          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/10 transition-all flex items-center space-x-2 hover:scale-[1.02]"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                          <span>Generate PO for Shortages</span>
                        </button>
                      )}

                      {job.allInStock && (
                        <button
                          onClick={() => handleAllocateParts(job.id, job.reference)}
                          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/25 transition-all flex items-center space-x-2 hover:scale-[1.02]"
                        >
                          <Check className="w-4 h-4" />
                          <span>Allocate Parts & Send to Repair</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBTAB 2: INVENTORY MASTER CATALOG */}
      {/* ───────────────────────────────────────────────────────────── */}
      {subTab === 'INVENTORY' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Category Filter Pills & Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Categories:</span>
              {CATEGORY_PRESETS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    categoryFilter === cat
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className={lowStockOnly ? 'text-rose-600' : ''}>Show Low Stock Only ({metrics.lowStockCount})</span>
            </label>
          </div>

          {/* Catalog — Cards on mobile, table on lg+ */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            {filteredInventory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Package className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">No inventory parts match your filter.</p>
                <button
                  onClick={() => {
                    setCategoryFilter('All');
                    setLowStockOnly(false);
                    setSearchQuery('');
                  }}
                  className="text-xs text-brand-600 hover:underline font-bold"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <>
                {/* ── MOBILE / TABLET: Card grid ── */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {filteredInventory.map((item) => {
                    const isLow = item.quantityOnHand <= item.reorderLevel;
                    const margin =
                      item.sellPrice > 0
                        ? Math.round(((item.sellPrice - item.costPrice) / item.sellPrice) * 100)
                        : 0;
                    return (
                      <div key={item.id} className="p-4 space-y-3">
                        {/* Row 1: SKU + Name + Edit button */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold text-[11px] text-slate-700 mb-1">
                              {item.sku}
                            </span>
                            <div className="font-bold text-slate-900 text-sm leading-tight">{item.name}</div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {item.category || 'General'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenEditPart(item)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-xs"
                          >
                            Edit
                          </button>
                        </div>

                        {/* Row 2: Stock + Prices + Margin */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 rounded-xl p-2.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">On-Hand Stock</div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold font-mono text-xs ${
                                  isLow
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {item.quantityOnHand} units
                              </span>
                              <button
                                onClick={() => {
                                  setAdjustingItem(item);
                                  setAdjustmentQty(item.quantityOnHand);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
                                title="Quick Adjust Stock"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Min reorder: <span className="font-mono font-semibold text-slate-600">{item.reorderLevel}</span></div>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-2.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pricing</div>
                            <div className="space-y-0.5">
                              <div className="text-[11px] text-slate-500">Cost: <span className="font-mono font-semibold text-slate-700">PKR {item.costPrice.toLocaleString()}</span></div>
                              <div className="text-[11px] text-slate-500">Sell: <span className="font-mono font-bold text-slate-900">PKR {item.sellPrice.toLocaleString()}</span></div>
                            </div>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                margin >= 30
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : margin > 10
                                  ? 'bg-sky-50 text-sky-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              +{margin}% margin
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── DESKTOP: Original table ── */}
                <table className="hidden lg:table w-full">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold">SKU</th>
                      <th className="py-3 px-4 text-left font-bold">Part Name</th>
                      <th className="py-3 px-4 text-left font-bold">Category</th>
                      <th className="py-3 px-4 text-center font-bold">On-Hand Stock</th>
                      <th className="py-3 px-4 text-center font-bold">Min Reorder</th>
                      <th className="py-3 px-4 text-right font-bold">Wholesale Cost</th>
                      <th className="py-3 px-4 text-right font-bold">Retail Sell</th>
                      <th className="py-3 px-4 text-center font-bold">Gross Margin</th>
                      <th className="py-3 px-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map((item) => {
                      const isLow = item.quantityOnHand <= item.reorderLevel;
                      const margin =
                        item.sellPrice > 0
                          ? Math.round(((item.sellPrice - item.costPrice) / item.sellPrice) * 100)
                          : 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {item.sku}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center space-x-1.5">
                              <span
                                className={`px-3 py-1 rounded-full font-bold font-mono text-xs ${
                                  isLow
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {item.quantityOnHand} units
                              </span>
                              <button
                                onClick={() => {
                                  setAdjustingItem(item);
                                  setAdjustmentQty(item.quantityOnHand);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
                                title="Quick Adjust Stock"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 font-mono">
                            {item.reorderLevel}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            PKR {item.costPrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            PKR {item.sellPrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                margin >= 30
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : margin > 10
                                  ? 'bg-sky-50 text-sky-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              +{margin}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenEditPart(item)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBTAB 3: PURCHASE ORDERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {subTab === 'PO' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Status Filter Bar */}
          <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-slate-200 text-xs self-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">Status:</span>
            {(['ALL', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setPoStatusFilter(st)}
                className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                  poStatusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {filteredPurchaseOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Truck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">No Purchase Orders Found.</p>
              <button
                onClick={handleOpenGeneralPo}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md mt-2"
              >
                Create New Purchase Order
              </button>
            </div>
          ) : (
            filteredPurchaseOrders.map((po) => {
              const totalItemsOrdered = po.items.reduce((s, i) => s + i.quantityOrdered, 0);
              const totalItemsReceived = po.items.reduce((s, i) => s + i.quantityReceived, 0);
              const totalPoValue = po.items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);

              return (
                <div
                  key={po.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-3 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 text-xs">
                          #{po.poNumber}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          Issued: {new Date(po.createdAt).toLocaleDateString()}
                        </span>
                        {po.booking && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 text-[10px] font-bold">
                              Linked Work Order: #{po.booking.reference} ({po.booking.vehicle?.registrationPlate})
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="font-black text-slate-900 text-base mt-1 flex items-center space-x-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>{po.supplierName}</span>
                      </h4>

                      {po.notes && (
                        <p className="text-xs text-slate-500 italic mt-0.5">"{po.notes}"</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                          po.status === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : po.status === 'PARTIALLY_RECEIVED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {po.status.replace(/_/g, ' ')}
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
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 hover:scale-[1.02]"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Receive Inbound Stock</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {po.items.map((i) => (
                      <div
                        key={i.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">
                            {i.inventoryItem?.name || 'Inventory Item'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Unit Cost: PKR {i.unitCost.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-mono font-bold block ${
                              i.quantityReceived >= i.quantityOrdered ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {i.quantityReceived} / {i.quantityOrdered} Recv
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {i.quantityReceived >= i.quantityOrdered ? 'Fulfilled ✓' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PO Footer Summary */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Total Units: <strong>{totalItemsReceived} of {totalItemsOrdered} received</strong>
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      Order Value: PKR {totalPoValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: RECEIVE INBOUND PO ITEMS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedPoToReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-5 animate-in zoom-in-95">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                  #{selectedPoToReceive.poNumber}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-700">{selectedPoToReceive.supplierName}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">Receive Inbound Delivery</h3>
              <p className="text-xs text-slate-500">
                Inspect physical parts received and log quantity to immediately increment stock.
              </p>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {selectedPoToReceive.items.map((item) => {
                const maxRemaining = item.quantityOrdered - item.quantityReceived;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 block">{item.inventoryItem?.name}</span>
                      <span className="text-slate-500 text-[11px]">
                        Ordered: <strong>{item.quantityOrdered}</strong> • Previously Received: <strong>{item.quantityReceived}</strong>
                      </span>
                    </div>

                    <div className="w-24 text-right">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Recv Now:</label>
                      <input
                        type="number"
                        min={0}
                        max={maxRemaining}
                        value={receiveAmounts[item.id] ?? 0}
                        onChange={(e) =>
                          setReceiveAmounts({
                            ...receiveAmounts,
                            [item.id]: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-center font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPoToReceive(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isReceivingPo}
                onClick={handleReceivePo}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/25 transition-all flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isReceivingPo ? 'Updating...' : 'Confirm Delivery & Update Shelf Stock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE PURCHASE ORDER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-5 animate-in zoom-in-95">
            <div>
              <h3 className="text-lg font-black text-slate-900">Issue Purchase Order (PO)</h3>
              <p className="text-xs text-slate-500">
                Procure materials from external parts vendors & distributors.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Supplier:</label>
                <div className="flex gap-2">
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {SUPPLIER_PRESETS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order Notes / Work Order:</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Rush delivery for customer booking #LF-102"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Line items list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Parts to Procure ({poItems.length}):
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPoItems([
                        ...poItems,
                        {
                          inventoryItemId: inventory[0]?.id || '',
                          quantityOrdered: 2,
                          unitCost: 1500,
                        },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {poItems.map((pi, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap sm:flex-nowrap gap-2 items-center text-xs"
                    >
                      <select
                        value={pi.inventoryItemId}
                        onChange={(e) => {
                          const updated = [...poItems];
                          const selectedInv = inventory.find((i) => i.id === e.target.value);
                          updated[idx].inventoryItemId = e.target.value;
                          if (selectedInv) updated[idx].unitCost = selectedInv.costPrice;
                          setPoItems(updated);
                        }}
                        className="flex-1 min-w-[180px] p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                      >
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.sku})
                          </option>
                        ))}
                      </select>

                      <div className="w-20">
                        <input
                          type="number"
                          min={1}
                          title="Quantity"
                          value={pi.quantityOrdered}
                          onChange={(e) => {
                            const updated = [...poItems];
                            updated[idx].quantityOrdered = parseInt(e.target.value) || 1;
                            setPoItems(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-center font-bold font-mono text-xs"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          title="Unit Cost"
                          value={pi.unitCost}
                          onChange={(e) => {
                            const updated = [...poItems];
                            updated[idx].unitCost = parseFloat(e.target.value) || 0;
                            setPoItems(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-right font-mono text-xs"
                        />
                      </div>

                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPoModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingPo}
                onClick={handleCreatePo}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-black shadow-md shadow-brand-600/30 flex items-center space-x-1.5"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{isSubmittingPo ? 'Generating...' : 'Transmit Purchase Order'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT INVENTORY ITEM */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-4 animate-in zoom-in-95">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {editingItem ? 'Edit Inventory SKU' : 'Add New Inventory Item'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure part details, minimum reorder thresholds, and retail margins.
              </p>
            </div>

            <form onSubmit={handleSavePart} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">SKU Code</label>
                <input
                  type="text"
                  required
                  value={newPart.sku}
                  onChange={(e) => setNewPart({ ...newPart, sku: e.target.value.toUpperCase() })}
                  placeholder="e.g. FLT-AIR-02"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Part Description</label>
                <input
                  type="text"
                  required
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  placeholder="e.g. Engine Air Filter OEM"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={newPart.category}
                  onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {CATEGORY_PRESETS.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">On-Hand Stock</label>
                  <input
                    type="number"
                    value={newPart.quantityOnHand}
                    onChange={(e) => setNewPart({ ...newPart, quantityOnHand: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Reorder Level</label>
                  <input
                    type="number"
                    value={newPart.reorderLevel}
                    onChange={(e) => setNewPart({ ...newPart, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Price (PKR)</label>
                  <input
                    type="number"
                    value={newPart.costPrice}
                    onChange={(e) => setNewPart({ ...newPart, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sell Price (PKR)</label>
                  <input
                    type="number"
                    value={newPart.sellPrice}
                    onChange={(e) => setNewPart({ ...newPart, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-right text-brand-700"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPart}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black shadow-md shadow-brand-600/25"
                >
                  {isSavingPart ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Inventory Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: QUICK STOCK ADJUSTMENT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h4 className="font-black text-slate-900 text-base">Quick Stock Adjustment</h4>
            <p className="text-xs text-slate-500">
              Update shelf count for <strong className="text-slate-800">{adjustingItem.name}</strong> ({adjustingItem.sku}):
            </p>

            <div className="flex items-center justify-center space-x-3 py-2">
              <button
                type="button"
                onClick={() => setAdjustmentQty(Math.max(0, adjustmentQty - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-lg"
              >
                -
              </button>
              <input
                type="number"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                className="w-24 p-2.5 text-center font-mono font-black text-lg bg-slate-50 border border-slate-300 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setAdjustmentQty(adjustmentQty + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-lg"
              >
                +
              </button>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickAdjustment}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md"
              >
                Save Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
