import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Booking } from '../../types';
import { InvoiceModal } from '../invoice/InvoiceModal';
import {
  CheckCircle,
  XCircle,
  UserCheck,
  Send,
  Package,
  Clock,
  Sparkles,
  Check,
  X,
  FileText,
  AlertCircle,
  Filter,
  Search,
  MessageCircle,
  Car,
  DollarSign,
  Printer,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const ServiceAdvisorView: React.FC = () => {
  const { currentShop, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [partsStaff, setPartsStaff] = useState<any[]>([]);
  const [aiTasks, setAiTasks] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Active View Tab: 'BOOKINGS' | 'INVOICES' | 'AI_TASKS'
  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'INVOICES' | 'AI_TASKS'>('BOOKINGS');

  // Modals state
  const [selectedBookingForAction, setSelectedBookingForAction] = useState<Booking | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [selectedPartsPersonId, setSelectedPartsPersonId] = useState('');
  const [adjustedLabor, setAdjustedLabor] = useState('');
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);

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
      setTechnicians(members.filter((m: any) => m.role === 'TECHNICIAN' && m.isActive));
      setPartsStaff(members.filter((m: any) => m.role === 'PARTS_PERSON' && m.isActive));
      setAiTasks(tRes.data.tasks || []);
    } catch (err) {
      console.error('Failed to load Service Advisor data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop, statusFilter]);

  // Open direct WhatsApp chat with specific customer
  const handleOpenWhatsApp = (booking: Booking) => {
    const rawPhone = booking.customer?.phone || '';
    let cleanNumber = rawPhone.replace(/[^0-9]/g, '');

    // Normalize Pakistani mobile numbers
    if (cleanNumber.startsWith('03')) {
      cleanNumber = '92' + cleanNumber.slice(1);
    } else if (cleanNumber.startsWith('3') && cleanNumber.length === 10) {
      cleanNumber = '92' + cleanNumber;
    }

    const customerName = booking.customer?.name || 'Customer';
    const vehicle = `${booking.vehicle?.year || ''} ${booking.vehicle?.make || ''} ${booking.vehicle?.model || ''}`.trim();
    const plate = booking.vehicle?.registrationPlate || '';
    const ref = booking.reference || '';
    const shopName = currentShop?.name || 'BayFlow Auto Care';
    const statusText = booking.status.replace(/_/g, ' ');

    const message = encodeURIComponent(
      `Hello ${customerName}! 👋\n\nThis is your Service Advisor from *${shopName}* regarding your *${vehicle}* (Reg: ${plate}, Booking #${ref}).\n\n📌 *Current Work Order Status:* ${statusText}\n\nPlease let us know if you have any questions or require an update on your vehicle.`
    );

    if (cleanNumber) {
      window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
    } else {
      const inputPhone = prompt(
        `Customer WhatsApp number is not saved on profile for ${customerName}.\nPlease enter their mobile number (e.g. 923001234567):`,
        '92300'
      );
      if (inputPhone) {
        let cleaned = inputPhone.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('03')) cleaned = '92' + cleaned.slice(1);
        window.open(`https://wa.me/${cleaned}?text=${message}`, '_blank');
      }
    }
  };

  // State Machine Action Handlers
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
    if (!confirm('Are you sure you want to decline this booking?')) return;
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
      setSelectedTechId('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviseAndSendEstimate = async () => {
    if (!selectedBookingForAction) return;
    const est = selectedBookingForAction.estimates?.[0];
    if (!est) return;
    try {
      await api.post(`/estimates/${est.id}/revise`, {
        laborCost: adjustedLabor ? parseFloat(adjustedLabor) : est.laborCost,
        note: 'Estimate revised and submitted to vehicle owner for authorization.',
      });
      setSelectedBookingForAction(null);
      setAdjustedLabor('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignPartsStaff = async () => {
    if (!selectedBookingForAction || !selectedPartsPersonId) return;
    try {
      await api.post(`/bookings/${selectedBookingForAction.id}/transition`, {
        actionKey: 'ASSIGN_PARTS_PERSON',
        partsPersonId: selectedPartsPersonId,
        note: 'Parts Person assigned for inventory procurement and allocation.',
      });
      setSelectedBookingForAction(null);
      setSelectedPartsPersonId('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleNotifyPickup = async (booking: Booking) => {
    try {
      await api.post(`/bookings/${booking.id}/transition`, {
        actionKey: 'NOTIFY_READY_FOR_PICKUP',
        note: 'Quality Control inspection passed. Customer notified vehicle is ready for collection.',
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
        note: 'Vehicle handed over to customer. Work order completed and closed.',
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

  // Filter bookings by search query
  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchPlate = b.vehicle?.registrationPlate?.toLowerCase().includes(q);
    const matchName = b.customer?.name?.toLowerCase().includes(q);
    const matchRef = b.reference?.toLowerCase().includes(q);
    const matchModel = `${b.vehicle?.make} ${b.vehicle?.model}`.toLowerCase().includes(q);
    return matchPlate || matchName || matchRef || matchModel;
  });

  // Calculate bill helpers for a booking
  const getBookingBill = (b: Booking) => {
    const sorted = b.estimates ? [...b.estimates].sort((x, y) => (y.revision || 0) - (x.revision || 0)) : [];
    const est = sorted.find((e) => e.status === 'APPROVED') || sorted[0];
    const items = est?.lineItems || [];
    const partsCost = items.length > 0
      ? items.reduce((sum, item) => sum + (Number(item.totalCost) || (Number(item.quantity || 1) * Number(item.unitCost || 0))), 0)
      : (Number(est?.partsCost) || 0);
    const laborCost = Number(est?.laborCost) || 0;
    const total = partsCost + laborCost;
    return { est, partsCost, laborCost, total };
  };

  // Quick stats calculations
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const inRepairCount = bookings.filter((b) => ['IN_REPAIR', 'PARTS_PENDING', 'PARTS_READY', 'INSPECTING'].includes(b.status)).length;
  const readyPickupCount = bookings.filter((b) => b.status === 'READY_FOR_PICKUP').length;
  const completedTodayCount = bookings.filter((b) => b.status === 'COMPLETED').length;
  const totalBillingEstimate = bookings.reduce((sum, b) => sum + getBookingBill(b).total, 0);

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. QUICK METRICS BANNER FOR SERVICE ADVISOR
         ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Pending Approval
          </span>
          <div className="text-2xl font-black font-mono text-amber-600 mt-1">
            {pendingCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Requires confirmation</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active in Workshop
          </span>
          <div className="text-2xl font-black font-mono text-blue-600 mt-1">
            {inRepairCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">In inspection & repair</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Ready for Pickup
          </span>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
            {readyPickupCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">QC passed, notify customer</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Completed Jobs
          </span>
          <div className="text-2xl font-black font-mono text-slate-700 mt-1">
            {completedTodayCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Handed over to owners</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-md col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">
            Total Billed Pipeline
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
            PKR {totalBillingEstimate.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-300 mt-0.5 block">Combined parts & labor</span>
        </div>
      </div>

      {/* ========================================================
          2. NAVIGATION TABS & FILTER BAR
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'BOOKINGS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Work Orders ({bookings.length})
          </button>

          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'INVOICES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices & Billing</span>
          </button>

          <button
            onClick={() => setActiveTab('AI_TASKS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'AI_TASKS'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-violet-700 hover:bg-violet-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Voice Tasks ({aiTasks.filter((t) => t.status === 'OPEN').length})</span>
          </button>
        </div>

        {/* Search & Filter Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search plate, customer, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 font-medium"
            />
          </div>

          {activeTab !== 'AI_TASKS' && (
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:outline-none"
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
                <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          TAB 1: WORK ORDERS & STATE MACHINE QUEUE
         ======================================================== */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4 animate-in fade-in">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Loading workshop bookings...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              No bookings found matching current filter or search query.
            </div>
          ) : (
            filteredBookings.map((b) => {
              const { est, partsCost, laborCost, total } = getBookingBill(b);

              return (
                <div
                  key={b.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-blue-400 shadow-sm transition-all space-y-4 group"
                >
                  {/* Work Order Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          #{b.reference}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{b.bookingDate} at <strong>{b.bookingTime}</strong></span>
                        </span>
                      </div>

                      <h3 className="text-base font-black text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">
                        {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                      </h3>

                      <div className="text-xs text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Plate: <strong className="text-slate-900 font-extrabold">{b.vehicle.registrationPlate}</strong></span>
                        <span>•</span>
                        <span>Customer: <strong className="text-slate-800">{b.customer?.name}</strong></span>
                        <span className="text-slate-400">({b.customer?.phone || 'Verified'})</span>
                      </div>
                    </div>

                    {/* Status Badge & Customer WhatsApp Action */}
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          b.status === 'READY_FOR_PICKUP'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                            : b.status === 'ESTIMATE_REVIEW'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : b.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>

                      {/* WHATSAPP DIRECT CHAT BUTTON (Replaced Call Method) */}
                      <button
                        onClick={() => handleOpenWhatsApp(b)}
                        className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
                        title="Chat with customer on WhatsApp directly"
                      >
                        {/* WhatsApp Icon */}
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.072.043.419-.101.824z" />
                        </svg>
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      {/* View & Calculate Bill / Print Invoice */}
                      <button
                        onClick={() => setInvoiceBooking(b)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="View Calculated Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 3 Columns Job Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">
                        Customer Reported Issue
                      </span>
                      <p className="text-slate-800 font-semibold italic mt-1">"{b.reportedProblem}"</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">
                        Staff Responsibility
                      </span>
                      <div className="text-slate-800 mt-1 space-y-0.5">
                        <div>Technician: <strong>{b.technician?.name || 'Unassigned'}</strong></div>
                        <div>Parts Person: <strong>{b.partsPerson?.name || 'Unassigned'}</strong></div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">
                        Calculated Estimate
                      </span>
                      {est ? (
                        <div className="text-slate-800 mt-1">
                          <div className="font-black font-mono text-blue-600 text-sm">
                            PKR {total.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Parts: PKR {partsCost.toLocaleString()} • Labor: PKR {laborCost.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 mt-1">No inspection estimate compiled yet</p>
                      )}
                    </div>
                  </div>

                  {/* Dynamic State Machine Action Buttons */}
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
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors flex items-center space-x-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Assign Technician</span>
                      </button>
                    )}

                    {/* 3. ESTIMATE_REVIEW -> Revise and send to customer */}
                    {b.status === 'ESTIMATE_REVIEW' && (
                      <button
                        onClick={() => {
                          setSelectedBookingForAction(b);
                          setActionType('REVISE_ESTIMATE');
                          setAdjustedLabor(est?.laborCost?.toString() || '');
                        }}
                        className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-colors flex items-center space-x-1.5"
                      >
                        <Send className="w-4 h-4" />
                        <span>Revise & Submit Estimate to Customer</span>
                      </button>
                    )}

                    {/* 4. ESTIMATE_APPROVED -> Assign Parts Person */}
                    {b.status === 'ESTIMATE_APPROVED' && (
                      <button
                        onClick={() => {
                          setSelectedBookingForAction(b);
                          setActionType('ASSIGN_PARTS');
                        }}
                        className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-colors flex items-center space-x-1.5"
                      >
                        <Package className="w-4 h-4" />
                        <span>Assign Parts Person</span>
                      </button>
                    )}

                    {/* 5. READY_FOR_PICKUP -> Notify Customer or Complete */}
                    {b.status === 'READY_FOR_PICKUP' && (
                      <>
                        <button
                          onClick={() => handleNotifyPickup(b)}
                          className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold transition-colors"
                        >
                          Dispatch Pickup SMS/Notification
                        </button>
                        <button
                          onClick={() => handleCompleteBooking(b)}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-colors flex items-center space-x-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Complete & Handover</span>
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

      {/* ========================================================
          TAB 2: INVOICES & BILLING (Accurate Bills & Fast Print)
         ======================================================== */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Billing, Repair Estimates & Invoices Ledger
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time mathematical bill calculation for all vehicle repairs at {currentShop?.name}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Active Shop Pipeline
                </span>
                <span className="text-2xl font-black font-mono text-emerald-600">
                  PKR {totalBillingEstimate.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 text-xs">
              <table className="w-full">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4 text-left">Invoice Ref</th>
                    <th className="py-3 px-4 text-left">Vehicle & Plate</th>
                    <th className="py-3 px-4 text-left">Customer</th>
                    <th className="py-3 px-4 text-right">Parts (PKR)</th>
                    <th className="py-3 px-4 text-right">Labor (PKR)</th>
                    <th className="py-3 px-4 text-right">Grand Total (PKR)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => {
                    const { est, partsCost, laborCost, total } = getBookingBill(b);
                    const isPaid = b.status === 'COMPLETED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          #{b.reference}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                          </div>
                          <div className="text-[11px] font-mono font-semibold text-slate-500">
                            {b.vehicle.registrationPlate}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{b.customer?.name}</div>
                          <div className="text-[11px] text-slate-400">{b.customer?.phone || 'Verified'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          PKR {partsCost.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          PKR {laborCost.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          PKR {total.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isPaid ? 'PAID & CLOSED' : 'IN WORKFLOW'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => setInvoiceBooking(b)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors flex items-center space-x-1"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>View Bill</span>
                            </button>

                            <button
                              onClick={() => handleOpenWhatsApp(b)}
                              className="p-1.5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors"
                              title="Send invoice details to customer on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: AI FRONT DESK CALL & VOICE TASKS
         ======================================================== */}
      {activeTab === 'AI_TASKS' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-xs text-violet-900">
            <strong>AI Voice Receptionist:</strong> Incoming inquiries or missed phone calls are answered by the AI Front Desk assistant. Real bookings are cross-referenced from the database and logged as actionable Service Advisor tasks.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiTasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 col-span-2">
                No active AI Front Desk tasks logged.
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

      {/* ========================================================
          MODAL: ASSIGN TECHNICIAN
         ======================================================== */}
      {selectedBookingForAction && actionType === 'ASSIGN_TECH' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-black text-slate-900 mb-2">Assign Technician</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select an active technician for <strong>{selectedBookingForAction.vehicle.year} {selectedBookingForAction.vehicle.make} {selectedBookingForAction.vehicle.model}</strong>.
            </p>

            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Workshop Technician --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.userId}>
                  {t.user.name} ({t.user.email})
                </option>
              ))}
            </select>

            <div className="flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setSelectedBookingForAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={!selectedTechId}
                onClick={handleAssignTechnician}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-600/30"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REVISE ESTIMATE (SA REVIEW)
         ======================================================== */}
      {selectedBookingForAction && actionType === 'REVISE_ESTIMATE' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-black text-slate-900 mb-2">Revise & Submit Estimate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Review parts and adjust labor charges for <strong>{selectedBookingForAction.vehicle.registrationPlate}</strong> before submitting for customer digital authorization.
            </p>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-700 block mb-1">Workshop Labour Cost (PKR)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={adjustedLabor}
                onChange={(e) => setAdjustedLabor(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setSelectedBookingForAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReviseAndSendEstimate}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md shadow-purple-600/30"
              >
                Send to Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ASSIGN PARTS PERSON
         ======================================================== */}
      {selectedBookingForAction && actionType === 'ASSIGN_PARTS' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-black text-slate-900 mb-2">Assign Parts Person</h3>
            <p className="text-xs text-slate-500 mb-4">
              Customer authorized estimate! Select a Parts Specialist to allocate parts and check inventory stock.
            </p>

            <select
              value={selectedPartsPersonId}
              onChange={(e) => setSelectedPartsPersonId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Parts Specialist --</option>
              {partsStaff.map((p) => (
                <option key={p.id} value={p.userId}>
                  {p.user.name} ({p.user.email})
                </option>
              ))}
            </select>

            <div className="flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setSelectedBookingForAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={!selectedPartsPersonId}
                onClick={handleAssignPartsStaff}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-amber-600/30"
              >
                Assign Parts Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          INVOICE MODAL
         ======================================================== */}
      {invoiceBooking && (
        <InvoiceModal
          booking={invoiceBooking}
          onClose={() => setInvoiceBooking(null)}
        />
      )}
    </div>
  );
};
