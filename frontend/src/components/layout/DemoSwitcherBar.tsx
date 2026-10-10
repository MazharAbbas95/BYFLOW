import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Shield, Wrench, CheckCircle2, Package, Car, Lock, LogOut } from 'lucide-react';

export const DemoSwitcherBar: React.FC = () => {
  const { user, switchDemoUser, currentRole, isLoading, currentShop, logout } = useAuth();

  const isOwner = user?.role === 'OWNER';

  const demoAccounts = [
    {
      role: 'Owner',
      name: 'Fatima',
      email: 'fatima@lahoreauto.pk',
      icon: Shield,
      bg: 'hover:bg-amber-500/10 text-amber-600 border-amber-300',
      activeBg: 'bg-amber-500 text-white border-amber-600 shadow-sm',
    },
    {
      role: 'Service Advisor',
      name: 'Bilal (SA)',
      email: 'bilal@lahoreauto.pk',
      icon: UserCheck,
      bg: 'hover:bg-blue-500/10 text-blue-600 border-blue-300',
      activeBg: 'bg-blue-600 text-white border-blue-700 shadow-sm',
    },
    {
      role: 'Technician',
      name: 'Imran (Tech)',
      email: 'imran@lahoreauto.pk',
      icon: Wrench,
      bg: 'hover:bg-orange-500/10 text-orange-600 border-orange-300',
      activeBg: 'bg-orange-600 text-white border-orange-700 shadow-sm',
    },
    {
      role: 'QC Inspector',
      name: 'Sara (QC)',
      email: 'sara@lahoreauto.pk',
      icon: CheckCircle2,
      bg: 'hover:bg-emerald-500/10 text-emerald-600 border-emerald-300',
      activeBg: 'bg-emerald-600 text-white border-emerald-700 shadow-sm',
    },
    {
      role: 'Parts Person',
      name: 'Usman (Parts)',
      email: 'usman@lahoreauto.pk',
      icon: Package,
      bg: 'hover:bg-purple-500/10 text-purple-600 border-purple-300',
      activeBg: 'bg-purple-600 text-white border-purple-700 shadow-sm',
    },
    {
      role: 'Customer',
      name: 'Ahmed',
      email: 'ahmed@mail.com',
      icon: Car,
      bg: 'hover:bg-indigo-500/10 text-indigo-600 border-indigo-300',
      activeBg: 'bg-indigo-600 text-white border-indigo-700 shadow-sm',
    },
  ];

  // If a non-owner staff member or customer is logged in, hide the role switcher buttons so they cannot switch roles
  if (user && !isOwner) {
    return (
      <div className="bg-slate-900 border-b border-slate-800 text-white py-1.5 px-4 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              <Lock className="w-3 h-3 text-emerald-400 inline" />
              <span>Dedicated Staff Terminal</span>
            </span>
            <span className="text-slate-400 text-[11px]">
              Logged in as <strong className="text-white">{user.name}</strong> • Role in Company:{' '}
              <span className="px-2 py-0.5 rounded bg-brand-900 text-brand-300 font-bold uppercase text-[10px]">
                {(currentRole || user.role).replace(/_/g, ' ')}
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-slate-400 hidden sm:inline">
              Tenant: <strong className="text-slate-300">{currentShop?.name || 'Workshop'}</strong>
            </span>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Shop Owner or Unauthenticated visitor sees full sandbox role switcher
  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white py-2 px-4 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider">
            {isOwner ? 'Owner Master Switcher' : 'Demo Sandbox'}
          </span>
          <span className="text-slate-300 font-medium hidden sm:inline">
            {isOwner ? 'Inspect Any Staff Role View:' : 'Quick Sign-In Accounts:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {demoAccounts.map((acc) => {
            const Icon = acc.icon;
            const isActive = user?.email === acc.email;

            return (
              <button
                key={acc.email}
                disabled={isLoading}
                onClick={() => switchDemoUser(acc.email)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all font-medium ${
                  isActive
                    ? acc.activeBg
                    : `bg-slate-800 text-slate-300 border-slate-700 ${acc.bg}`
                }`}
                title={`Switch session to ${acc.name} (${acc.role})`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{acc.name}</span>
                <span className="opacity-75 text-[10px]">({acc.role})</span>
              </button>
            );
          })}
        </div>

        {user && (
          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <span>Signed in:</span>
            <span className="text-white font-semibold underline decoration-slate-600">
              {user.name}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase text-[10px] font-mono font-bold">
              {isOwner ? 'Shop Owner' : currentRole || user.role}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
