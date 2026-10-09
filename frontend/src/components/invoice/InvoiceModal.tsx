import React from 'react';
import { Booking } from '../../types';
import { Printer, X, CheckCircle, Wrench } from 'lucide-react';

interface InvoiceModalProps {
  booking: Booking;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ booking, onClose }) => {
  const estimate = booking.estimates?.[0];
  const items = estimate?.lineItems || [];
  const labor = estimate?.laborCost || 0;
  const parts = estimate?.partsCost || 0;
  const total = estimate?.totalCost || 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 text-slate-900 my-8">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 print:hidden">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-900">Tax Invoice & Repair Receipt</span>
            <span>•</span>
            <span>Reference: {booking.reference}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Body */}
        <div className="pt-6">
          {/* Shop Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {booking.shop?.name || 'BayFlow Auto Care'}
                </h2>
              </div>
              <p className="text-xs text-slate-500">{booking.shop?.address}</p>
              <p className="text-xs text-slate-500">{booking.shop?.city} • {booking.shop?.phone}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                {booking.status === 'COMPLETED' ? 'PAID / COMPLETED' : 'OFFICIAL ESTIMATE'}
              </span>
              <p className="text-xs font-mono text-slate-500 mt-1">Invoice: INV-{booking.reference.replace('BF-', '')}</p>
              <p className="text-xs text-slate-400">Date: {booking.bookingDate}</p>
            </div>
          </div>

          {/* Customer & Vehicle Info Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-4 my-6 border border-slate-100 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Billed To</span>
              <p className="font-bold text-slate-900 mt-1 text-sm">{booking.customer?.name || 'Valued Customer'}</p>
              <p className="text-slate-600">{booking.customer?.email}</p>
              <p className="text-slate-600">{booking.customer?.phone || 'Phone verified'}</p>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Vehicle Particulars</span>
              <p className="font-bold text-slate-900 mt-1 text-sm">
                {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
              </p>
              <p className="text-slate-600 font-mono font-semibold">Plate: {booking.vehicle.registrationPlate}</p>
              <p className="text-slate-600">Reported: {booking.reportedProblem}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl mb-6">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold">Item & Description</th>
                  <th className="py-2.5 px-4 text-center font-semibold">Qty</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Unit Price</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Total (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      Standard Diagnostic & Service inspection
                    </td>
                  </tr>
                ) : (
                  items.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-medium text-slate-800">{line.partName}</td>
                      <td className="py-2.5 px-4 text-center text-slate-600">{line.quantity}</td>
                      <td className="py-2.5 px-4 text-right text-slate-600 font-mono">
                        PKR {line.unitCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-mono">
                        PKR {line.totalCost.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
                {/* Labour */}
                <tr className="bg-slate-50/70">
                  <td className="py-2.5 px-4 font-medium text-slate-800" colSpan={3}>
                    Workshop Certified Labour & Mechanical Service
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-mono">
                    PKR {labor.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Parts Subtotal:</span>
                <span className="font-mono">PKR {parts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Labour Charges:</span>
                <span className="font-mono">PKR {labor.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2">
                <span>Sales Tax (0% Hackathon):</span>
                <span className="font-mono">PKR 0</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t-2 border-slate-900 pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-brand-600">PKR {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer Quality Stamp */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5 text-emerald-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Inspected & Tested by Quality Control</span>
            </div>
            <span>BayFlow Multi-Tenant Automotive Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
};
