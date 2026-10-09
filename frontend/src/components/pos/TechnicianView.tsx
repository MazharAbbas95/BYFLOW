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
  Car,
  Check,
} from 'lucide-react';

export const TechnicianView: React.FC = () => {
  const { currentShop, user } = useAuth();
  const [assignedJobs, setAssignedJobs] = useState<Booking[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estimate Creation Modal
  const [selectedBookingForEstimate, setSelectedBookingForEstimate] = useState<Booking | null>(null);
  const [laborCost, setLaborCost] = useState('4000');
  const [lineItems, setLineItems] = useState<
    Array<{ partName: string; quantity: number; unitCost: number }>
  >([
    { partName: 'Ignition Coil', quantity: 1, unitCost: 6500 },
    { partName: 'Oil Filter', quantity: 1, unitCost: 900 },
    { partName: 'Engine Oil 4L', quantity: 1, unitCost: 5200 },
  ]);

  const loadJobs = async () => {
    if (!currentShop) return;
    setIsLoading(true);
    try {
      const [jRes, invRes] = await Promise.all([
        api.get(`/bookings?shopId=${currentShop.id}`),
        api.get(`/inventory/${currentShop.id}/inventory`),
      ]);
      setAssignedJobs(jRes.data.bookings || []);
      setInventoryItems(invRes.data.inventory || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [currentShop]);

  const handleStartInspection = async (booking: Booking) => {
    try {
      await api.post(`/bookings/${booking.id}/transition`, {
        actionKey: 'START_INSPECTION',
        note: 'Technician commenced physical inspection & diagnostics',
      });
      loadJobs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { partName: '', quantity: 1, unitCost: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleSelectInventoryPart = (index: number, invItem: any) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      partName: invItem.name,
      unitCost: invItem.sellPrice || invItem.costPrice,
    };
    setLineItems(updated);
  };

  const handleSubmitEstimate = async () => {
    if (!selectedBookingForEstimate) return;
    try {
      // 1. Save estimate line items
      await api.post(`/estimates/${selectedBookingForEstimate.id}`, {
        laborCost: parseFloat(laborCost) || 0,
        lineItems,
        notes: 'Diagnostics completed. Required replacement parts identified.',
      });

      // 2. Transition state machine to ESTIMATE_REVIEW
      await api.post(`/bookings/${selectedBookingForEstimate.id}/transition`, {
        actionKey: 'SUBMIT_ESTIMATE',
        note: 'Estimate prepared and submitted to Service Advisor',
      });

      setSelectedBookingForEstimate(null);
      loadJobs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendToQC = async (booking: Booking) => {
    try {
      await api.post(`/bookings/${booking.id}/transition`, {
        actionKey: 'SEND_TO_QC',
        note: 'Mechanical repair work finished. Dispatched to QC queue for testing.',
      });
      loadJobs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const partsTotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
  const grandTotal = partsTotal + (parseFloat(laborCost) || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Technician Workbench</h2>
          <p className="text-xs text-slate-500">
            Assigned vehicles for inspection, diagnostic estimates, and workshop repairs.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-xs">
          {assignedJobs.length} Assigned Jobs
        </span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
          Loading assigned work orders...
        </div>
      ) : assignedJobs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
          No vehicles currently assigned to your workbench.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {assignedJobs.map((b) => {
            const hasOpenQcIssues = b.qcIssues?.some((q) => q.status === 'OPEN');
            const openIssue = b.qcIssues?.find((q) => q.status === 'OPEN');

            return (
              <div
                key={b.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #{b.reference}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">
                        Slot: <strong>{b.bookingDate} {b.bookingTime}</strong>
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-0.5">
                      {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono">
                      Plate: <strong className="text-slate-800">{b.vehicle.registrationPlate}</strong>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      hasOpenQcIssues
                        ? 'bg-rose-100 text-rose-800 animate-pulse'
                        : b.status === 'IN_REPAIR'
                        ? 'bg-blue-100 text-blue-800'
                        : b.status === 'INSPECTING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {hasOpenQcIssues ? 'QC FAILED - REPAIR NEEDED' : b.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* QC FAILURE LOOP ALERT BOX */}
                {hasOpenQcIssues && openIssue && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2 animate-in fade-in">
                    <div className="flex items-center space-x-2 text-rose-700 font-bold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>QC Inspector Reported Issue: "{openIssue.title}"</span>
                    </div>
                    <p className="text-rose-800 pl-6">{openIssue.description}</p>
                    <div className="pl-6 pt-1 text-[11px] text-rose-600 font-medium">
                      Action required: Rectify the reported fault and resubmit vehicle to QC queue when resolved.
                    </div>
                  </div>
                )}

                {/* Vehicle & Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">
                      Customer Reported Problem
                    </span>
                    <p className="text-slate-800 font-medium italic mt-0.5">"{b.reportedProblem}"</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">
                      Vehicle Telemetry
                    </span>
                    <p className="text-slate-800 mt-0.5">
                      Color: {b.vehicle.color || 'Standard'} • Mileage: {b.vehicle.mileage?.toLocaleString() || 'N/A'} km
                    </p>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                  {/* Step 3: ASSIGNED -> START INSPECTION */}
                  {b.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleStartInspection(b)}
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all flex items-center space-x-1.5"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Start Diagnostic Inspection</span>
                    </button>
                  )}

                  {/* Step 4: INSPECTING or ESTIMATE_REJECTED -> CREATE ESTIMATE */}
                  {(b.status === 'INSPECTING' || b.status === 'ESTIMATE_REJECTED') && (
                    <button
                      onClick={() => setSelectedBookingForEstimate(b)}
                      className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-all flex items-center space-x-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Create & Submit Cost Estimate</span>
                    </button>
                  )}

                  {/* Step 11: IN_REPAIR -> PERFORM REPAIR -> SEND TO QC */}
                  {b.status === 'IN_REPAIR' && (
                    <button
                      onClick={() => handleSendToQC(b)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Repair Complete → Send to Quality Control (QC)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE & SUBMIT ESTIMATE */}
      {selectedBookingForEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Vehicle Diagnostic Estimate
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Vehicle: {selectedBookingForEstimate.vehicle.make} {selectedBookingForEstimate.vehicle.model} ({selectedBookingForEstimate.vehicle.registrationPlate})
            </p>

            {/* Line Items Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Required Replacement Parts
                </span>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {lineItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap sm:flex-nowrap gap-2 items-center text-xs">
                  <div className="flex-1 min-w-[150px]">
                    <input
                      type="text"
                      placeholder="Part name (e.g. Ignition Coil)"
                      value={item.partName}
                      onChange={(e) => handleLineItemChange(idx, 'partName', e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-center"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitCost}
                      onChange={(e) => handleLineItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-right font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Labor Cost */}
              <div className="pt-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Workshop Labour Cost (PKR):
                </label>
                <input
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              {/* Total Summary */}
              <div className="mt-4 p-4 rounded-2xl bg-brand-50/70 border border-brand-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-600 block">Parts: PKR {partsTotal.toLocaleString()}</span>
                  <span className="text-slate-600 block">Labour: PKR {(parseFloat(laborCost) || 0).toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-brand-700 font-bold">Total Estimate</span>
                  <div className="text-xl font-black font-mono text-brand-900">
                    PKR {grandTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBookingForEstimate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitEstimate}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 flex items-center space-x-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Submit Estimate to SA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
