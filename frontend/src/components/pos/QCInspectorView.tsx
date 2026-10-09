import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Booking } from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Check,
  X,
  FileCheck,
  Car,
  AlertCircle,
} from 'lucide-react';

export const QCInspectorView: React.FC = () => {
  const { currentShop, user } = useAuth();
  const [qcQueue, setQcQueue] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inspection modal state
  const [inspectingBooking, setInspectingBooking] = useState<Booking | null>(null);
  const [checklist, setChecklist] = useState({
    engineIdle: true,
    oilSeals: false, // default unchecked to allow demonstrating QC fail easily!
    brakeResponse: true,
    roadTest: true,
    obdClear: true,
  });
  const [checklistNotes, setChecklistNotes] = useState('Road test completed. Engine idle steady.');
  const [showFailForm, setShowFailForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState('Minor oil leak at the filter');
  const [issueDescription, setIssueDescription] = useState('Oil seepage detected around filter seal during road test.');

  const loadQueue = async () => {
    if (!currentShop) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/qc/${currentShop.id}/qc-queue`);
      setQcQueue(res.data.queue || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [currentShop]);

  const handlePickJob = async (booking: Booking) => {
    try {
      await api.post(`/qc/bookings/${booking.id}/pick`);
      loadQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePassInspection = async () => {
    if (!inspectingBooking) return;
    try {
      await api.post(`/qc/bookings/${inspectingBooking.id}/review`, {
        passed: true,
        checklistNotes,
      });
      alert('Quality Control PASSED! Vehicle moved to READY_FOR_PICKUP.');
      setInspectingBooking(null);
      loadQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFailInspection = async () => {
    if (!inspectingBooking) return;
    if (!issueTitle || !issueDescription) {
      alert('Please provide an issue title and description for the technician.');
      return;
    }
    try {
      await api.post(`/qc/bookings/${inspectingBooking.id}/review`, {
        passed: false,
        issueTitle,
        issueDescription,
      });
      alert('QC Inspection Failed! Issue logged and job returned to technician in IN_REPAIR.');
      setInspectingBooking(null);
      setShowFailForm(false);
      loadQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Shared Quality Control Queue</h2>
          <p className="text-xs text-slate-500">
            Vehicles awaiting multi-point safety testing, road test verification, and quality certification.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
          {qcQueue.length} In Queue
        </span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
          Loading QC queue...
        </div>
      ) : qcQueue.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
          All vehicles have been inspected! Queue is clear.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {qcQueue.map((b) => {
            const isLockedByMe = b.qcInspectorId === user?.id;
            const isLockedByOther = b.qcInspectorId && b.qcInspectorId !== user?.id && b.status === 'QC_IN_PROGRESS';

            return (
              <div
                key={b.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4"
              >
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
                      Plate: <strong className="text-slate-800">{b.vehicle.registrationPlate}</strong> • Mechanic: {b.technician?.name || 'Assigned'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        b.status === 'QC_IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">
                      Repairs Performed by Technician
                    </span>
                    <p className="text-slate-800 font-medium italic mt-0.5">"{b.reportedProblem}"</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">
                      QC Inspector Status
                    </span>
                    <p className="text-slate-800 mt-0.5">
                      {b.qcInspector ? (
                        <span>Claimed by: <strong>{b.qcInspector.name}</strong></span>
                      ) : (
                        <span className="text-amber-600 font-semibold">Available for claiming (Unclaimed)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-2 flex justify-end items-center gap-3">
                  {b.status === 'QC_PENDING' && (
                    <button
                      onClick={() => handlePickJob(b)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Claim & Lock Inspection</span>
                    </button>
                  )}

                  {b.status === 'QC_IN_PROGRESS' && isLockedByMe && (
                    <button
                      onClick={() => setInspectingBooking(b)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center space-x-1.5"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Conduct Inspection Checklist</span>
                    </button>
                  )}

                  {isLockedByOther && (
                    <span className="text-xs text-slate-400 italic">
                      Locked by another inspector ({b.qcInspector?.name})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CONDUCT QC INSPECTION */}
      {inspectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Quality Assurance Testing
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Vehicle: {inspectingBooking.vehicle.make} {inspectingBooking.vehicle.model} ({inspectingBooking.vehicle.registrationPlate})
            </p>

            {/* Safety Checklist */}
            <div className="space-y-3 mb-6">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Standard QC Checklist
              </span>

              <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={checklist.engineIdle}
                  onChange={(e) => setChecklist({ ...checklist, engineIdle: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Engine idle smoothness & vibration check</span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={checklist.oilSeals}
                  onChange={(e) => setChecklist({ ...checklist, oilSeals: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Oil filter seal & fluid leaks inspection</span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={checklist.brakeResponse}
                  onChange={(e) => setChecklist({ ...checklist, brakeResponse: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Brake responsiveness & hydraulic pressure test</span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={checklist.roadTest}
                  onChange={(e) => setChecklist({ ...checklist, roadTest: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">10 km dynamic road test</span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={checklist.obdClear}
                  onChange={(e) => setChecklist({ ...checklist, obdClear: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">OBD-II error codes cleared & no fault lamps</span>
              </label>
            </div>

            {/* Checklist Notes */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                QC Inspector Notes & Road Test Observations:
              </label>
              <textarea
                rows={2}
                value={checklistNotes}
                onChange={(e) => setChecklistNotes(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            {/* QC FAIL FORM IF TRIGGERED */}
            {showFailForm ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-3 mb-6 animate-in fade-in">
                <div className="flex items-center space-x-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Report Quality Issue (Returns Job to Technician)</span>
                </div>
                <div>
                  <label className="block font-bold text-rose-700 mb-1">Issue Title:</label>
                  <input
                    type="text"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="e.g. Minor oil leak at filter"
                    className="w-full p-2 bg-white border border-rose-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-rose-700 mb-1">Description & Rectification Instructions:</label>
                  <textarea
                    rows={2}
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Describe defect in detail..."
                    className="w-full p-2 bg-white border border-rose-200 rounded-xl text-xs"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFailForm(false)}
                    className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFailInspection}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    Submit Failure & Return Job
                  </button>
                </div>
              </div>
            ) : null}

            {/* Modal Bottom Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>

              <div className="flex space-x-2">
                {!showFailForm && (
                  <button
                    type="button"
                    onClick={() => setShowFailForm(true)}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Report Defect (Fail)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePassInspection}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Pass Quality Testing (READY_FOR_PICKUP)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
