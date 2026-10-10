import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  Bell,
  LogOut,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenAiFrontDesk?: () => void }> = ({ onOpenAiFrontDesk }) => {
  const {
    user,
    logout,
    currentShop,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    currentRole,
  } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
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

            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {user ? (
                <>
                  {user.role === 'CUSTOMER' ? (
                    <Link
                      to="/portal"
                      className="px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md shadow-blue-600/30 whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">Customer Portal</span>
                      <span className="sm:hidden">Portal</span>
                    </Link>
                  ) : (
                    <Link
                      to="/pos"
                      className="px-3 py-2 text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center space-x-1 whitespace-nowrap"
                    >
                      {/* Short label on mobile, full label on sm+ */}
                      <span className="hidden sm:inline">
                        {user.role === 'OWNER'
                          ? 'Owner Console'
                          : currentRole === 'TECHNICIAN'
                          ? 'Technician'
                          : currentRole === 'SERVICE_ADVISOR'
                          ? 'Advisor'
                          : currentRole === 'QC_INSPECTOR'
                          ? 'QC'
                          : currentRole === 'PARTS_PERSON'
                          ? 'Parts'
                          : 'Terminal'}
                      </span>
                      <span className="sm:hidden">POS</span>
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

                    {/* Notification Panel — fixed fullscreen on mobile, dropdown on sm+ */}
                    {showNotifications && (
                      <>
                        {/* Mobile backdrop */}
                        <div
                          className="fixed inset-0 bg-black/40 z-40 sm:hidden"
                          onClick={() => setShowNotifications(false)}
                        />
                        {/* Panel */}
                        <div className="
                          fixed bottom-0 left-0 right-0 z-50
                          sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2
                          w-full sm:w-80 md:w-96
                          max-h-[75vh] sm:max-h-[28rem]
                          bg-white text-slate-800 rounded-t-3xl sm:rounded-2xl
                          shadow-2xl border border-slate-200
                          flex flex-col
                          animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-2 sm:zoom-in-95
                        ">
                          {/* Header */}
                          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                            <div className="font-bold text-sm text-slate-900">Notifications</div>
                            <div className="flex items-center gap-3">
                              {unreadCount > 0 && (
                                <button
                                  onClick={markAllNotificationsRead}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                >
                                  Mark all read
                                </button>
                              )}
                              <button
                                onClick={() => setShowNotifications(false)}
                                className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {/* List */}
                          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                            {notifications.length === 0 ? (
                              <div className="px-4 py-12 text-center text-xs text-slate-400">
                                No notifications right now.
                              </div>
                            ) : (
                              notifications.map((n) => (
                                <div
                                  key={n.id}
                                  onClick={() => markNotificationRead(n.id)}
                                  className={`px-4 py-3.5 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                                    !n.isRead ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''
                                  }`}
                                >
                                  <div className="font-semibold text-slate-800 text-sm">{n.title}</div>
                                  <div className="text-slate-600 text-xs mt-0.5 line-clamp-2">
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
                          {/* Mobile safe area spacer */}
                          <div className="h-safe-area-inset-bottom sm:hidden flex-shrink-0 pb-4" />
                        </div>
                      </>
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
