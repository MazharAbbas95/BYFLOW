import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Booking } from '../types';
import { InvoiceModal } from '../components/invoice/InvoiceModal';
import { CallModal } from '../components/calling/CallModal';
import { AIFrontDeskModal } from '../components/calling/AIFrontDeskModal';
import {
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  FileText,
  Wrench,
  Bot,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  MessageSquare,
  Calendar,
  MapPin,
  Sparkles,
  Award,
  ArrowRight,
  Plus,
  ExternalLink,
  Layers,
  Send,
} from 'lucide-react';

/* ── Status Progression Definitions ── */
const STATUS_STEPS = [
  { key: 'PENDING', label: 'Booking Placed', desc: 'Appointment request received' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Technician slot allocated' },
  { key: 'INSPECTING', label: 'Diagnostic Check', desc: 'Physical inspection underway' },
  { key: 'AWAITING_CUSTOMER', label: 'Estimate Review', desc: 'Itemized quote ready for approval' },
  { key: 'IN_REPAIR', label: 'In Repair', desc: 'Mechanical work & parts installation' },
  { key: 'QC_PENDING', label: 'Quality Control', desc: 'Multi-point road test & certification' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Collection', desc: 'All tests passed. Vehicle clean' },
  { key: 'COMPLETED', label: 'Completed', desc: 'Handover & invoice finalized' },
];

const getStatusIndex = (status: string) => {
  if (['PENDING'].includes(status)) return 0;
  if (['CONFIRMED', 'ASSIGNED'].includes(status)) return 1;
  if (['INSPECTING', 'ESTIMATE_REVIEW'].includes(status)) return 2;
  if (['AWAITING_CUSTOMER', 'ESTIMATE_APPROVED', 'ESTIMATE_REJECTED'].includes(status)) return 3;
  if (['PARTS_PENDING', 'PARTS_ORDERED', 'PARTS_READY', 'IN_REPAIR'].includes(status)) return 4;
  if (['QC_PENDING', 'QC_IN_PROGRESS'].includes(status)) return 5;
  if (['READY_FOR_PICKUP'].includes(status)) return 6;
  if (['COMPLETED'].includes(status)) return 7;
  return 0;
};

export const CustomerDashboard: React.FC = () => {
  const { user, currentShop } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ESTIMATE' | 'AUDIT'>('OVERVIEW');

  // Modals state
  const [showInvoice, setShowInvoice] = useState(false);
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBookings = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const res = await api.get('/bookings');
      const list = res.data.bookings || [];
      setBookings(list);
      if (list.length > 0) {
        // Keep selected booking updated or default to first
        setSelectedBooking((prev) => (prev ? list.find((b: Booking) => b.id === prev.id) || list[0] : list[0]));
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error fetching bookings', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  /* ── Approve Estimate ── */
  const handleApproveEstimate = async () => {
    if (!selectedBooking) return;
    setIsActionSubmitting(true);
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/transition`, {
        actionKey: 'CUSTOMER_APPROVE_ESTIMATE',
        note: 'Customer digitally approved estimate via tracking portal',
      });
      setSelectedBooking(res.data.booking);
      showToast('✓ Estimate Approved! Workshop notified to begin parts allocation & repair.', 'success');
      fetchBookings(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to approve estimate', 'error');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  /* ── Reject / Request Modification ── */
  const handleRejectEstimate = async () => {
    if (!selectedBooking) return;
    if (!rejectReason.trim()) {
      showToast('Please provide a reason or modification request for the advisor.', 'error');
      return;
    }
    setIsActionSubmitting(true);
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/transition`, {
        actionKey: 'CUSTOMER_REJECT_ESTIMATE',
        note: rejectReason.trim(),
        rejectionReason: rejectReason.trim(),
      });
      setSelectedBooking(res.data.booking);
      setShowRejectBox(false);
      setRejectReason('');
      showToast('Estimate revision requested. Service Advisor will review your notes.', 'info');
      fetchBookings(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to reject estimate', 'error');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  /* ── Confirm Vehicle Collected ── */
  const handleConfirmPickup = async () => {
    if (!selectedBooking) return;
    setIsActionSubmitting(true);
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/transition`, {
        actionKey: 'COMPLETE_BOOKING',
        note: 'Customer confirmed physical vehicle collection & handover completed',
      });
      setSelectedBooking(res.data.booking);
      showToast('Vehicle collection confirmed! Thank you for servicing with BYFLOW.', 'success');
      fetchBookings(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm pickup', 'error');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  /* ── Start Voice Call ── */
  const startVoiceCall = async () => {
    if (!selectedBooking) return;
    try {
      const membersRes = await api.get(`/shops/${selectedBooking.shopId}/members`);
      const saMember =
        membersRes.data.members?.find((m: any) => m.role === 'SERVICE_ADVISOR') ||
        membersRes.data.members?.[0];

      if (!saMember) {
        showToast('No Service Advisor currently online for this shop. Opening AI Assistant...', 'info');
        setShowAiModal(true);
        return;
      }

      const res = await api.post('/calls/initiate', {
        bookingId: selectedBooking.id,
        shopId: selectedBooking.shopId,
        receiverId: saMember.userId,
      });

      setActiveCall({
        id: res.data.call.id,
        bookingId: selectedBooking.id,
        shopId: selectedBooking.shopId,
        receiverId: saMember.userId,
        receiverName: saMember.user.name,
        receiverRole: saMember.role,
        isIncoming: false,
      });
    } catch (err: any) {
      showToast(err.message || 'Could not initiate audio call', 'error');
    }
  };

  /* ── WhatsApp Advisor ── */
  const handleWhatsAppAdvisor = () => {
    if (!selectedBooking) return;
    const shopPhone = selectedBooking.shop?.phone || '+923001234567';
    const cleanPhone = shopPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hi ${selectedBooking.shop?.name || 'Workshop'}, I am checking in regarding my vehicle ${selectedBooking.vehicle.year} ${selectedBooking.vehicle.make} ${selectedBooking.vehicle.model} (Plate: ${selectedBooking.vehicle.registrationPlate}, Booking Ref: #${selectedBooking.reference}).`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const currentStepIdx = selectedBooking ? getStatusIndex(selectedBooking.status) : 0;
  const latestEstimate = selectedBooking?.estimates?.[0];

  const metrics = useMemo(() => {
    const activeCount = bookings.filter((b) => !['COMPLETED', 'CANCELLED'].includes(b.status)).length;
    const readyCount = bookings.filter((b) => b.status === 'READY_FOR_PICKUP').length;
    const approvalCount = bookings.filter((b) => b.status === 'AWAITING_CUSTOMER').length;
    return { activeCount, readyCount, approvalCount };
  }, [bookings]);

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
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
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-black uppercase tracking-wider">
                Live Vehicle Telemetry
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Customer Service Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Vehicle Health & Repair Tracker
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome back, <strong className="text-slate-800">{user?.name}</strong>. Monitor diagnostic steps, approve estimates, and connect with your service team.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              to="/book"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all flex items-center space-x-1.5 hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book New Service</span>
            </Link>

            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/20 hover:scale-[1.02]"
            >
              <Bot className="w-4 h-4" />
              <span>AI Front Desk</span>
            </button>

            <button
              onClick={() => fetchBookings(false)}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
              title="Refresh vehicle status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Portal KPI Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Vehicles in Workshop</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{metrics.activeCount}</div>
              <span className="text-[11px] text-brand-600 font-semibold mt-0.5 block">
                Tracked under state machine
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Action Needed (Approvals)</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{metrics.approvalCount}</div>
              <span className="text-[11px] text-amber-700 font-semibold mt-0.5 block">
                {metrics.approvalCount > 0 ? 'Review pending cost estimate' : 'All estimates approved'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ready for Collection</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{metrics.readyCount}</div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
                {metrics.readyCount > 0 ? 'Vehicle cleared quality testing' : 'Repairs in progress'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dashboard Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* Left Column: Customer's Bookings List */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Registered Work Orders ({bookings.length})
              </h2>
              <span className="text-[11px] text-slate-400">Click to switch</span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600" />
                <p>Loading your vehicles...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <Car className="w-10 h-10 mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-800">No active repair orders</h4>
                <p className="text-xs text-slate-500">
                  Book your next vehicle service online with our multi-tenant certified network.
                </p>
                <Link
                  to="/book"
                  className="inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
                >
                  Schedule Appointment
                </Link>
              </div>
            ) : (
              bookings.map((b) => {
                const isSelected = selectedBooking?.id === b.id;
                const stepIdx = getStatusIndex(b.status);
                const progressPct = Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100);

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                      isSelected
                        ? 'border-brand-600 bg-white shadow-lg ring-2 ring-brand-500/20 scale-[1.01]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                            #{b.reference}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-base mt-1">
                          {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                        </h4>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          Plate: <strong className="text-slate-800">{b.vehicle.registrationPlate}</strong>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          b.status === 'READY_FOR_PICKUP'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'AWAITING_CUSTOMER'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : b.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-brand-50 text-brand-700'
                        }`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Progress Bar in Card */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500 font-medium">Stage {stepIdx + 1} of {STATUS_STEPS.length}</span>
                        <span className="font-mono font-bold text-slate-700">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{b.shop?.name}</span>
                        <span>{b.bookingDate}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Quick Helper Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-xs space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>BYFLOW Guarantee</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                By strict protocol of our SaaS platform, no mechanical parts will be installed on your vehicle until you digitally inspect and approve the estimate.
              </p>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* Right Column: Active Vehicle Detail, Live Tracker & Controls */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {selectedBooking ? (
              <>
                {/* ── ACTION HERO BANNER 1: AWAITING CUSTOMER ESTIMATE APPROVAL ── */}
                {selectedBooking.status === 'AWAITING_CUSTOMER' && latestEstimate && (
                  <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white shadow-2xl shadow-amber-600/30 animate-in fade-in space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider mb-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Action Required by Customer</span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">Official Cost Estimate Ready</h3>
                        <p className="text-xs text-amber-100 mt-1 max-w-lg leading-relaxed">
                          Diagnostics are finished. Your Service Advisor has compiled a transparent, itemized quote (Revision {latestEstimate.revision}). Review and toggle your approval to initiate parts allocation.
                        </p>
                      </div>

                      <div className="text-left sm:text-right p-3 rounded-2xl bg-black/10 border border-white/20">
                        <span className="text-[11px] uppercase tracking-wider text-amber-200 font-bold block">Total Payable</span>
                        <div className="text-3xl font-black font-mono mt-0.5">
                          PKR {latestEstimate.totalCost.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Quick Preview Table */}
                    <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md text-xs space-y-2.5 border border-white/20">
                      <div className="font-bold text-white/90 pb-1.5 border-b border-white/20 flex justify-between uppercase text-[10px] tracking-wider">
                        <span>Required Parts & Materials</span>
                        <span>Amount (PKR)</span>
                      </div>
                      {latestEstimate.lineItems.map((li, i) => (
                        <div key={i} className="flex justify-between text-amber-50">
                          <span className="font-medium">{li.partName} (Qty: {li.quantity})</span>
                          <span className="font-mono">PKR {li.totalCost.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-amber-50 pt-2 border-t border-white/15">
                        <span className="font-medium">Workshop Certified Labour Charge</span>
                        <span className="font-mono">PKR {latestEstimate.laborCost.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        disabled={isActionSubmitting}
                        onClick={handleApproveEstimate}
                        className="px-7 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs shadow-xl transition-all hover:scale-105 flex items-center space-x-2"
                      >
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>{isActionSubmitting ? 'Approving...' : `Digitally Approve Quote (PKR ${latestEstimate.totalCost.toLocaleString()})`}</span>
                      </button>

                      <button
                        onClick={() => setShowRejectBox(!showRejectBox)}
                        className="px-5 py-3 rounded-xl bg-black/25 hover:bg-black/35 text-white font-bold text-xs border border-white/30 transition-colors"
                      >
                        <span>Decline / Request Price Revision</span>
                      </button>
                    </div>

                    {/* Reject / Revision input box */}
                    {showRejectBox && (
                      <div className="p-4 rounded-2xl bg-white text-slate-900 space-y-3 animate-in fade-in">
                        <label className="block text-xs font-bold text-slate-800">
                          Provide specific feedback for cost revision or parts adjustment:
                        </label>
                        <textarea
                          rows={2}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. Please postpone ignition coil replacement, keep only oil change..."
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowRejectBox(false)}
                            className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isActionSubmitting}
                            onClick={handleRejectEstimate}
                            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                          >
                            Submit Revision Request
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ACTION HERO BANNER 2: READY FOR PICKUP ── */}
                {selectedBooking.status === 'READY_FOR_PICKUP' && (
                  <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-2xl shadow-emerald-700/30 animate-in fade-in space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider mb-2">
                          <Award className="w-3.5 h-3.5 text-amber-300" />
                          <span>Quality Certified & Ready</span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">Your Vehicle is Ready for Collection!</h3>
                        <p className="text-xs text-emerald-100 mt-1 max-w-lg leading-relaxed">
                          All mechanical work, OBD-II diagnostic clear, and road safety tests have passed. You may pick up your vehicle from <strong>{selectedBooking.shop?.name}</strong>.
                        </p>
                      </div>

                      <button
                        disabled={isActionSubmitting}
                        onClick={handleConfirmPickup}
                        className="px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs shadow-xl transition-all hover:scale-105 flex items-center space-x-2 self-start"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Confirm Physical Handover Complete</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── LIVE LIFECYCLE TIMELINE TRACKER ── */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          Live Repair Lifecycle
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Automated 8-stage state machine workflow
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold self-start sm:self-auto">
                      Current: {selectedBooking.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Horizontal Lifecycle Steps */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
                    {STATUS_STEPS.map((st, i) => {
                      const isPastOrCurrent = currentStepIdx >= i;
                      const isCurrent = currentStepIdx === i;

                      return (
                        <div key={st.key} className="flex flex-col items-center space-y-2">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                              isCurrent
                                ? 'bg-brand-600 text-white ring-4 ring-brand-100 scale-110 shadow-lg'
                                : isPastOrCurrent
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isPastOrCurrent && !isCurrent ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <div>
                            <span
                              className={`text-[11px] block leading-tight font-bold ${
                                isCurrent
                                  ? 'text-brand-600 font-black'
                                  : isPastOrCurrent
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {st.label}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight hidden sm:block">
                              {st.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── WORKBENCH DETAILS & ADVISOR CONTROLS ── */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
                  {/* Top Header of Detail Box */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-black text-slate-900">
                          {selectedBooking.vehicle.year} {selectedBooking.vehicle.make} {selectedBooking.vehicle.model}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-black">
                          {selectedBooking.vehicle.registrationPlate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 inline" />
                        <span>{selectedBooking.shop?.name} ({selectedBooking.shop?.city}) • Slot: {selectedBooking.bookingDate} at {selectedBooking.bookingTime}</span>
                      </p>
                    </div>

                    {/* Contact & Actions Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* WhatsApp Button */}
                      <button
                        onClick={handleWhatsAppAdvisor}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm hover:scale-[1.02]"
                        title="Chat with Service Advisor on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Advisor</span>
                      </button>

                      {/* Direct In-App Call Button */}
                      <button
                        onClick={startVoiceCall}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm hover:scale-[1.02]"
                        title="Call Service Advisor via Audio Call"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Call Advisor</span>
                      </button>

                      {/* Invoice Button */}
                      <button
                        onClick={() => setShowInvoice(true)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center space-x-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-Tab Navigation for Detail View */}
                  <div className="flex space-x-2 border-b border-slate-100 pb-3">
                    <button
                      onClick={() => setActiveTab('OVERVIEW')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'OVERVIEW'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Diagnostics & Work Summary
                    </button>
                    <button
                      onClick={() => setActiveTab('ESTIMATE')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'ESTIMATE'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Itemized Estimate ({latestEstimate ? `PKR ${latestEstimate.totalCost.toLocaleString()}` : 'Pending'})
                    </button>
                    <button
                      onClick={() => setActiveTab('AUDIT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'AUDIT'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Activity Audit Log ({selectedBooking.history?.length || 0})
                    </button>
                  </div>

                  {/* TAB 1: OVERVIEW & DIAGNOSTICS */}
                  {activeTab === 'OVERVIEW' && (
                    <div className="space-y-4 animate-in fade-in text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <span className="font-bold text-slate-400 uppercase text-[10px] block">
                            Customer Reported Problem
                          </span>
                          <p className="text-slate-800 font-medium italic text-sm">
                            "{selectedBooking.reportedProblem}"
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <span className="font-bold text-slate-400 uppercase text-[10px] block">
                            Vehicle Specifications
                          </span>
                          <p className="text-slate-800 font-medium">
                            Color: {selectedBooking.vehicle.color || 'Standard'} • Mileage: {selectedBooking.vehicle.mileage?.toLocaleString() || 'N/A'} km
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            Chassis / Engine: Factory Verified
                          </p>
                        </div>
                      </div>

                      {/* QC Safety Seal if already inspected */}
                      {['READY_FOR_PICKUP', 'COMPLETED'].includes(selectedBooking.status) && (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-black text-emerald-900 text-sm">
                                100% Quality Assurance Road Test Certified
                              </h4>
                              <p className="text-[11px] text-emerald-700">
                                Multi-point mechanical, hydraulic brakes, and ECU diagnostic scan verified.
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 font-black text-xs">
                            QC PASSED
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: ITEMIZED ESTIMATE */}
                  {activeTab === 'ESTIMATE' && (
                    <div className="space-y-4 animate-in fade-in">
                      {latestEstimate ? (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                          <table className="w-full">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                              <tr>
                                <th className="py-2.5 px-3 text-left">Description</th>
                                <th className="py-2.5 px-3 text-center">Qty</th>
                                <th className="py-2.5 px-3 text-right">Unit Price</th>
                                <th className="py-2.5 px-3 text-right">Total (PKR)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {latestEstimate.lineItems.map((li, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 font-semibold text-slate-800">{li.partName}</td>
                                  <td className="py-2.5 px-3 text-center text-slate-600">{li.quantity}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    PKR {li.unitCost.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                    PKR {li.totalCost.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-slate-50/70 font-semibold text-slate-700">
                                <td colSpan={3} className="py-2.5 px-3">
                                  Workshop Certified Labour Charges
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  PKR {latestEstimate.laborCost.toLocaleString()}
                                </td>
                              </tr>
                              <tr className="bg-brand-50/70 font-black text-brand-900">
                                <td colSpan={3} className="py-3 px-3 text-sm">
                                  Grand Total Estimate (Rev {latestEstimate.revision})
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-base">
                                  PKR {latestEstimate.totalCost.toLocaleString()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                          Estimate is currently being prepared by the technician.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: AUDIT LOG & ACTIVITY */}
                  {activeTab === 'AUDIT' && (
                    <div className="space-y-2.5 animate-in fade-in">
                      {selectedBooking.history && selectedBooking.history.length > 0 ? (
                        selectedBooking.history.map((h, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                                <span className="text-slate-400">{h.fromStatus !== 'NONE' ? `${h.fromStatus} →` : ''}</span>
                                <span className="text-brand-600 font-extrabold">{h.toStatus}</span>
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed">{h.note}</p>
                            </div>
                            <div className="text-right text-[10px] text-slate-400 flex-shrink-0 ml-3">
                              <div className="font-semibold text-slate-600">{h.userName} ({h.userRole})</div>
                              <div>{new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                          No audit entries recorded yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
                <Car className="w-8 h-8 mx-auto text-slate-300" />
                <p>Select a vehicle booking from the left to view live repair progress.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && selectedBooking && (
        <InvoiceModal
          booking={selectedBooking}
          onClose={() => setShowInvoice(false)}
        />
      )}

      {/* In-App Calling Modal */}
      {activeCall && (
        <CallModal
          call={activeCall}
          onClose={() => setActiveCall(null)}
          onCallMissedOrUnhandled={() => {
            setActiveCall(null);
            setShowAiModal(true);
          }}
        />
      )}

      {/* AI Front Desk Voice Modal */}
      {showAiModal && (
        <AIFrontDeskModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          shopId={selectedBooking?.shopId || currentShop?.id}
          defaultCustomerIdentifier={user?.email || selectedBooking?.reference}
        />
      )}
    </div>
  );
};
