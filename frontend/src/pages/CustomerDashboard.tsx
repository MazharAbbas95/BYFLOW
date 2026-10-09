import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Booking } from '../types';
import { InvoiceModal } from '../components/invoice/InvoiceModal';
import { CallModal } from '../components/calling/CallModal';
import { AIFrontDeskModal } from '../components/calling/AIFrontDeskModal';
import {
  Car,
  Clock,
  CheckCircle,
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
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user, currentShop } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showInvoice, setShowInvoice] = useState(false);
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/bookings');
      setBookings(res.data.bookings || []);
      if (res.data.bookings && res.data.bookings.length > 0) {
        setSelectedBooking(res.data.bookings[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleApproveEstimate = async () => {
    if (!selectedBooking) return;
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/transition`, {
        actionKey: 'CUSTOMER_APPROVE_ESTIMATE',
        note: 'Customer approved estimate via web portal',
      });
      setSelectedBooking(res.data.booking);
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectEstimate = async () => {
    if (!selectedBooking) return;
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/transition`, {
        actionKey: 'CUSTOMER_REJECT_ESTIMATE',
        note: rejectReason || 'Customer requested cost revision',
        rejectionReason: rejectReason,
      });
      setSelectedBooking(res.data.booking);
      setShowRejectBox(false);
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmPickup = async () => {
    if (!selectedBooking) return;
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/transition`, {
        actionKey: 'COMPLETE_BOOKING',
        note: 'Customer picked up the vehicle',
      });
      setSelectedBooking(res.data.booking);
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startVoiceCall = async () => {
    if (!selectedBooking) return;
    try {
      // Find SA or Owner of this shop to receive call
      const membersRes = await api.get(`/shops/${selectedBooking.shopId}/members`);
      const saMember = membersRes.data.members?.find((m: any) => m.role === 'SERVICE_ADVISOR') || membersRes.data.members?.[0];

      if (!saMember) {
        alert('No Service Advisor currently registered for this shop.');
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
      alert(err.message);
    }
  };

  // Status progression definitions
  const statusSteps = [
    { key: 'PENDING', label: 'Booking Placed' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'INSPECTING', label: 'Inspection' },
    { key: 'AWAITING_CUSTOMER', label: 'Estimate Review' },
    { key: 'IN_REPAIR', label: 'In Repair' },
    { key: 'QC_PENDING', label: 'Quality Control' },
    { key: 'READY_FOR_PICKUP', label: 'Ready for Pick-up' },
    { key: 'COMPLETED', label: 'Completed' },
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

  const currentStepIdx = selectedBooking ? getStatusIndex(selectedBooking.status) : 0;
  const latestEstimate = selectedBooking?.estimates?.[0];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Customer Tracking Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Welcome back, <strong className="text-slate-800">{user?.name}</strong>. Track vehicle repair lifecycle, approve estimates, and call your advisor.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 text-xs font-bold transition-colors shadow-sm"
            >
              <Bot className="w-4 h-4 text-violet-600" />
              <span>Ask AI Front Desk</span>
            </button>
            <button
              onClick={fetchBookings}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dashboard Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Left: Bookings List */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Registered Bookings ({bookings.length})
            </h2>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200">
                No active bookings found. Book a service online to get started!
              </div>
            ) : (
              bookings.map((b) => {
                const isSelected = selectedBooking?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-white shadow-md ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-400">
                          #{b.reference}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                        </h4>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {b.vehicle.registrationPlate}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
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

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>{b.shop?.name}</span>
                      <span>{b.bookingDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected Booking Detail & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {selectedBooking ? (
              <>
                {/* ACTION BANNER 1: AWAITING CUSTOMER ESTIMATE APPROVAL */}
                {selectedBooking.status === 'AWAITING_CUSTOMER' && latestEstimate && (
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xl shadow-amber-500/20 animate-in fade-in">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold mb-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Action Required by You</span>
                        </div>
                        <h3 className="text-xl font-black">Estimate Ready for Approval</h3>
                        <p className="text-xs text-amber-100 mt-1">
                          Technician finished vehicle diagnostics and Service Advisor sent itemized quote (Revision {latestEstimate.revision}).
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-amber-200">Total Estimate</span>
                        <div className="text-2xl font-black font-mono">
                          PKR {latestEstimate.totalCost.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Line items preview */}
                    <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md text-xs space-y-2 border border-white/20">
                      <div className="font-bold text-white/90 pb-1 border-b border-white/20 flex justify-between">
                        <span>Line Item Breakdown</span>
                        <span>Amount (PKR)</span>
                      </div>
                      {latestEstimate.lineItems.map((li, i) => (
                        <div key={i} className="flex justify-between text-amber-50">
                          <span>{li.partName} (x{li.quantity})</span>
                          <span className="font-mono">PKR {li.totalCost.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-amber-50 pt-1 border-t border-white/10">
                        <span>Technician Workshop Labour</span>
                        <span className="font-mono">PKR {latestEstimate.laborCost.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleApproveEstimate}
                        className="px-6 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-md transition-all hover:scale-105 flex items-center space-x-1.5"
                      >
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Approve Estimate (PKR {latestEstimate.totalCost.toLocaleString()})</span>
                      </button>

                      <button
                        onClick={() => setShowRejectBox(!showRejectBox)}
                        className="px-4 py-2.5 rounded-xl bg-black/20 hover:bg-black/30 text-white font-semibold text-xs border border-white/30 transition-colors"
                      >
                        <span>Decline / Request Modification</span>
                      </button>
                    </div>

                    {showRejectBox && (
                      <div className="mt-4 p-4 rounded-2xl bg-white text-slate-900 animate-in fade-in">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Reason for declining or revision feedback:
                        </label>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. Budget is PKR 12,000, please remove ignition coil replacement..."
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 focus:outline-none"
                        />
                        <button
                          onClick={handleRejectEstimate}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                        >
                          Confirm Decline
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ACTION BANNER 2: READY FOR PICKUP */}
                {selectedBooking.status === 'READY_FOR_PICKUP' && (
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-600/20 animate-in fade-in">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold mb-2">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Vehicle Ready for Collection</span>
                        </div>
                        <h3 className="text-xl font-black">All Repairs & Quality Checks Finished!</h3>
                        <p className="text-xs text-emerald-100 mt-1">
                          Your vehicle has passed road testing and safety inspection. You may pick it up at {selectedBooking.shop?.name}.
                        </p>
                      </div>
                      <button
                        onClick={handleConfirmPickup}
                        className="px-6 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs shadow-lg transition-all hover:scale-105"
                      >
                        Confirm Vehicle Collected
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Lifecycle Status Timeline */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Live Lifecycle Timeline
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      Current: <strong>{selectedBooking.status}</strong>
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
                    {statusSteps.map((st, i) => {
                      const isPastOrCurrent = currentStepIdx >= i;
                      const isCurrent = currentStepIdx === i;
                      return (
                        <div key={st.key} className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                              isCurrent
                                ? 'bg-brand-600 text-white ring-4 ring-brand-100 scale-110 shadow-md'
                                : isPastOrCurrent
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isPastOrCurrent && !isCurrent ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span
                            className={`text-[11px] leading-tight ${
                              isCurrent
                                ? 'font-extrabold text-brand-600'
                                : isPastOrCurrent
                                ? 'font-semibold text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Booking Vehicle & Shop Details Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedBooking.vehicle.year} {selectedBooking.vehicle.make} {selectedBooking.vehicle.model}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Plate: <strong className="font-mono text-slate-800">{selectedBooking.vehicle.registrationPlate}</strong> • {selectedBooking.shop?.name} ({selectedBooking.shop?.city})
                      </p>
                    </div>

                    {/* Direct In-App Call Button */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={startVoiceCall}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center space-x-2 shadow-sm"
                        title="Call Service Advisor via In-App Audio (WebRTC)"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Call Service Advisor</span>
                      </button>

                      <button
                        onClick={() => setShowInvoice(true)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center space-x-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer problem & appointment details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                        Reported Problem / Notes
                      </span>
                      <p className="text-slate-800 font-medium italic">
                        "{selectedBooking.reportedProblem}"
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                        Scheduled Slot
                      </span>
                      <p className="text-slate-800 font-medium">
                        {selectedBooking.bookingDate} at {selectedBooking.bookingTime}
                      </p>
                    </div>
                  </div>

                  {/* Estimates breakdown if created */}
                  {latestEstimate && (
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Official Itemized Estimate (Revision {latestEstimate.revision})
                      </h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                        <table className="w-full">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3 text-left">Item</th>
                              <th className="py-2 px-3 text-center">Qty</th>
                              <th className="py-2 px-3 text-right">Unit Price</th>
                              <th className="py-2 px-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {latestEstimate.lineItems.map((li, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-medium text-slate-800">{li.partName}</td>
                                <td className="py-2 px-3 text-center text-slate-600">{li.quantity}</td>
                                <td className="py-2 px-3 text-right font-mono text-slate-600">
                                  PKR {li.unitCost.toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                  PKR {li.totalCost.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50/50">
                              <td colSpan={3} className="py-2 px-3 font-semibold text-slate-700">
                                Labour Charges
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                PKR {latestEstimate.laborCost.toLocaleString()}
                              </td>
                            </tr>
                            <tr className="bg-brand-50/60 font-bold">
                              <td colSpan={3} className="py-2 px-3 text-brand-900">
                                Total Estimate
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-brand-900 text-sm">
                                PKR {latestEstimate.totalCost.toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Transition History Audit Log */}
                  {selectedBooking.history && selectedBooking.history.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Audit Log & Activity History
                      </h4>
                      <div className="space-y-2">
                        {selectedBooking.history.map((h, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">
                                {h.fromStatus !== 'NONE' ? `${h.fromStatus} → ` : ''}
                                <span className="text-brand-600 font-bold">{h.toStatus}</span>
                              </div>
                              <p className="text-slate-500 text-[11px] mt-0.5">{h.note}</p>
                            </div>
                            <div className="text-right text-[10px] text-slate-400">
                              <div>{h.userName} ({h.userRole})</div>
                              <div>{new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                Select a booking from the left to view live repair progress.
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
            // Trigger AI Front Desk after missed call
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
