import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Booking } from '../../types';
import {
  Wrench,
  CheckCircle,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  FileText,
  Clock,
  ChevronRight,
  Search,
  Zap,
  ShieldAlert,
  Check,
  X,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

/* ─── Status config ─── */
const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  ASSIGNED:          { label: 'Assigned',         color: 'bg-sky-100 text-sky-800 border-sky-200',         dot: 'bg-sky-500' },
  INSPECTING:        { label: 'Inspecting',        color: 'bg-amber-100 text-amber-800 border-amber-200',    dot: 'bg-amber-500' },
  ESTIMATE_REVIEW:   { label: 'Estimate Review',   color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  ESTIMATE_REJECTED: { label: 'Estimate Rejected', color: 'bg-rose-100 text-rose-800 border-rose-200',       dot: 'bg-rose-500 animate-pulse' },
  ESTIMATE_APPROVED: { label: 'Approved ✓',        color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  PARTS_PENDING:     { label: 'Parts Pending',     color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  PARTS_READY:       { label: 'Parts Ready',       color: 'bg-teal-100 text-teal-800 border-teal-200',       dot: 'bg-teal-500' },
  IN_REPAIR:         { label: 'In Repair',         color: 'bg-blue-100 text-blue-800 border-blue-200',        dot: 'bg-blue-500 animate-pulse' },
  QC_PENDING:        { label: 'QC Queue',          color: 'bg-violet-100 text-violet-800 border-violet-200',  dot: 'bg-violet-500' },
  READY_FOR_PICKUP:  { label: 'Ready for Pickup',  color: 'bg-green-100 text-green-800 border-green-200',    dot: 'bg-green-500' },
  COMPLETED:         { label: 'Completed',         color: 'bg-slate-100 text-slate-600 border-slate-200',    dot: 'bg-slate-400' },
};
const getStatusCfg = (status: string, hasQcIssue = false) =>
  hasQcIssue
    ? { label: 'QC Failed – Fix Needed', color: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500 animate-ping' }
    : statusConfig[status] ?? { label: status.replace(/_/g, ' '), color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };

/* ─── Workflow pipeline ─── */
const PIPELINE = [
  { key: 'ASSIGNED',         label: 'Assigned' },
  { key: 'INSPECTING',       label: 'Inspecting' },
  { key: 'ESTIMATE_REVIEW',  label: 'Estimate' },
  { key: 'PARTS_READY',      label: 'Parts Ready' },
  { key: 'IN_REPAIR',        label: 'In Repair' },
  { key: 'QC_PENDING',       label: 'QC' },
  { key: 'READY_FOR_PICKUP', label: 'Pickup' },
];
const pipelineIdx = (s: string) => PIPELINE.findIndex((p) => p.key === s);

export const TechnicianView: React.FC = () => {
  const { currentShop } = useAuth();
  const [allJobs, setAllJobs]               = useState<Booking[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeTab, setActiveTab]           = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Estimate modal
  const [estimateBooking, setEstimateBooking] = useState<Booking | null>(null);
  const [laborCost, setLaborCost]             = useState('4000');
  const [lineItems, setLineItems]             = useState<Array<{ partName: string; quantity: number; unitCost: number }>>([
    { partName: 'Oil Filter',   quantity: 1, unitCost: 900 },
    { partName: 'Engine Oil 4L', quantity: 1, unitCost: 5200 },
  ]);
  const [partSearch, setPartSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // QC rework confirm modal
  const [qcReworkBooking, setQcReworkBooking] = useState<Booking | null>(null);

  /* ── Data load ── */
  const loadJobs = async () => {
    if (!currentShop) return;
    setIsLoading(true);
    try {
      const [jRes, invRes] = await Promise.all([
        api.get(`/bookings?shopId=${currentShop.id}`),
        api.get(`/inventory/${currentShop.id}/inventory`),
      ]);
      setAllJobs(jRes.data.bookings || []);
      setInventoryItems(invRes.data.inventory || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { loadJobs(); }, [currentShop]);

  /* ── Filters ── */
  const activeStatuses  = ['ASSIGNED','INSPECTING','ESTIMATE_REVIEW','ESTIMATE_REJECTED','ESTIMATE_APPROVED','PARTS_PENDING','PARTS_READY','IN_REPAIR','QC_PENDING'];
  const historyStatuses = ['READY_FOR_PICKUP','COMPLETED','CANCELLED'];
  const applySearch = (jobs: Booking[]) => {
    const q = searchQuery.toLowerCase();
    return jobs.filter((b) =>
      b.vehicle?.registrationPlate?.toLowerCase().includes(q) ||
      b.vehicle?.make?.toLowerCase().includes(q) ||
      b.vehicle?.model?.toLowerCase().includes(q) ||
      b.reference?.toLowerCase().includes(q) ||
      b.customer?.name?.toLowerCase().includes(q)
    );
  };
  const activeJobs  = applySearch(allJobs.filter((b) => activeStatuses.includes(b.status)));
  const historyJobs = applySearch(allJobs.filter((b) => historyStatuses.includes(b.status)));

  /* ── Stats ── */
  const inRepairCnt   = allJobs.filter((b) => b.status === 'IN_REPAIR').length;
  const inspectingCnt = allJobs.filter((b) => b.status === 'INSPECTING').length;
  const qcFailCnt     = allJobs.filter((b) => b.qcIssues?.some((q) => q.status === 'OPEN')).length;
  const completedCnt  = allJobs.filter((b) => b.status === 'COMPLETED').length;

  /* ── Transitions ── */
  const transition = async (id: string, actionKey: string, note: string) => {
    try {
      await api.post(`/bookings/${id}/transition`, { actionKey, note });
      loadJobs();
    } catch (err: any) { alert(err.message); }
  };
  const handleStartInspection = (b: Booking) =>
    transition(b.id, 'START_INSPECTION', 'Technician commenced physical inspection & diagnostics');
  const handleSendToQC = async (b: Booking) =>
    transition(b.id, 'SEND_TO_QC', 'Mechanical repair work finished. Dispatched to QC for testing.');

  /* ── Estimate helpers ── */
  const openEstimateModal = (b: Booking) => {
    setEstimateBooking(b);
    setLaborCost('4000');
    setPartSearch('');
    setLineItems([
      { partName: 'Oil Filter',    quantity: 1, unitCost: 900 },
      { partName: 'Engine Oil 4L', quantity: 1, unitCost: 5200 },
    ]);
  };
  const addLineItem    = () => setLineItems([...lineItems, { partName: '', quantity: 1, unitCost: 0 }]);
  const removeLineItem = (i: number) => setLineItems(lineItems.filter((_, x) => x !== i));
  const updateLineItem = (i: number, field: string, value: any) => {
    const c = [...lineItems]; c[i] = { ...c[i], [field]: value }; setLineItems(c);
  };
  const addInventoryPart = (inv: any) => {
    setLineItems([...lineItems, { partName: inv.name, quantity: 1, unitCost: inv.sellPrice || inv.costPrice }]);
    setPartSearch('');
  };
  const partsTotal = lineItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const grandTotal = partsTotal + (parseFloat(laborCost) || 0);

  const handleSubmitEstimate = async () => {
    if (!estimateBooking) return;
    setSubmitting(true);
    try {
      await api.post(`/estimates/${estimateBooking.id}`, {
        laborCost: parseFloat(laborCost) || 0,
        lineItems,
        notes: 'Diagnostics completed. Required replacement parts identified.',
      });
      await api.post(`/bookings/${estimateBooking.id}/transition`, {
        actionKey: 'SUBMIT_ESTIMATE',
        note: 'Estimate prepared and submitted to Service Advisor for review.',
      });
      setEstimateBooking(null);
      loadJobs();
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  /* ── WhatsApp ── */
  const openWhatsApp = (b: Booking) => {
    const raw = b.customer?.phone || '';
    let num = raw.replace(/[^0-9]/g, '');
    if (num.startsWith('03')) num = '92' + num.slice(1);
    const msg = encodeURIComponent(
      `Hello ${b.customer?.name || 'Customer'} 👋\n\nThis is your Technician from *${currentShop?.name}* regarding your *${b.vehicle?.make} ${b.vehicle?.model}* (${b.vehicle?.registrationPlate}).\n\nStatus: *${b.status.replace(/_/g, ' ')}*`
    );
    if (num) window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const displayJobs = activeTab === 'ACTIVE' ? activeJobs : historyJobs;

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── STATS BANNER ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'In Repair',      value: inRepairCnt,   clr: 'text-blue-600',    bg: 'from-blue-50',    icon: <Wrench className="w-5 h-5 text-blue-400" />,       sub: 'Active workshop bay' },
          { label: 'Inspecting',     value: inspectingCnt, clr: 'text-amber-600',   bg: 'from-amber-50',   icon: <Zap className="w-5 h-5 text-amber-400" />,         sub: 'Diagnostics in progress' },
          { label: 'QC Failures',    value: qcFailCnt,     clr: 'text-rose-600',    bg: 'from-rose-50',    icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,  sub: 'Requires rework' },
          { label: 'Completed',      value: completedCnt,  clr: 'text-emerald-600', bg: 'from-emerald-50', icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, sub: 'Delivered to customers' },
        ].map(({ label, value, clr, bg, icon, sub }) => (
          <div key={label} className={`p-4 rounded-2xl bg-gradient-to-br ${bg} to-white border border-slate-200 shadow-sm flex items-start gap-3`}>
            <div className="mt-0.5">{icon}</div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
              <div className={`text-2xl font-black font-mono ${clr} mt-0.5`}>{value}</div>
              <span className="text-[10px] text-slate-400">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS + SEARCH ── */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold w-fit">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'ACTIVE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Active Jobs ({activeJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'HISTORY' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            History ({historyJobs.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-[9px]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate, name, ref..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={loadJobs} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── JOB CARDS ── */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 animate-pulse">
          Loading workshop assignments…
        </div>
      ) : displayJobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Wrench className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">
            {activeTab === 'ACTIVE' ? 'No active jobs assigned.' : 'No completed jobs found.'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery ? 'Try clearing your search.' : 'Check back after SA assigns new work orders.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayJobs.map((b) => {
            const hasQcIssue = b.qcIssues?.some((q) => q.status === 'OPEN');
            const openIssue  = b.qcIssues?.find((q) => q.status === 'OPEN');
            const cfg        = getStatusCfg(b.status, hasQcIssue);
            const pIdx       = pipelineIdx(b.status);
            const est        = [...(b.estimates || [])].sort((a, x) => (x.revision || 0) - (a.revision || 0)).find((e) => e.status === 'APPROVED')
                            || [...(b.estimates || [])].sort((a, x) => (x.revision || 0) - (a.revision || 0))[0];
            const estTotal   = est ? Number(est.partsCost) + Number(est.laborCost) : 0;

            return (
              <div
                key={b.id}
                className={`rounded-3xl bg-white border shadow-sm overflow-hidden group transition-all ${
                  hasQcIssue  ? 'border-rose-300 shadow-rose-100'
                  : b.status === 'IN_REPAIR' ? 'border-blue-300 shadow-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Alert banners */}
                {hasQcIssue && openIssue && (
                  <div className="bg-rose-600 text-white px-6 py-2.5 flex items-center gap-2 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                    QC FAILED: {openIssue.title} — Rework required before re-submission
                  </div>
                )}
                {b.status === 'IN_REPAIR' && !hasQcIssue && (
                  <div className="bg-blue-600 text-white px-6 py-2 flex items-center gap-2 text-xs font-semibold">
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    Active Repair in Progress
                  </div>
                )}

                <div className="p-6 space-y-4">
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          #{b.reference}
                        </span>
                        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{b.bookingDate} · {b.bookingTime}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                        {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{b.vehicle.registrationPlate}</span>
                        {b.vehicle.color && <span>Colour: {b.vehicle.color}</span>}
                        {b.vehicle.mileage && <span>{b.vehicle.mileage.toLocaleString()} km</span>}
                        {b.customer?.name && <span>Owner: <strong className="text-slate-700">{b.customer.name}</strong></span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => openWhatsApp(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1fb855] text-white text-xs font-bold shadow transition-all"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.072.043.419-.101.824z" />
                        </svg>
                        WhatsApp
                      </button>
                      {estTotal > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Est. Bill</span>
                          <span className="font-mono font-black text-slate-900 text-sm">PKR {estTotal.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Workflow pipeline */}
                  {!hasQcIssue && activeTab === 'ACTIVE' && (
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {PIPELINE.map((step, i) => {
                        const done = i < pIdx; const current = i === pIdx;
                        return (
                          <React.Fragment key={step.key}>
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${
                              current ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
                              : done   ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              :          'bg-slate-50 text-slate-400 border-slate-200'
                            }`}>
                              {done && <Check className="w-2.5 h-2.5" />}{step.label}
                            </div>
                            {i < PIPELINE.length - 1 && (
                              <ChevronRight className={`w-3 h-3 shrink-0 ${done ? 'text-emerald-400' : 'text-slate-300'}`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  {/* Detail grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Reported Problem</span>
                      <p className="text-slate-800 font-semibold italic">"{b.reportedProblem}"</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Parts Person</span>
                      <p className="text-slate-800 font-semibold">{b.partsPerson?.name || '—'}</p>
                      <span className="text-[10px] text-slate-400">Assigned to procure parts</span>
                    </div>
                    {est ? (
                      <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100">
                        <span className="font-bold text-blue-400 uppercase text-[10px] block mb-1">
                          Estimate {est.status === 'APPROVED' ? '✓ Approved' : `· ${est.status}`}
                        </span>
                        <div className="font-black font-mono text-blue-700 text-sm">PKR {estTotal.toLocaleString()}</div>
                        <div className="text-[10px] text-blue-500 mt-0.5">
                          Parts: PKR {Number(est.partsCost).toLocaleString()} · Labour: PKR {Number(est.laborCost).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Estimate</span>
                        <p className="text-slate-400 italic">No estimate yet</p>
                      </div>
                    )}
                  </div>

                  {/* QC issue details */}
                  {hasQcIssue && openIssue && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-rose-700">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        QC Issue: "{openIssue.title}"
                      </div>
                      <p className="pl-5 text-rose-800">{openIssue.description}</p>
                      <div className="pl-5 text-[11px] text-rose-600 font-medium pt-1 border-t border-rose-200">
                        ↪ Rectify the fault, then use "Send Back to QC" button below.
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="pt-1 flex flex-wrap items-center justify-end gap-2.5">
                    {b.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStartInspection(b)}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                      >
                        <Zap className="w-4 h-4" />Start Diagnostic Inspection
                      </button>
                    )}
                    {(b.status === 'INSPECTING' || b.status === 'ESTIMATE_REJECTED') && (
                      <button
                        onClick={() => openEstimateModal(b)}
                        className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                          b.status === 'ESTIMATE_REJECTED'
                            ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                            : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        {b.status === 'ESTIMATE_REJECTED' ? 'Revise & Resubmit Estimate' : 'Create & Submit Estimate'}
                      </button>
                    )}
                    {b.status === 'IN_REPAIR' && !hasQcIssue && (
                      <button
                        onClick={() => handleSendToQC(b)}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />Repair Complete → Send to QC
                      </button>
                    )}
                    {hasQcIssue && (
                      <button
                        onClick={() => setQcReworkBooking(b)}
                        className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
                      >
                        <ArrowRight className="w-4 h-4" />Rework Complete → Send Back to QC
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL: ESTIMATE BUILDER
      ════════════════════════════════════════════════════ */}
      {estimateBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Modal dark header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 block mb-1">
                    Workshop Diagnostic Estimate
                  </span>
                  <h3 className="text-xl font-black">
                    {estimateBooking.vehicle.year} {estimateBooking.vehicle.make} {estimateBooking.vehicle.model}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                    <span className="font-mono font-bold text-white">{estimateBooking.vehicle.registrationPlate}</span>
                    <span>·</span>
                    <span>Ref #{estimateBooking.reference}</span>
                  </div>
                </div>
                <button onClick={() => setEstimateBooking(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 p-3 bg-white/10 rounded-2xl text-xs text-slate-200 italic">
                "{estimateBooking.reportedProblem}"
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Inventory search quick-add */}
              {inventoryItems.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    <Package className="w-3.5 h-3.5 inline mr-1 text-slate-400" />Add from Inventory
                  </label>
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={partSearch}
                      onChange={(e) => setPartSearch(e.target.value)}
                      placeholder="Search inventory parts..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {partSearch && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                      {inventoryItems
                        .filter((inv) => inv.name.toLowerCase().includes(partSearch.toLowerCase()) || inv.sku?.toLowerCase().includes(partSearch.toLowerCase()))
                        .slice(0, 8)
                        .map((inv) => (
                          <button key={inv.id} type="button" onClick={() => addInventoryPart(inv)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-xs border-b border-slate-100 last:border-0 transition-colors text-left">
                            <div>
                              <span className="font-semibold text-slate-900">{inv.name}</span>
                              <span className="text-slate-400 ml-2 font-mono">{inv.sku}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-blue-700">PKR {(inv.sellPrice || inv.costPrice).toLocaleString()}</span>
                              <span className={`ml-2 text-[10px] font-bold ${inv.quantityOnHand > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {inv.quantityOnHand > 0 ? `${inv.quantityOnHand} in stock` : 'Out of stock'}
                              </span>
                            </div>
                          </button>
                        ))}
                      {inventoryItems.filter((i) => i.name.toLowerCase().includes(partSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-400 text-center">No match found</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 inline mr-1 text-slate-400" />Parts & Materials
                  </label>
                  <button type="button" onClick={addLineItem}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors">
                    <Plus className="w-3.5 h-3.5" />Add Item
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                  <div className="col-span-6">Part Name</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Unit Price (PKR)</div>
                  <div className="col-span-1" />
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="col-span-6">
                        <input type="text" placeholder="Part description" value={item.partName}
                          onChange={(e) => updateLineItem(idx, 'partName', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={1} value={item.quantity}
                          onChange={(e) => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" placeholder="0" value={item.unitCost}
                          onChange={(e) => updateLineItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button type="button" onClick={() => removeLineItem(idx)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {lineItems.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No parts added yet. Click "Add Item" or search inventory above.
                    </div>
                  )}
                </div>
              </div>

              {/* Labour cost */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  <Wrench className="w-3.5 h-3.5 inline mr-1 text-slate-400" />Workshop Labour Cost (PKR)
                </label>
                <input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Cost summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white">
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Cost Breakdown</span>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Parts & Materials ({lineItems.length} items):</span>
                    <span className="font-mono font-semibold">PKR {partsTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Workshop Labour:</span>
                    <span className="font-mono font-semibold">PKR {(parseFloat(laborCost) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white border-t border-slate-700 pt-2 mt-1">
                    <span>Grand Total:</span>
                    <span className="font-mono text-blue-300">PKR {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEstimateBooking(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmitEstimate}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all">
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting…' : 'Submit Estimate to Service Advisor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL: QC REWORK CONFIRM
      ════════════════════════════════════════════════════ */}
      {qcReworkBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center mb-1">Confirm Rework Complete?</h3>
            <p className="text-xs text-slate-500 text-center mb-5">
              Have you fully resolved the QC-reported fault for{' '}
              <strong>{qcReworkBooking.vehicle.registrationPlate}</strong>? This will resubmit the vehicle to the QC queue.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setQcReworkBooking(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Not Yet
              </button>
              <button
                onClick={async () => { await handleSendToQC(qcReworkBooking); setQcReworkBooking(null); }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md">
                Yes, Send to QC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
