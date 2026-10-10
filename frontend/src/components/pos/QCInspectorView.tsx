import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Booking } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  FileCheck,
  Car,
  Wrench,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  Check,
  X,
  ArrowRight,
  Gauge,
  Activity,
  Award,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  AlertOctagon,
  CheckSquare,
  Square,
  Send,
  Zap,
} from 'lucide-react';

interface ChecklistCategory {
  title: string;
  icon: any;
  items: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    title: 'Powertrain & Mechanical',
    icon: Activity,
    items: [
      { id: 'engineIdle', label: 'Engine Idle & Acoustic Stability', description: 'Smooth RPM at operating temp, zero anomalous vibration or misfire' },
      { id: 'oilFluids', label: 'Fluid Integrity & Leak Detection', description: 'Oil filter seal, sump plug, coolant hoses and transmission dry' },
      { id: 'exhaustHangers', label: 'Exhaust & Mountings', description: 'Zero exhaust gas blow-by, cat converter intact, tight heat shields' },
    ],
  },
  {
    title: 'Braking & Safety Dynamics',
    icon: Gauge,
    items: [
      { id: 'brakeResponse', label: 'Brake Response & Hydraulic Bite', description: 'Firm pedal pressure, zero sponginess, ABS self-test passes' },
      { id: 'parkingBrake', label: 'Handbrake / Emergency Brake Hold', description: 'Holds vehicle securely at standard 4-6 clicks on slope' },
      { id: 'wheelTorque', label: 'Wheel Lug Nut Torque & Pressures', description: 'Torqued to spec, tire pressures matched across all 4 wheels' },
    ],
  },
  {
    title: 'Road Test & ECU Verification',
    icon: Car,
    items: [
      { id: 'roadTest', label: 'Dynamic Road Test (5-10 km)', description: 'Smooth gear shifts, straight line stability, zero suspension clunk' },
      { id: 'obdClear', label: 'OBD-II DTC Diagnostic Scan', description: 'Zero active or pending fault codes, ECU readiness monitors set' },
      { id: 'lightingSignals', label: 'Exterior Lighting & Signalling', description: 'Headlamps, high beams, brake lamps, hazards and wipers operational' },
    ],
  },
  {
    title: 'Finishing & Customer Handover',
    icon: Sparkles,
    items: [
      { id: 'cleanliness', label: 'Post-Service Interior Cleanliness', description: 'Steering & seat protection removed, zero grease on touchpoints' },
      { id: 'partsVerification', label: 'Installed Parts vs Work Order', description: 'All replaced parts matched to estimate line items and old parts boxed' },
    ],
  },
];

const PRESET_DEFECTS = [
  { title: 'Oil seepage detected at filter seal', desc: 'Light oil leakage found around new filter housing during road test. Tighten or reseat seal.', severity: 'MINOR' },
  { title: 'Brake pedal soft / hydraulic bleed needed', desc: 'Brake pedal travel excessive under emergency stop test. Requires secondary line bleeding.', severity: 'CRITICAL' },
  { title: 'OBD-II Pending DTC Code P0300', desc: 'Misfire code detected in ECU memory after 5km road test. Re-check spark plug gap and coil pack seating.', severity: 'MAJOR' },
  { title: 'Front suspension clunk on left lock', desc: 'Audible knock from left stabilizer link / tie-rod over bumps during dynamic test.', severity: 'MAJOR' },
  { title: 'Coolant hose clamp weeping', desc: 'Lower radiator hose clamp is loose, slow drip under pressurized operating temp.', severity: 'CRITICAL' },
];

export const QCInspectorView: React.FC = () => {
  const { currentShop, user } = useAuth();
  const [qcQueue, setQcQueue] = useState<Booking[]>([]);
  const [allShopBookings, setAllShopBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'CLAIMED_BY_ME' | 'HISTORY' | 'REWORKS'>('QUEUE');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'UNCLAIMED' | 'IN_PROGRESS'>('ALL');

  // Inspection modal state
  const [inspectingBooking, setInspectingBooking] = useState<Booking | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    engineIdle: true,
    oilFluids: true,
    exhaustHangers: true,
    brakeResponse: true,
    parkingBrake: true,
    wheelTorque: true,
    roadTest: true,
    obdClear: true,
    lightingSignals: true,
    cleanliness: true,
    partsVerification: true,
  });
  const [checklistNotes, setChecklistNotes] = useState('Dynamic road test passed. All mechanical systems verified safe.');
  const [roadTestKm, setRoadTestKm] = useState('8.5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Defect / Failure reporting form
  const [showFailForm, setShowFailForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<'MINOR' | 'MAJOR' | 'CRITICAL'>('MAJOR');

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = async (showSpinner = true) => {
    if (!currentShop) return;
    if (showSpinner) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [queueRes, allRes] = await Promise.all([
        api.get(`/qc/${currentShop.id}/qc-queue`),
        api.get(`/bookings?shopId=${currentShop.id}`),
      ]);
      setQcQueue(queueRes.data.queue || []);
      setAllShopBookings(allRes.data.bookings || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error loading QC queue', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [currentShop]);

  /* ── Calculations & Metrics ── */
  const metrics = useMemo(() => {
    const pendingCount = qcQueue.filter((b) => b.status === 'QC_PENDING').length;
    const inProgressCount = qcQueue.filter((b) => b.status === 'QC_IN_PROGRESS').length;
    const claimedByMeCount = qcQueue.filter((b) => b.status === 'QC_IN_PROGRESS' && b.qcInspectorId === user?.id).length;

    const certifiedToday = allShopBookings.filter((b) =>
      ['READY_FOR_PICKUP', 'COMPLETED'].includes(b.status) &&
      (!b.qcIssues || !b.qcIssues.some((q) => q.status === 'OPEN'))
    ).length;

    const allQcIssues = allShopBookings.flatMap((b) => b.qcIssues || []);
    const totalInspected = certifiedToday + allQcIssues.length;
    const failRate = totalInspected > 0 ? Math.round((allQcIssues.length / totalInspected) * 100) : 0;

    return {
      pendingCount,
      inProgressCount,
      claimedByMeCount,
      certifiedToday,
      totalIssuesLogged: allQcIssues.length,
      failRate,
    };
  }, [qcQueue, allShopBookings, user]);

  /* ── Claim / Lock Job ── */
  const handlePickJob = async (booking: Booking) => {
    try {
      await api.post(`/qc/bookings/${booking.id}/pick`);
      showToast(`Vehicle #${booking.reference} locked for your inspection.`);
      loadAllData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to claim vehicle', 'error');
    }
  };

  /* ── Open Inspection Modal ── */
  const handleOpenInspection = (booking: Booking) => {
    setInspectingBooking(booking);
    setShowFailForm(false);
    setIssueTitle('');
    setIssueDescription('');
    setIssueSeverity('MAJOR');
    // Pre-fill standard checklist as checked
    const initial: Record<string, boolean> = {};
    CHECKLIST_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        initial[item.id] = true;
      });
    });
    setCheckedItems(initial);
    setChecklistNotes(`10 km road test complete. ${booking.vehicle.make} ${booking.vehicle.model} running smoothly. All systems verified.`);
  };

  /* ── Quick Check All / Uncheck All ── */
  const handleToggleAll = (status: boolean) => {
    const updated: Record<string, boolean> = {};
    CHECKLIST_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        updated[item.id] = status;
      });
    });
    setCheckedItems(updated);
  };

  const totalChecklistItems = CHECKLIST_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedChecklistItems = Object.values(checkedItems).filter(Boolean).length;
  const checklistPercentage = Math.round((completedChecklistItems / totalChecklistItems) * 100);

  /* ── Pass Inspection ── */
  const handlePassInspection = async () => {
    if (!inspectingBooking) return;
    if (checklistPercentage < 100) {
      const confirmPass = window.confirm(
        `Only ${completedChecklistItems}/${totalChecklistItems} items are checked. Are you sure you want to pass this vehicle without 100% compliance?`
      );
      if (!confirmPass) return;
    }

    setIsSubmitting(true);
    try {
      const notesWithTelemetry = `[ROAD TEST: ${roadTestKm} KM] - ${checklistNotes} (Inspection Score: ${checklistPercentage}%)`;
      await api.post(`/qc/bookings/${inspectingBooking.id}/review`, {
        passed: true,
        checklistNotes: notesWithTelemetry,
      });

      showToast(`✓ Quality Control PASSED for #${inspectingBooking.reference}! Vehicle is READY_FOR_PICKUP.`, 'success');
      setInspectingBooking(null);
      loadAllData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit QC approval', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Fail Inspection (Report Defect) ── */
  const handleFailInspection = async () => {
    if (!inspectingBooking) return;
    if (!issueTitle.trim() || !issueDescription.trim()) {
      showToast('Please specify defect title and rectification instructions.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullIssueTitle = `[${issueSeverity}] ${issueTitle.trim()}`;
      await api.post(`/qc/bookings/${inspectingBooking.id}/review`, {
        passed: false,
        issueTitle: fullIssueTitle,
        issueDescription: issueDescription.trim(),
      });

      showToast(`Defect reported for #${inspectingBooking.reference}. Vehicle returned to technician.`, 'info');
      setInspectingBooking(null);
      setShowFailForm(false);
      loadAllData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit QC failure', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Filtered Jobs ── */
  const displayedJobs = useMemo(() => {
    let list: Booking[] = [];

    if (activeTab === 'QUEUE') {
      list = qcQueue.filter((b) => {
        if (queueFilter === 'UNCLAIMED') return b.status === 'QC_PENDING';
        if (queueFilter === 'IN_PROGRESS') return b.status === 'QC_IN_PROGRESS';
        return true;
      });
    } else if (activeTab === 'CLAIMED_BY_ME') {
      list = qcQueue.filter((b) => b.status === 'QC_IN_PROGRESS' && b.qcInspectorId === user?.id);
    } else if (activeTab === 'HISTORY') {
      list = allShopBookings.filter((b) => ['READY_FOR_PICKUP', 'COMPLETED'].includes(b.status));
    } else if (activeTab === 'REWORKS') {
      list = allShopBookings.filter((b) => b.qcIssues && b.qcIssues.length > 0);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((b) =>
      b.reference.toLowerCase().includes(q) ||
      b.vehicle.registrationPlate.toLowerCase().includes(q) ||
      b.vehicle.make.toLowerCase().includes(q) ||
      b.vehicle.model.toLowerCase().includes(q) ||
      b.customer?.name?.toLowerCase().includes(q) ||
      b.technician?.name?.toLowerCase().includes(q)
    );
  }, [qcQueue, allShopBookings, activeTab, queueFilter, searchQuery, user]);

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
          {toast.type === 'info' && <AlertOctagon className="w-4 h-4 text-sky-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Quality Assurance & Road Testing</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-black uppercase tracking-wider">
                  SaaS QA Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-point safety compliance, OBD-II diagnostic validation, and delivery certification for {currentShop?.name || 'Workshop'}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadAllData(false)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all flex items-center space-x-2 text-xs font-bold"
            title="Refresh queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
            <span className="hidden sm:inline">Sync Live</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Awaiting Testing</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{metrics.pendingCount}</div>
            <span className="text-[11px] text-amber-600 font-semibold flex items-center space-x-1 mt-0.5">
              <Clock className="w-3 h-3 inline mr-1" /> Ready for claim
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Under Testing (Active)</span>
            <div className="text-2xl font-black text-violet-700 mt-1">{metrics.inProgressCount}</div>
            <span className="text-[11px] text-violet-600 font-medium mt-0.5">
              {metrics.claimedByMeCount} locked by you
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Certified & Passed</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.certifiedToday}</div>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Ready for customer pickup
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">QC Defect / Rework Rate</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{metrics.failRate}%</div>
            <span className="text-[11px] text-rose-600 font-medium mt-0.5">
              {metrics.totalIssuesLogged} defects intercepted
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
        {/* Tabs */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-2xl self-start border border-slate-200/60">
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'QUEUE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
            <span>Active QC Queue</span>
            <span className="px-1.5 py-0.2 rounded-md bg-violet-100 text-violet-800 text-[10px] font-mono">
              {qcQueue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CLAIMED_BY_ME')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'CLAIMED_BY_ME'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>My Active Tests</span>
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono">
              {metrics.claimedByMeCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
            <span>Certified Log</span>
          </button>

          <button
            onClick={() => setActiveTab('REWORKS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'REWORKS'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reworks Log</span>
            {metrics.totalIssuesLogged > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 text-[10px] font-mono">
                {metrics.totalIssuesLogged}
              </span>
            )}
          </button>
        </div>

        {/* Search & Sub-Filter */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {activeTab === 'QUEUE' && (
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
              <button
                onClick={() => setQueueFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                  queueFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setQueueFilter('UNCLAIMED')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                  queueFilter === 'UNCLAIMED' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unclaimed
              </button>
              <button
                onClick={() => setQueueFilter('IN_PROGRESS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                  queueFilter === 'IN_PROGRESS' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Progress
              </button>
            </div>
          )}

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search plate, vehicle, mechanic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Worklist Display */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-500" />
          <p className="font-semibold text-slate-600">Loading Quality Control Queue...</p>
        </div>
      ) : displayedJobs.length === 0 ? (
        <div className="p-14 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">
            {activeTab === 'QUEUE'
              ? 'Quality Control Queue is Clear!'
              : activeTab === 'CLAIMED_BY_ME'
              ? 'You have no active claimed inspections.'
              : 'No matching records found.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === 'QUEUE'
              ? 'All repaired vehicles have been road tested, verified, and certified for customer delivery.'
              : 'Claim a pending vehicle from the QC queue to perform road testing and diagnostics.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {displayedJobs.map((b) => {
            const isLockedByMe = b.qcInspectorId === user?.id;
            const isLockedByOther = b.qcInspectorId && b.qcInspectorId !== user?.id && b.status === 'QC_IN_PROGRESS';
            const hasOpenQcIssue = b.qcIssues?.some((q) => q.status === 'OPEN');
            const openIssue = b.qcIssues?.find((q) => q.status === 'OPEN');
            const pastDefectsCount = b.qcIssues?.length || 0;

            return (
              <div
                key={b.id}
                className={`p-6 rounded-3xl bg-white border transition-all duration-200 shadow-sm space-y-4 hover:shadow-md ${
                  hasOpenQcIssue
                    ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20'
                    : isLockedByMe
                    ? 'border-violet-300 ring-2 ring-violet-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                        #{b.reference}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">
                        Slot: <strong>{b.bookingDate} {b.bookingTime}</strong>
                      </span>
                      {pastDefectsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                          {pastDefectsCount} Past Defects Logged
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 pt-0.5">
                      <h3 className="text-lg font-black text-slate-900">
                        {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-black tracking-wider">
                        {b.vehicle.registrationPlate}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Customer: <strong className="text-slate-800">{b.customer?.name || 'Walk-in Guest'}</strong></span>
                      <span>•</span>
                      <span>Assigned Mechanic: <strong className="text-slate-800">{b.technician?.name || 'Assigned Tech'}</strong></span>
                      {b.vehicle.mileage && (
                        <>
                          <span>•</span>
                          <span>Odometer: <strong>{b.vehicle.mileage.toLocaleString()} km</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                        hasOpenQcIssue
                          ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                          : b.status === 'QC_IN_PROGRESS'
                          ? 'bg-violet-100 text-violet-800 border border-violet-200'
                          : b.status === 'READY_FOR_PICKUP' || b.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasOpenQcIssue
                            ? 'bg-rose-500'
                            : b.status === 'QC_IN_PROGRESS'
                            ? 'bg-violet-500'
                            : b.status === 'READY_FOR_PICKUP'
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span>
                        {hasOpenQcIssue
                          ? 'QC FAILED (IN REWORK)'
                          : b.status === 'QC_IN_PROGRESS'
                          ? 'Under Inspection'
                          : b.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Defect Alert If Active */}
                {hasOpenQcIssue && openIssue && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2 animate-in fade-in">
                    <div className="flex items-center space-x-2 text-rose-800 font-bold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                      <span>Defect Flagged: "{openIssue.title}"</span>
                    </div>
                    <p className="text-rose-800 pl-6 leading-relaxed">{openIssue.description}</p>
                    <div className="pl-6 text-[11px] text-rose-600 font-semibold">
                      Vehicle has been returned to workshop floor for mechanic rectification.
                    </div>
                  </div>
                )}

                {/* Work Summary & Telemetry Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                      Customer Problem / Repairs Done
                    </span>
                    <p className="text-slate-800 font-medium italic">"{b.reportedProblem}"</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                      Inspector Assignment
                    </span>
                    <div className="flex items-center space-x-1.5 text-slate-800 font-semibold">
                      {b.qcInspector ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-violet-600" />
                          <span>Locked by: <strong>{b.qcInspector.name}</strong></span>
                          {isLockedByMe && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px]">
                              You
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-amber-700">Open in Pool (Unclaimed)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                      Parts Installed On Vehicle
                    </span>
                    <p className="text-slate-800 font-medium">
                      {b.estimates?.[0]?.lineItems && b.estimates[0].lineItems.length > 0 ? (
                        <span>{b.estimates[0].lineItems.map((li) => li.partName).join(', ')}</span>
                      ) : (
                        <span className="text-slate-400 italic">Standard Diagnostic Service</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400 font-mono">
                    Updated {new Date(b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Unclaimed -> Claim Job */}
                    {b.status === 'QC_PENDING' && (
                      <button
                        onClick={() => handlePickJob(b)}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-slate-900/10 transition-all hover:scale-[1.02]"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Claim & Lock for Testing</span>
                      </button>
                    )}

                    {/* Claimed by Me -> Open Checklist */}
                    {b.status === 'QC_IN_PROGRESS' && isLockedByMe && (
                      <button
                        onClick={() => handleOpenInspection(b)}
                        className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold shadow-md shadow-violet-600/25 transition-all flex items-center space-x-2 hover:scale-[1.02]"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Perform QC Inspection & Certification</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Locked by another inspector */}
                    {isLockedByOther && (
                      <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold flex items-center space-x-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>In testing by {b.qcInspector?.name}</span>
                      </div>
                    )}

                    {/* Completed / Ready for pickup status badge */}
                    {['READY_FOR_PICKUP', 'COMPLETED'].includes(b.status) && (
                      <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Certified Road-Safe</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: COMPREHENSIVE AUTOMOTIVE QC INSPECTION */}
      {inspectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-mono font-bold">
                    #{inspectingBooking.reference}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-slate-600">
                    Mechanic: {inspectingBooking.technician?.name || 'Assigned'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Quality Audit & Road Testing Certification
                </h3>
                <p className="text-xs text-slate-500">
                  Vehicle: <strong className="text-slate-800">{inspectingBooking.vehicle.year} {inspectingBooking.vehicle.make} {inspectingBooking.vehicle.model}</strong> ({inspectingBooking.vehicle.registrationPlate})
                </p>
              </div>

              {/* Compliance Score Gauge */}
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Checklist Score</span>
                <div className={`text-2xl font-black font-mono ${checklistPercentage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {checklistPercentage}%
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {completedChecklistItems}/{totalChecklistItems} Points Safe
                </span>
              </div>
            </div>

            {/* Quick Actions Helper */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">
                Verify each point rigorously before vehicle handover to customer.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleToggleAll(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center space-x-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Check All Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAll(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px]"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Checklist Categories */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {CHECKLIST_CATEGORIES.map((cat, idx) => {
                const CatIcon = cat.icon;
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                    <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                      <CatIcon className="w-4 h-4 text-violet-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        {cat.title}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {cat.items.map((item) => {
                        const isChecked = !!checkedItems[item.id];
                        return (
                          <label
                            key={item.id}
                            className={`flex items-start space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-white border-emerald-200 shadow-sm'
                                : 'bg-white/60 border-slate-200 opacity-70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setCheckedItems({ ...checkedItems, [item.id]: e.target.checked })
                              }
                              className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 w-4 h-4 border-slate-300"
                            />
                            <div className="flex-1 text-xs">
                              <span className={`font-bold block ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                                {item.label}
                              </span>
                              <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                                {item.description}
                              </span>
                            </div>
                            {isChecked && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Telemetry & Road Test Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Road Test Distance (km):
                </label>
                <div className="relative">
                  <Gauge className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="0.5"
                    value={roadTestKm}
                    onChange={(e) => setRoadTestKm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Inspector Sign-off Notes & Remarks:
                </label>
                <input
                  type="text"
                  value={checklistNotes}
                  onChange={(e) => setChecklistNotes(e.target.value)}
                  placeholder="e.g. Engine idle steady, no fluid leaks, road tested safe."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* QC FAILURE REPORTING DRAWER / SUBFORM */}
            {showFailForm ? (
              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-black text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Report Quality Defect (Dispatches Job back to Technician)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                    Defect Mode Active
                  </span>
                </div>

                {/* Preset Defect Shortcuts */}
                <div>
                  <span className="text-[11px] font-bold text-rose-700 block mb-1.5">
                    Quick Defect Templates:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_DEFECTS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setIssueTitle(p.title);
                          setIssueDescription(p.desc);
                          setIssueSeverity(p.severity as any);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:border-rose-300 text-rose-900 text-[10px] font-semibold transition-all hover:bg-rose-100/50"
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-rose-800 mb-1">Defect Title:</label>
                    <input
                      type="text"
                      value={issueTitle}
                      onChange={(e) => setIssueTitle(e.target.value)}
                      placeholder="e.g. Oil leak at filter seal housing"
                      className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block font-bold text-rose-800 mb-1">Severity Level:</label>
                    <select
                      value={issueSeverity}
                      onChange={(e) => setIssueSeverity(e.target.value as any)}
                      className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-xs font-bold text-rose-800"
                    >
                      <option value="MINOR">Minor Adjustment</option>
                      <option value="MAJOR">Major Fault</option>
                      <option value="CRITICAL">Critical Safety</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-rose-800 mb-1">
                    Detailed Rectification Instructions for Technician:
                  </label>
                  <textarea
                    rows={2}
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Explain what was detected during testing and exactly what the mechanic must fix..."
                    className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-xs leading-relaxed"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={() => setShowFailForm(false)}
                    className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 font-bold hover:bg-rose-100"
                  >
                    Cancel Defect Form
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFailInspection}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md shadow-rose-600/30 flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Submitting...' : 'Return Job to Technician (Fail QC)'}</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Modal Bottom Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingBooking(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 order-2 sm:order-1"
              >
                Close Audit
              </button>

              <div className="flex items-center space-x-2 order-1 sm:order-2">
                {!showFailForm && (
                  <button
                    type="button"
                    onClick={() => setShowFailForm(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center space-x-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Report Defect (Fail)</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePassInspection}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-2 hover:scale-[1.02]"
                >
                  <Award className="w-4 h-4" />
                  <span>{isSubmitting ? 'Certifying...' : 'Pass QC & Move to Ready for Pickup'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
