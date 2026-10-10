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
  ChevronDown,
} from 'lucide-react';

const ROLE_VIEWS = [
  { key: null,              label: 'Owner Console',   icon: Shield,       color: 'amber' },
  { key: 'SERVICE_ADVISOR', label: 'Service Advisor', icon: UserCheck,    color: 'blue'  },
  { key: 'TECHNICIAN',      label: 'Technician',      icon: Wrench,       color: 'blue'  },
  { key: 'PARTS_PERSON',    label: 'Parts Counter',   icon: Package,      color: 'blue'  },
  { key: 'QC_INSPECTOR',    label: 'QC Portal',       icon: CheckCircle2, color: 'blue'  },
];

export const ShopPOS: React.FC = () => {
  const { user, currentShop, currentRole } = useAuth();
  const [supportRoleOverride, setSupportRoleOverride] = useState<string | null>(null);
  const [mobileRoleOpen, setMobileRoleOpen] = useState(false);

  const isOwner = user?.role === 'OWNER';

  const activeRole = isOwner && supportRoleOverride
    ? supportRoleOverride
    : (currentRole || user?.memberships?.[0]?.role || 'TECHNICIAN');

  const activeRoleLabel = ROLE_VIEWS.find(
    (r) => r.key === (isOwner ? supportRoleOverride : null) || r.key === activeRole
  )?.label ?? activeRole.replace(/_/g, ' ');

  /* ── Not logged in ── */
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

  /* ── Customer trying to access POS ── */
  if (user.role === 'CUSTOMER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-md shadow-xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Customer Account Detected</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            You are signed in as a vehicle owner. Your work orders and estimates are managed through the Customer Tracking Portal.
          </p>
          <a
            href="/portal"
            className="inline-block mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Go to Customer Tracking Portal
          </a>
        </div>
      </div>
    );
  }

  /* ── Main POS ── */
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* ═══ POS HEADER BANNER ═══ */}
        <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-800 overflow-hidden">

          {/* Top strip — shop + role badge */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
              <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-none">
                {currentShop?.name || 'Workshop'} • {currentShop?.city}
              </span>
            </span>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
              isOwner ? 'bg-amber-400 text-slate-950' : 'bg-blue-600 text-white'
            }`}>
              {isOwner ? <Shield className="w-3 h-3 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
              <span className="truncate">
                {isOwner ? 'Shop Owner' : (currentRole || '').replace(/_/g, ' ')}
              </span>
            </span>
          </div>

          {/* Title row */}
          <div className="px-4 sm:px-6 pt-2 pb-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
              {activeRole === 'OWNER'          && 'Shop Owner Management Console'}
              {activeRole === 'SERVICE_ADVISOR' && 'Service Advisor Terminal'}
              {activeRole === 'TECHNICIAN'      && 'Technician Workshop Terminal'}
              {activeRole === 'QC_INSPECTOR'    && 'Quality Control Portal'}
              {activeRole === 'PARTS_PERSON'    && 'Parts & Inventory Counter'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 truncate">
              Staff: <strong className="text-white">{user.name}</strong>
              {isOwner
                ? <span className="text-amber-300 ml-1">(Owner Authority)</span>
                : <span className="text-emerald-400 ml-1">· Scoped to {activeRole.replace(/_/g, ' ')}</span>
              }
            </p>
          </div>

          {/* ── OWNER: Role Switcher ── */}
          {isOwner && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3">
              {/* Mobile: dropdown */}
              <div className="sm:hidden">
                <div className="flex items-center gap-1.5 mb-2">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Owner Multi-Screen Switcher
                  </span>
                </div>
                <button
                  onClick={() => setMobileRoleOpen(!mobileRoleOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white"
                >
                  <span>{supportRoleOverride
                    ? ROLE_VIEWS.find(r => r.key === supportRoleOverride)?.label
                    : 'Owner Console'
                  }</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mobileRoleOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileRoleOpen && (
                  <div className="mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    {ROLE_VIEWS.map((rv) => (
                      <button
                        key={String(rv.key)}
                        onClick={() => { setSupportRoleOverride(rv.key); setMobileRoleOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b border-slate-700/50 last:border-0 transition-colors ${
                          supportRoleOverride === rv.key
                            ? 'bg-amber-400 text-slate-950'
                            : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <rv.icon className="w-4 h-4 shrink-0" />
                        {rv.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop: pill buttons */}
              <div className="hidden sm:flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Owner Multi-Screen Switcher:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 w-fit">
                  {ROLE_VIEWS.map((rv) => (
                    <button
                      key={String(rv.key)}
                      onClick={() => setSupportRoleOverride(rv.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        supportRoleOverride === rv.key
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : rv.key === null && !supportRoleOverride
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <rv.icon className="w-3.5 h-3.5" />
                      {rv.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── NON-OWNER: Permission badge ── */}
          {!isOwner && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-5">
              <div className="inline-flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 text-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                    Permission Level
                  </span>
                  <span className="text-white font-black">
                    {(currentRole || '').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ DYNAMIC ROLE VIEW ═══ */}
        <div>
          {activeRole === 'OWNER'          && <OwnerView onSelectSupportRole={(role) => setSupportRoleOverride(role)} />}
          {activeRole === 'SERVICE_ADVISOR' && <ServiceAdvisorView />}
          {activeRole === 'TECHNICIAN'      && <TechnicianView />}
          {activeRole === 'QC_INSPECTOR'    && <QCInspectorView />}
          {activeRole === 'PARTS_PERSON'    && <PartsPersonView />}
        </div>
      </div>
    </div>
  );
};
