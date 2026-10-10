import React from 'react';
import { Booking } from '../../types';
import {
  Printer,
  X,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface InvoiceModalProps {
  booking: Booking;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ booking, onClose }) => {
  /* ── 1. Resolve the most authoritative estimate ── */
  const sorted = booking.estimates
    ? [...booking.estimates].sort((a, b) => (b.revision || 0) - (a.revision || 0))
    : [];
  const estimate =
    sorted.find((e) => e.status === 'APPROVED') ||
    sorted.find((e) => e.status === 'SUBMITTED') ||
    sorted[0] ||
    null;

  const lineItems = estimate?.lineItems || [];

  /* ── 2. Accurate part/labour amounts ── */
  const partsSubtotal =
    lineItems.length > 0
      ? lineItems.reduce((acc, item) => {
          const lineTotal =
            Number(item.totalCost) ||
            Number(item.quantity || 1) * Number(item.unitCost || 0);
          return acc + lineTotal;
        }, 0)
      : Number(estimate?.partsCost) || 0;

  const labourCharges = Number(estimate?.laborCost) || 0;
  const subtotal = partsSubtotal + labourCharges;
  const taxRate = 0; // 0 % exempt — adjust if required
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const grandTotal = subtotal + taxAmount;

  /* ── 3. Flags ── */
  const isCompleted = booking.status === 'COMPLETED';
  const hasEstimate = estimate !== null;

  /* ── 4. Print handler ── */
  const handlePrint = () => window.print();

  /* ── 5. WhatsApp share ── */
  const handleWhatsAppShare = () => {
    const rawPhone = booking.customer?.phone || '';
    let num = rawPhone.replace(/[^0-9]/g, '');
    if (num.startsWith('03')) num = '92' + num.slice(1);
    else if (num.startsWith('3') && num.length === 10) num = '92' + num;

    const vehicle = `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`;
    const msg = encodeURIComponent(
      `🔧 *Invoice Summary* — ${booking.shop?.name || 'BayFlow Auto Workshop'}\n\n` +
        `Booking Ref: *#${booking.reference}*\n` +
        `Vehicle: *${vehicle}* (${booking.vehicle.registrationPlate})\n\n` +
        `Parts & Materials: *PKR ${partsSubtotal.toLocaleString()}*\n` +
        `Labour Charges: *PKR ${labourCharges.toLocaleString()}*\n` +
        `─────────────────\n` +
        `*Total Payable: PKR ${grandTotal.toLocaleString()}*\n\n` +
        `Status: ${isCompleted ? '✅ PAID & RELEASED' : '🔄 IN PROGRESS'}\n\n` +
        `Thank you for trusting us with your vehicle! 🚗`
    );

    if (num) {
      window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    } else {
      const inp = prompt('Enter customer WhatsApp number:', '923001234567');
      if (inp) {
        const c = inp.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${c}?text=${msg}`, '_blank');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-slate-900 my-8 animate-in fade-in zoom-in-95 duration-200">

        {/* ── TOP ACTION BAR (hidden on print) ── */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">Repair Invoice</span>
            <span>•</span>
            <span className="font-mono text-blue-700 font-semibold">#{booking.reference}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isCompleted ? 'PAID' : 'IN PROGRESS'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#1fb855] text-white text-xs font-bold shadow transition-all"
              title="Share invoice on WhatsApp"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.072.043.419-.101.824z" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Print / PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── PRINTABLE INVOICE BODY ── */}
        <div className="pt-6 space-y-6">

          {/* Header: Shop branding + Invoice meta */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    {booking.shop?.name || 'BayFlow Auto Workshop'}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Certified Multi-Tenant Automotive Centre
                  </span>
                </div>
              </div>
              {booking.shop?.address && (
                <p className="text-xs text-slate-500">{booking.shop.address}</p>
              )}
              <p className="text-xs text-slate-500">
                {booking.shop?.city}
                {booking.shop?.phone ? ` • Ph: ${booking.shop.phone}` : ''}
              </p>
            </div>

            <div className="sm:text-right shrink-0">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {isCompleted ? '✓ Paid & Released' : 'Official Bill Estimate'}
              </span>
              <p className="text-xs font-mono font-bold text-slate-700 mt-2">
                Invoice No: INV-{booking.reference.replace('BF-', '')}
              </p>
              <p className="text-xs text-slate-500">Date: {booking.bookingDate}</p>
              <p className="text-xs text-slate-400">Time Slot: {booking.bookingTime}</p>
            </div>
          </div>

          {/* Customer + Vehicle Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1.5">
                Customer Particulars
              </span>
              <p className="font-black text-slate-900 text-sm">
                {booking.customer?.name || 'Valued Vehicle Owner'}
              </p>
              {booking.customer?.email && (
                <p className="text-slate-600 font-mono mt-0.5">{booking.customer.email}</p>
              )}
              <p className="text-slate-600 mt-0.5">
                Contact: {booking.customer?.phone || 'Verified Account'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1.5">
                Vehicle & Work Order
              </span>
              <p className="font-black text-slate-900 text-sm">
                {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
              </p>
              <p className="text-slate-600 font-mono font-bold mt-0.5">
                Plate:{' '}
                <strong className="text-blue-700 font-extrabold">
                  {booking.vehicle.registrationPlate}
                </strong>
              </p>
              {booking.vehicle.color && (
                <p className="text-slate-500 mt-0.5">Colour: {booking.vehicle.color}</p>
              )}
              <p className="text-slate-500 italic mt-0.5">
                Issue: &ldquo;{booking.reportedProblem}&rdquo;
              </p>
            </div>
          </div>

          {/* No estimate warning */}
          {!hasEstimate && (
            <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                No repair estimate compiled yet. Bill totals will appear once the technician
                submits an inspection estimate.
              </span>
            </div>
          )}

          {/* ── LINE ITEMS TABLE ── */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left">Description / Genuine Part</th>
                  <th className="py-3 px-4 text-center w-14">Qty</th>
                  <th className="py-3 px-4 text-right w-36">Unit Price (PKR)</th>
                  <th className="py-3 px-4 text-right w-36">Line Total (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 px-4 text-center text-slate-400 italic">
                      {hasEstimate
                        ? 'Parts not itemised — bulk cost applied below.'
                        : 'No parts or services recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  lineItems.map((line, idx) => {
                    const qty = Number(line.quantity) || 1;
                    const uCost = Number(line.unitCost) || 0;
                    const lTotal = Number(line.totalCost) || qty * uCost;
                    return (
                      <tr key={line.id || idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {line.partName}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            OEM Authenticated Part
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{qty}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {uCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {lTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Non-itemised parts cost row */}
                {lineItems.length === 0 && partsSubtotal > 0 && (
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-800" colSpan={3}>
                      Parts & Materials (Bulk)
                      <span className="block text-[10px] text-slate-400 font-normal">
                        As evaluated during inspection
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {partsSubtotal.toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Labour row */}
                <tr className="bg-slate-50">
                  <td className="py-3 px-4 text-slate-900" colSpan={3}>
                    <div className="font-bold">Certified Workshop Labour & Service</div>
                    <div className="text-[10px] text-slate-500">
                      Technician labour units + digital diagnostics scan
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {labourCharges.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── BILL SUMMARY ── */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Parts & Materials:</span>
                <span className="font-mono font-semibold text-slate-900">
                  PKR {partsSubtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Labour Charges:</span>
                <span className="font-mono font-semibold text-slate-900">
                  PKR {labourCharges.toLocaleString()}
                </span>
              </div>

              {taxRate > 0 && (
                <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2">
                  <span>Sales Tax ({taxRate}%):</span>
                  <span className="font-mono font-semibold text-slate-700">
                    PKR {taxAmount.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 border-t-2 border-slate-800 pt-3">
                <span>Net Total Payable:</span>
                <span className="font-mono text-blue-600 text-base">
                  PKR {grandTotal.toLocaleString()}
                </span>
              </div>

              {isCompleted && (
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-[11px]">PAID IN FULL — Vehicle Released</span>
                </div>
              )}
            </div>
          </div>

          {/* ── FOOTER QUALITY STAMP ── */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>QC Inspection Passed • 12-Month Nationwide Warranty</span>
            </div>
            <div className="text-slate-400 font-mono text-center sm:text-right">
              BayFlow Multi-Tenant Automotive SaaS • #{booking.id.slice(0, 8).toUpperCase()}
            </div>
          </div>

          {/* ── BOTTOM PRINT BUTTON (always visible) ── */}
          <div className="pt-2 flex justify-center print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-slate-900 hover:bg-blue-700 text-white text-sm font-bold shadow-lg transition-all"
            >
              <Printer className="w-5 h-5" />
              Print Invoice / Download as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


