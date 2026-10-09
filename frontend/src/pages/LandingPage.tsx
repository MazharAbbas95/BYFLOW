import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shop } from '../types';
import {
  Wrench,
  Search,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  CheckCircle,
  Car,
  ArrowRight,
  Phone,
  Sparkles,
  FileText,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { shops, setCurrentShop } = useAuth();
  const [selectedCity, setSelectedCity] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [plateSearch, setPlateSearch] = useState('');
  const [vehicleHistory, setVehicleHistory] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const navigate = useNavigate();

  const cities = ['All', 'Lahore', 'Karachi', 'Islamabad'];

  const filteredShops = shops.filter((shop) => {
    const matchesCity = selectedCity === 'All' || shop.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesSearch =
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  const handleLookupHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateSearch.trim()) return;
    setHistoryLoading(true);
    setHistoryError('');
    setVehicleHistory(null);
    try {
      const res = await api.get(`/vehicles/${encodeURIComponent(plateSearch.trim())}/history`);
      setVehicleHistory(res.data.vehicle);
    } catch (err: any) {
      setHistoryError(err.message || 'No records found for this registration number.');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Multi-Tenant Auto Repair OS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Independent Auto Care,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-300">
              Zero Information Loss.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            From online booking to precision diagnostics, transparent customer estimate approvals,
            live parts allocation, and certified Quality Control.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/book"
              className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-sm text-white shadow-lg shadow-brand-500/30 transition-all hover:scale-105 flex items-center space-x-2"
            >
              <span>Book a Service Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#shops-section"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm text-slate-200 border border-slate-700 transition-colors"
            >
              Explore Verified Garages
            </a>
          </div>

          {/* Value Props Bar */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 text-brand-400 mb-2" />
              <div className="text-sm font-bold">100% Tenant Isolation</div>
              <div className="text-xs text-slate-400 mt-0.5">Strict per-shop data security & roles</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-sm font-bold">Audit State Machine</div>
              <div className="text-xs text-slate-400 mt-0.5">Role-guarded step-by-step workflow</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
              <Phone className="w-5 h-5 text-amber-400 mb-2" />
              <div className="text-sm font-bold">In-App WebRTC Calling</div>
              <div className="text-xs text-slate-400 mt-0.5">Direct browser calling with advisor</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-violet-400 mb-2" />
              <div className="text-sm font-bold">AI Voice Front Desk</div>
              <div className="text-xs text-slate-400 mt-0.5">Live tool lookup & task logging</div>
            </div>
          </div>
        </div>
      </section>

      {/* Plate Search / Vehicle Service History Lookup Tool */}
      <section className="max-w-4xl mx-auto -mt-10 px-4 w-full relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <Car className="w-4 h-4 text-brand-600" />
            <span>Public Vehicle Maintenance History Lookup</span>
          </div>
          <form onSubmit={handleLookupHistory} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter License Plate (e.g. LEA-1234, KHI-7890)..."
                value={plateSearch}
                onChange={(e) => setPlateSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={historyLoading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{historyLoading ? 'Checking...' : 'Check History'}</span>
            </button>
          </form>

          {historyError && (
            <p className="mt-3 text-xs text-rose-600 font-medium">{historyError}</p>
          )}

          {vehicleHistory && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs animate-in fade-in">
              <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {vehicleHistory.year} {vehicleHistory.make} {vehicleHistory.model}
                  </h4>
                  <p className="font-mono text-slate-500">Plate: {vehicleHistory.registrationPlate}</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-brand-100 text-brand-800 font-bold">
                  {vehicleHistory.bookings?.length || 0} Records Found
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {vehicleHistory.bookings?.map((b: any) => (
                  <div key={b.id} className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{b.reportedProblem}</div>
                      <div className="text-[11px] text-slate-500">{b.shop?.name} • {b.bookingDate}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Verified Garages Directory */}
      <section id="shops-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Verified Auto Repair Workshops
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Select a certified garage to check live appointment slot availability and book instantly.
            </p>
          </div>

          {/* City Filter Pills & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-200/80 p-1 rounded-xl">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedCity === city
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search shops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
              />
            </div>
          </div>
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredShops.map((shop) => (
            <div
              key={shop.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-brand-500 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{shop.rating.toFixed(1)}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-4 group-hover:text-brand-600 transition-colors">
                  {shop.name}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{shop.address}, {shop.city}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Open {shop.workingHours}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Car className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Slot Capacity: {shop.slotCapacity} vehicles / hour</span>
                  </div>
                </div>

                {/* Services Pills */}
                {shop.services && shop.services.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {shop.services.slice(0, 3).map((srv) => (
                      <span
                        key={srv.id}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
                      >
                        {srv.name}
                      </span>
                    ))}
                    {shop.services.length > 3 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[11px]">
                        +{shop.services.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentShop(shop);
                    navigate(`/book?shopId=${shop.id}`);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-brand-600 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-white font-bold">
            <Wrench className="w-4 h-4 text-brand-400" />
            <span>BayFlow Multi-Tenant Automotive Platform</span>
          </div>
          <div>Pakistan Auto Hackathon 2026 • Production Edition</div>
        </div>
      </footer>
    </div>
  );
};
