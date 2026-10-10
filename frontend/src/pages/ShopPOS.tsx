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
  Lock,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export const ShopPOS: React.FC = () => {
  const { user, currentShop, currentRole } = useAuth();
  const [supportRoleOverride, setSupportRoleOverride] = useState<string | null>(null);

  const isOwner = user?.role === 'OWNER';

  // Only shop owner can override and switch between support roles
  const activeRole = isOwner && supportRoleOverride
    ? supportRoleOverride
    : (currentRole || user?.memberships?.[0]?.role || 'TECHNICIAN');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-sm shadow-xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Authentication Required</h3>
          <p className="text-xs text-slate-500">
            Please sign in with your workshop staff account to access your designated terminal.
          </p>
          <a
            href="/login"
            className="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 transition-colors"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  if (user.role === 'CUSTOMER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-md shadow-xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Customer Account Detected</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            You are signed in as a vehicle owner. Your work orders and estimates are managed through the Customer Tracking Portal.
          </p>
          <a
            href="/portal"
            className="inline-block mt-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Go to Customer Tracking Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* POS Header Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-800">
          <div className="relative z-10 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-brand-400" />
                <span>{currentShop?.name || 'Workshop'} • {currentShop?.city}</span>
              </span>

              {/* Strict Role in Company Badge */}
              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isOwner
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'bg-brand-600 text-white shadow-sm'
              }`}>
                {isOwner ? <Shield className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Role in Company: {isOwner ? 'Shop Owner' : (currentRole || '').replace(/_/g, ' ')}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white pt-1">
              {activeRole === 'OWNER' && 'Shop Owner Management Console'}
              {activeRole === 'SERVICE_ADVISOR' && 'Service Advisor (Front Desk) Terminal'}
              {activeRole === 'TECHNICIAN' && 'Technician Workshop Terminal'}
              {activeRole === 'QC_INSPECTOR' && 'Quality Control & Inspection Portal'}
              {activeRole === 'PARTS_PERSON' && 'Parts & Inventory Counter'}
            </h1>

            <p className="text-xs text-slate-400">
              Staff Member: <strong className="text-white">{user.name}</strong> •{' '}
              {isOwner ? (
                <span className="text-amber-300 font-semibold">
                  Full Multi-Screen Access (Owner Authority)
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex-inline items-center">
                  Dedicated Terminal • Scoped strictly to your {activeRole.replace(/_/g, ' ')} role
                </span>
              )}
            </p>
          </div>

          {/* SHOP OWNER EXCLUSIVE: MULTI-SCREEN SWITCHER */}
          {isOwner ? (
            <div className="relative z-10 flex flex-col items-start md:items-end bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1.5 flex items-center space-x-1">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Owner Multi-Screen Switcher:</span>
              </span>
              <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700/80 text-xs font-bold">
                <button
                  onClick={() => setSupportRoleOverride(null)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    !supportRoleOverride
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Owner Console
                </button>
                <button
                  onClick={() => setSupportRoleOverride('SERVICE_ADVISOR')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    supportRoleOverride === 'SERVICE_ADVISOR'
                      ? 'bg-brand-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Service Advisor
                </button>
                <button
                  onClick={() => setSupportRoleOverride('TECHNICIAN')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    supportRoleOverride === 'TECHNICIAN'
                      ? 'bg-brand-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Technician
                </button>
                <button
                  onClick={() => setSupportRoleOverride('PARTS_PERSON')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    supportRoleOverride === 'PARTS_PERSON'
                      ? 'bg-brand-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Parts Counter
                </button>
                <button
                  onClick={() => setSupportRoleOverride('QC_INSPECTOR')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    supportRoleOverride === 'QC_INSPECTOR'
                      ? 'bg-brand-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  QC Portal
                </button>
              </div>
            </div>
          ) : (
            /* NON-OWNER: STRICT ROLE LOCKED BADGE (NO SWITCHER) */
            <div className="relative z-10 flex items-center space-x-2 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700/60 text-xs self-start md:self-auto">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                  Company Permission Level
                </span>
                <span className="text-white font-black">
                  Staff Role: {(currentRole || '').replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Role-Based View */}
        <div>
          {/* 1. SHOP OWNER ONLY */}
          {activeRole === 'OWNER' && (
            <OwnerView onSelectSupportRole={(role) => setSupportRoleOverride(role)} />
          )}

          {/* 2. SERVICE ADVISOR ONLY (or Owner viewing as SA) */}
          {activeRole === 'SERVICE_ADVISOR' && <ServiceAdvisorView />}

          {/* 3. TECHNICIAN ONLY (or Owner viewing as Tech) */}
          {activeRole === 'TECHNICIAN' && <TechnicianView />}

          {/* 4. QC INSPECTOR ONLY (or Owner viewing as QC) */}
          {activeRole === 'QC_INSPECTOR' && <QCInspectorView />}

          {/* 5. PARTS PERSON ONLY (or Owner viewing as Parts) */}
          {activeRole === 'PARTS_PERSON' && <PartsPersonView />}
        </div>
      </div>
    </div>
  );
};
