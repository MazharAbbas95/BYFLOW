import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  UserCheck,
  CheckCircle2,
  Package,
  Car,
  AlertCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchDemoUser, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const loggedInUser: any = await login(email, password);
      if (loggedInUser?.role === 'CUSTOMER') {
        navigate('/portal');
      } else {
        navigate('/pos');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    }
  };

  const handleDemoClick = async (demoEmail: string, destination: string) => {
    try {
      await switchDemoUser(demoEmail);
      navigate(destination);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const demoAccounts = [
    { role: 'Shop Owner', name: 'Fatima Raza', email: 'fatima@lahoreauto.pk', dest: '/pos', icon: Shield, badge: 'Full multi-shop control' },
    { role: 'Service Advisor', name: 'Bilal Khan', email: 'bilal@lahoreauto.pk', dest: '/pos', icon: UserCheck, badge: 'Bookings, estimates, assign' },
    { role: 'Technician', name: 'Imran Malik', email: 'imran@lahoreauto.pk', dest: '/pos', icon: Wrench, badge: 'Inspections, estimates, repairs' },
    { role: 'QC Inspector', name: 'Sara Ahmed', email: 'sara@lahoreauto.pk', dest: '/pos', icon: CheckCircle2, badge: 'Shared QC queue, road testing' },
    { role: 'Parts Person', name: 'Usman Tariq', email: 'usman@lahoreauto.pk', dest: '/pos', icon: Package, badge: 'Stock, POs, allocation' },
    { role: 'Customer', name: 'Ahmed Khan', email: 'ahmed@mail.com', dest: '/portal', icon: Car, badge: 'Track vehicle, approve estimate' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Login Form */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center space-x-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Sign in to BayFlow</h2>
              <p className="text-xs text-slate-500">Universal Auto Repair Management Portal</p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@workshop.pk"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center space-x-2 mt-2"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Are you a workshop owner?{' '}
            <Link to="/register-owner" className="font-bold text-brand-600 hover:text-brand-700 underline">
              Register New Shop
            </Link>
          </div>
        </div>

        {/* Right: Demo Accounts 1-Click Fast Switcher for Judges */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl shadow-xl p-8 text-white border border-slate-800">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider mb-3">
            <span className="text-blue-400 font-bold">Enterprise Role Switcher</span>
          </div>

          <h3 className="text-xl font-extrabold text-white">1-Click Demo Accounts</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Click any seeded role account below to login instantly without typing passwords (default password: <code className="text-amber-300">password123</code>):
          </p>

          <div className="space-y-2.5">
            {demoAccounts.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.email}
                  disabled={isLoading}
                  onClick={() => handleDemoClick(acc.email, acc.dest)}
                  className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 hover:border-brand-500 text-left transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-700 text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                        {acc.name} <span className="opacity-75 font-normal">({acc.role})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{acc.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 px-2.5 py-1 rounded-lg text-slate-300 font-medium hidden sm:inline">
                    {acc.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
