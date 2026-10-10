import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  Bell,
  Building2,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Check,
  Phone,
  Clock,
  Sparkles,
  Menu,
  X,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenAiFrontDesk?: () => void }> = ({ onOpenAiFrontDesk }) => {
  const {
    user,
    logout,
    currentShop,
    shops,
    setCurrentShop,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    currentRole,
  } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(`/#${sectionId}`);
    // Delay scroll slightly if navigating from another page
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const navLinks = [
    { label: 'Home', action: () => { setMobileMenuOpen(false); if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); else navigate('/'); } },
    { label: 'Our Services', action: () => handleNavClick('services') },
    { label: 'How It Works', action: () => handleNavClick('how-it-works') },
    { label: 'Our Partners', action: () => handleNavClick('partners') },
    { label: 'Workshops', action: () => handleNavClick('shops-section') },
  ];

  return (
    <header className="sticky top-0 z-40 shadow-md">
      {/* Top Utility Bar (Styled like Autorizen reference) */}
      <div className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>Call Us Now: <strong className="text-slate-900">+1 (555) 987-4643</strong> / <strong className="text-slate-900">+92 (51) 800-FLOW</strong></span>
            </div>
            <div className="flex items-center space-x-2 text-slate-500">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Opening Hours: <strong>Mon - Sat: 08:00 - 19:00</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>100% Certified Multi-Tenant Network</span>
            </span>
            <div className="flex items-center space-x-3 text-slate-400 pl-2 border-l border-slate-200">
              <a href="#facebook" className="hover:text-blue-600 transition-colors" title="Facebook"><Facebook className="w-3.5 h-3.5" /></a>
              <a href="#twitter" className="hover:text-blue-500 transition-colors" title="Twitter"><Twitter className="w-3.5 h-3.5" /></a>
              <a href="#instagram" className="hover:text-rose-500 transition-colors" title="Instagram"><Instagram className="w-3.5 h-3.5" /></a>
              <a href="#youtube" className="hover:text-red-600 transition-colors" title="YouTube"><Youtube className="w-3.5 h-3.5" /></a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar (Deep Navy Theme matching Reference Image) */}
      <div className="bg-[#0B1E48] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform border border-blue-400/30">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1">
                    <span className="text-2xl font-black tracking-tight text-white">
                      Bay<span className="text-blue-400">Flow</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 hidden sm:inline-block">
                      SaaS
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 -mt-0.5">
                    Multi-Tenant Auto Platform
                  </span>
                </div>
              </Link>

              {/* Shop Switcher (Tenant isolation / multi-shop selector) */}
              {shops.length > 0 && (
                <div className="relative hidden lg:block">
                  <button
                    onClick={() => setShowShopDropdown(!showShopDropdown)}
                    className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border border-blue-900/60 bg-blue-950/60 hover:bg-blue-900/40 text-xs font-medium text-slate-200 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-white truncate max-w-[140px]">
                      {currentShop?.name || 'Select Workshop'}
                    </span>
                    <span className="text-blue-300 text-[11px]">({currentShop?.city})</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {showShopDropdown && (
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95">
                      <div className="px-3.5 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                        <span>Select Workshop Tenant</span>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">Isolated DB</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                        {shops.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setCurrentShop(s);
                              setShowShopDropdown(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-blue-50/60 transition-colors ${
                              currentShop?.id === s.id ? 'bg-blue-50/90 text-blue-800 font-semibold' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-900">{s.name}</div>
                              <div className="text-[11px] text-slate-500">{s.city} • {s.workingHours}</div>
                            </div>
                            {currentShop?.id === s.id && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="px-3 py-2 text-sm font-semibold text-slate-200 hover:text-white hover:bg-blue-900/50 rounded-lg transition-all"
                >
                  {item.label}
                </button>
              ))}

              {/* AI Front Desk Modal trigger button */}
              {onOpenAiFrontDesk && (
                <button
                  onClick={onOpenAiFrontDesk}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-cyan-200 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-lg transition-colors shadow-sm ml-1"
                  title="Test AI Front Desk Voice Receptionist"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>AI Front Desk</span>
                </button>
              )}
            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  {user.role === 'CUSTOMER' ? (
                    <Link
                      to="/portal"
                      className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md shadow-blue-600/30"
                    >
                      Customer Portal
                    </Link>
                  ) : (
                    <Link
                      to="/pos"
                      className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center space-x-1"
                    >
                      <span>Shop POS</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}

                  {/* Notifications Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-blue-900/60 relative transition-colors"
                      aria-label="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                          <div className="font-bold text-sm text-slate-900">Notifications</div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllNotificationsRead}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-xs text-slate-400">
                              No notifications right now.
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={() => markNotificationRead(n.id)}
                                className={`px-4 py-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                                  !n.isRead ? 'bg-blue-50/50 border-l-2 border-blue-600' : ''
                                }`}
                              >
                                <div className="font-semibold text-slate-800">{n.title}</div>
                                <div className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">
                                  {n.message}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                  {new Date(n.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Profile / Logout */}
                  <div className="flex items-center space-x-2 pl-2 border-l border-blue-900/60">
                    <div className="text-right hidden xl:block">
                      <div className="text-xs font-bold text-white leading-tight">
                        {user.name}
                      </div>
                      <div className="text-[10px] text-blue-300 font-mono">
                        {currentRole || user.role}
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      className="p-2 text-slate-300 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-blue-900/60 rounded-lg transition-colors hidden sm:inline-block"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/book"
                    className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 transition-all flex items-center space-x-1.5"
                  >
                    <span>Book Service</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-blue-900/60"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#071533] border-t border-blue-900/60 px-4 pt-3 pb-6 space-y-2 animate-in fade-in slide-in-from-top-2">
            {navLinks.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-200 hover:text-white hover:bg-blue-900/40 rounded-lg transition-colors"
              >
                {item.label}
              </button>
            ))}

            {onOpenAiFrontDesk && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAiFrontDesk();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2.5 text-sm font-bold text-cyan-300 bg-cyan-950/60 rounded-lg"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>AI Front Desk Voice Receptionist</span>
              </button>
            )}

            {!user && (
              <div className="pt-3 border-t border-blue-900/60 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-semibold text-slate-200 bg-blue-950 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register-owner"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-bold text-blue-200 border border-blue-700/50 rounded-lg"
                >
                  Register Workshop Tenant
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
