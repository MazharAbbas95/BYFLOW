import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Booking } from '../../types';
import { CallModal } from '../calling/CallModal';
import { InvoiceModal } from '../invoice/InvoiceModal';
import {
  CheckCircle,
  XCircle,
  UserCheck,
  Send,
  PhoneCall,
  Package,
  Clock,
  Sparkles,
  Check,
  X,
  FileText,
  AlertCircle,
  Filter,
} from 'lucide-react';

export const ServiceAdvisorView: React.FC = () => {
  const { currentShop, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [partsStaff, setPartsStaff] = useState<any[]>([]);
  const [aiTasks, setAiTasks] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedBookingForAction, setSelectedBookingForAction] = useState<Booking | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [selectedPartsPersonId, setSelectedPartsPersonId] = useState('');
  const [adjustedLabor, setAdjustedLabor] = useState('');
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'AI_TASKS'>('BOOKINGS');

  const loadData = async () => {
    if (!currentShop) return;
    setIsLoading(true);
    try {
      const [bRes, mRes, tRes] = await Promise.all([
        api.get(`/bookings?shopId=${currentShop.id}&status=${statusFilter}`),
        api.get(`/shops/${currentShop.id}/members`),
        api.get(`/shops/${currentShop.id}/ai-tasks`),
      ]);

      setBookings(bRes.data.bookings || []);
      const members = mRes.data.members || [];
      setTechnicians(members.filter((m: any) => m.role === 'TECHNICIAN'));
      setPartsStaff(members.filter((m: any) => m.role === 'PARTS_PERSON'));
      setAiTasks(tRes.data.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop, statusFilter]);

  const handleConfirm = async (booking: Booking) => {
    try {
      await api.post(`/bookings/${booking.id}/transition`, {
        actionKey: 'CONFIRM',
        note: 'Confirmed by Service Advisor',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDecline = async (booking: Booking) => {
    try {
      await api.post(`/bookings/${booking.id}/transition`, {
        actionKey: 'CANCEL',
        note: 'Declined by Service Advisor',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedBookingForAction || !selectedTechId) return;
    try {
      await api.post(`/bookings/${selectedBookingForAction.id}/transition`, {
        actionKey: 'ASSIGN_TECHNICIAN',
        technicianId: selectedTechId,
        note: 'Technician assigned by Service Advisor',
      });
      setSelectedBookingForAction(null);
      setActionType(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendEstimateToCustomer = async () => {
    if (!selectedBookingForAction) return;
    try {
      // If SA adjusted labor, update estimate first
      const est = selectedBookingForAction.estimates?.[0];
      if (est && adjustedLabor) {
        await api.post(`/estimates/${selectedBookingForAction.id}`, {
          laborCost: parseFloat(adjustedLabor),
          lineItems: est.lineItems,
          notes: 'Labor adjusted by Service Advisor before customer review',
        });
      }

      await api.post(`/bookings/${selectedBookingForAction.id}/transition`, {
        actionKey: 'SEND_TO_CUSTOMER',
        note: 'Estimate verified and dispatched to customer by Service Advisor',
      });

      setSelectedBookingForAction(null);
      setActionType(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignPartsPerson = async () => {
    if (!selectedBookingForAction) return;
    try {
      await api.post(`/bookings/${selectedBookingForAction.id}/transition`, {
        actionKey: 'ASSIGN_PARTS_PERSON',
        partsPersonId: selectedPartsPersonId || undefined,
        note: 'Parts procurement requested by Service Advisor',
      });
      setSelectedBookingForAction(null);
      setActionType(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleNotifyPickup = async (booking: Booking) => {
    try {
      await api.post(`/bookings/${booking.id}/transition`, {
        actionKey: 'NOTIFY_READY_FOR_PICKUP',
        note: 'Notification dispatched to customer: vehicle is ready for pickup.',
      });
      alert('Notification sent to customer: Vehicle ready for collection!');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteBooking = async (booking: Booking) => {
    try {
      await api.post(`/bookings/${booking.id}/transition`, {
        actionKey: 'COMPLETE_BOOKING',
        note: 'Vehicle handed over to customer. Job completed.',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleAiTask = async (taskId: string) => {
    try {
      await api.put(`/shops/${currentShop?.id}/ai-tasks/${taskId}/toggle`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startVoiceCallWithCustomer = async (booking: Booking) => {
    try {
      const res = await api.post('/calls/initiate', {
        bookingId: booking.id,
        shopId: booking.shopId,
        receiverId: booking.customerId,
      });

      setActiveCall({
        id: res.data.call.id,
        bookingId: booking.id,
        shopId: booking.shopId,
        receiverId: booking.customerId,
        receiverName: booking.customer?.name,
        receiverRole: 'CUSTOMER',
        isIncoming: false,
      });
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
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'BOOKINGS'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Shop Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('AI_TASKS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'AI_TASKS'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white text-violet-700 hover:bg-violet-50 border border-violet-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Front Desk Tasks ({aiTasks.filter((t) => t.status === 'OPEN').length} Open)</span>
          </button>
        </div>

        {activeTab === 'BOOKINGS' && (
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending (New)</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ESTIMATE_REVIEW">Estimate Review</option>
              <option value="AWAITING_CUSTOMER">Awaiting Customer</option>
              <option value="ESTIMATE_APPROVED">Estimate Approved</option>
              <option value="PARTS_PENDING">Parts Pending</option>
              <option value="IN_REPAIR">In Repair</option>
              <option value="QC_PENDING">QC Queue</option>
              <option value="READY_FOR_PICKUP">Ready for Pick-up</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* AI FRONT DESK TASKS VIEW */}
      {activeTab === 'AI_TASKS' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-xs text-violet-900">
            <strong>AI Front Desk Intelligence:</strong> Unanswered customer calls or status inquiries
            are handled by the AI voice agent, which retrieves real booking data and generates actionable tasks for the front desk.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 col-span-2">
                No AI Front Desk tasks recorded.
              </div>
            ) : (
              aiTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-5 rounded-3xl border transition-all ${
                    task.status === 'OPEN'
                      ? 'bg-white border-violet-200 shadow-sm'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-bold uppercase">
                        {task.intent} • {task.sentiment}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1.5">
                        {task.taskDescription}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{task.summary}</p>
                    </div>

                    <button
                      onClick={() => handleToggleAiTask(task.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors ${
                        task.status === 'OPEN'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{task.status === 'OPEN' ? 'Mark Done' : 'Completed'}</span>
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Caller: {task.callerName} ({task.callerPhone})</span>
                    <span>{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* BOOKINGS VIEW */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4 animate-in fade-in">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Loading workshop bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              No bookings found matching current filter.
            </div>
          ) : (
            bookings.map((b) => {
              const est = b.estimates?.[0];
              return (
                <div
                  key={b.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-brand-600">
                          #{b.reference}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          Slot: <strong>{b.bookingDate} {b.bookingTime}</strong>
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                        {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                      </h3>
                      <div className="text-xs text-slate-500 font-mono">
                        Plate: <strong className="text-slate-800">{b.vehicle.registrationPlate}</strong> • Customer: {b.customer?.name} ({b.customer?.email})
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          b.status === 'READY_FOR_PICKUP'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : b.status === 'ESTIMATE_REVIEW'
                            ? 'bg-purple-100 text-purple-800'
                            : b.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-brand-50 text-brand-700'
                        }`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>

                      {/* In-App Audio Call Button */}
                      <button
                        onClick={() => startVoiceCallWithCustomer(b)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                        title="Voice Call Customer (WebRTC)"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </button>

                      {/* View Invoice */}
                      <button
                        onClick={() => setInvoiceBooking(b)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                        title="Print / View Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Booking details body */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">
                        Reported Problem
                      </span>
                      <p className="text-slate-800 font-medium italic mt-0.5">"{b.reportedProblem}"</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">
                        Staff Assignment
                      </span>
                      <div className="text-slate-800 mt-0.5 space-y-0.5">
                        <div>Tech: <strong>{b.technician?.name || 'Unassigned'}</strong></div>
                        <div>Parts: <strong>{b.partsPerson?.name || 'Unassigned'}</strong></div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">
                        Estimate Details
                      </span>
                      {est ? (
                        <div className="text-slate-800 mt-0.5">
                          <div className="font-bold font-mono text-brand-600">
                            PKR {est.totalCost.toLocaleString()} (Rev {est.revision})
                          </div>
                          <div className="text-[11px] text-slate-500">Status: {est.status}</div>
                        </div>
                      ) : (
                        <p className="text-slate-400 mt-0.5">No estimate submitted yet</p>
                      )}
                    </div>
                  </div>

                  {/* SA WORKFLOW ACTION BUTTONS ACCORDING TO STATE MACHINE */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                    {/* 1. PENDING -> Confirm or Decline */}
                    {b.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleDecline(b)}
                          className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleConfirm(b)}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-colors flex items-center space-x-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirm Booking</span>
                        </button>
                      </>
                    )}

                    {/* 2. CONFIRMED -> Assign Technician */}
                    {b.status === 'CONFIRMED' && (
                      <button
                        onClick={() => {
                          setSelectedBookingForAction(b);
                          setActionType('ASSIGN_TECH');
                        }}
                        className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-colors flex items-center space-x-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Assign Technician</span>
                      </button>
                    )}

                    {/* 5. ESTIMATE_REVIEW -> Review & Adjust -> Send to Customer */}
                    {b.status === 'ESTIMATE_REVIEW' && (
                      <button
                        onClick={() => {
                          setSelectedBookingForAction(b);
                          setAdjustedLabor(est ? est.laborCost.toString() : '');
                          setActionType('REVIEW_ESTIMATE');
                        }}
                        className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-colors flex items-center space-x-1.5"
                      >
                        <Send className="w-4 h-4" />
                        <span>Review & Send Estimate to Customer</span>
                      </button>
                    )}

                    {/* 7. ESTIMATE_APPROVED -> Assign Parts Person */}
                    {b.status === 'ESTIMATE_APPROVED' && (
                      <button
                        onClick={() => {
                          setSelectedBookingForAction(b);
                          setActionType('ASSIGN_PARTS');
                        }}
                        className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-colors flex items-center space-x-1.5"
                      >
                        <Package className="w-4 h-4" />
                        <span>Assign Parts Person</span>
                      </button>
                    )}

                    {/* 14. READY_FOR_PICKUP -> Notify Customer or Complete */}
                    {b.status === 'READY_FOR_PICKUP' && (
                      <>
                        <button
                          onClick={() => handleNotifyPickup(b)}
                          className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                        >
                          Notify Customer (Ready)
                        </button>
                        <button
                          onClick={() => handleCompleteBooking(b)}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors"
                        >
                          Complete Booking (Handover)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: ASSIGN TECHNICIAN */}
      {actionType === 'ASSIGN_TECH' && selectedBookingForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Assign Technician</h3>
            <p className="text-xs text-slate-500 mb-4">
              Vehicle: {selectedBookingForAction.vehicle.make} {selectedBookingForAction.vehicle.model} ({selectedBookingForAction.vehicle.registrationPlate})
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Select Mechanic:</label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">-- Choose Technician --</option>
                {technicians.map((t) => (
                  <option key={t.user.id} value={t.user.id}>
                    {t.user.name} ({t.user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={!selectedTechId}
                onClick={handleAssignTechnician}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW & ADJUST ESTIMATE */}
      {actionType === 'REVIEW_ESTIMATE' && selectedBookingForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Review & Send Estimate to Customer
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Booking #{selectedBookingForAction.reference} • Technician Submitted Quote
            </p>

            {/* Line items list */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2 mb-4">
              <span className="font-bold text-slate-600 block">Required Parts:</span>
              {selectedBookingForAction.estimates?.[0]?.lineItems.map((li, i) => (
                <div key={i} className="flex justify-between text-slate-700">
                  <span>{li.partName} (x{li.quantity})</span>
                  <span className="font-mono">PKR {li.totalCost.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-slate-700">
                Adjust Workshop Labour Cost (PKR):
              </label>
              <input
                type="number"
                value={adjustedLabor}
                onChange={(e) => setAdjustedLabor(e.target.value)}
                placeholder="Labour cost in PKR"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
              <span className="text-[11px] text-slate-400">
                Note: Adjusting labour increases estimate revision count to maintain audit trail.
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEstimateToCustomer}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
              >
                Send to Customer for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN PARTS PERSON */}
      {actionType === 'ASSIGN_PARTS' && selectedBookingForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Assign Parts Specialist</h3>
            <p className="text-xs text-slate-500 mb-4">
              Customer approved estimate. Assign inventory person to check stock & procurement:
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Select Parts Person:</label>
              <select
                value={selectedPartsPersonId}
                onChange={(e) => setSelectedPartsPersonId(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">-- Choose Parts Person (or notify all) --</option>
                {partsStaff.map((p) => (
                  <option key={p.user.id} value={p.user.id}>
                    {p.user.name} ({p.user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignPartsPerson}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
              >
                Assign & Move to PARTS_PENDING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Audio Call Overlay */}
      {activeCall && (
        <CallModal call={activeCall} onClose={() => setActiveCall(null)} />
      )}

      {/* Invoice Modal */}
      {invoiceBooking && (
        <InvoiceModal booking={invoiceBooking} onClose={() => setInvoiceBooking(null)} />
      )}
    </div>
  );
};
