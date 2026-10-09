import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ServiceAdvisorView } from '../components/pos/ServiceAdvisorView';
import { TechnicianView } from '../components/pos/TechnicianView';
import { QCInspectorView } from '../components/pos/QCInspectorView';
import { PartsPersonView } from '../components/pos/PartsPersonView';
import { OwnerView } from '../components/pos/OwnerView';
import {
  Wrench,
  Shield,
  UserCheck,
  CheckCircle2,
  Package,
  Eye,
  AlertCircle,
  Building2,
} from 'lucide-react';

export const ShopPOS: React.FC = () => {
  const { user, currentShop, currentRole } = useAuth();
  const [supportRoleOverride, setSupportRoleOverride] = useState<string | null>(null);

  // If user is OWNER and chose a support role, use that
  const activeRole = (user?.role === 'OWNER' && supportRoleOverride) ? supportRoleOverride : currentRole;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-900">Authentication Required</h3>
          <p className="text-xs text-slate-500 mt-1">
            Please sign in with a shop staff account or use the 1-Click Judge Role Switcher bar at the top!
          </p>
        </div>
      </div>
    );
  }

  if (user.role === 'CUSTOMER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-md">
          <Wrench className="w-8 h-8 text-brand-600 mx-auto mb-2" />
          <h3 className="font-bold text-slate-900">Customer Account Detected</h3>
          <p className="text-xs text-slate-500 mt-1">
            You are signed in as a vehicle owner. Please use the Customer Tracking Portal to monitor your bookings, or switch to a staff role using the top bar.
          </p>
          <a
            href="/portal"
            className="inline-block mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
          >
            Go to Customer Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* POS Header Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 mb-2">
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              <span>Workshop POS System • Tenant: {currentShop?.name} ({currentShop?.city})</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {activeRole === 'OWNER' && 'Shop Owner Management Console'}
              {activeRole === 'SERVICE_ADVISOR' && 'Service Advisor (Front Desk) POS'}
              {activeRole === 'TECHNICIAN' && 'Technician Workshop Terminal'}
              {activeRole === 'QC_INSPECTOR' && 'Quality Control & Inspection Portal'}
              {activeRole === 'PARTS_PERSON' && 'Parts & Inventory Counter'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active staff member: <strong className="text-white">{user.name}</strong> • Scoped role: <span className="font-mono uppercase text-brand-400">{activeRole}</span>
            </p>
          </div>

          {/* If Owner, provide quick support role toggle */}
          {user.role === 'OWNER' && (
            <div className="relative z-10 flex flex-col items-end">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Eye className="w-3.5 h-3.5 text-brand-400" />
                <span>Owner Role View:</span>
              </span>
              <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => setSupportRoleOverride(null)}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    !supportRoleOverride ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Owner
                </button>
                <button
                  onClick={() => setSupportRoleOverride('SERVICE_ADVISOR')}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    supportRoleOverride === 'SERVICE_ADVISOR' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SA
                </button>
                <button
                  onClick={() => setSupportRoleOverride('TECHNICIAN')}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    supportRoleOverride === 'TECHNICIAN' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tech
                </button>
                <button
                  onClick={() => setSupportRoleOverride('PARTS_PERSON')}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    supportRoleOverride === 'PARTS_PERSON' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Parts
                </button>
                <button
                  onClick={() => setSupportRoleOverride('QC_INSPECTOR')}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    supportRoleOverride === 'QC_INSPECTOR' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  QC
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Role-Based View */}
        <div>
          {activeRole === 'OWNER' && (
            <OwnerView onSelectSupportRole={(role) => setSupportRoleOverride(role)} />
          )}
          {activeRole === 'SERVICE_ADVISOR' && <ServiceAdvisorView />}
          {activeRole === 'TECHNICIAN' && <TechnicianView />}
          {activeRole === 'QC_INSPECTOR' && <QCInspectorView />}
          {activeRole === 'PARTS_PERSON' && <PartsPersonView />}
        </div>
      </div>
    </div>
  );
};
