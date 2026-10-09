import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  Bell,
  Building2,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Check,
  PhoneCall,
  Sparkles,
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
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                  Bay<span className="text-brand-600">Flow</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1">
                  Auto POS & Portal
                </span>
              </div>
            </Link>

            {/* Shop Switcher (Tenant isolation / multi-shop selector) */}
            {shops.length > 0 && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowShopDropdown(!showShopDropdown)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-brand-600" />
                  <span className="font-semibold text-slate-900">
                    {currentShop?.name || 'Select Shop'}
                  </span>
                  <span className="text-slate-400 text-[11px]">({currentShop?.city})</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showShopDropdown && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Switch Shop (Tenant)
                    </div>
                    {shops.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setCurrentShop(s);
                          setShowShopDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          currentShop?.id === s.id ? 'bg-brand-50/70 text-brand-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-500">{s.city} • {s.workingHours}</div>
                        </div>
                        {currentShop?.id === s.id && <Check className="w-4 h-4 text-brand-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-2 sm:space-x-3">
            <Link
              to="/"
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Browse Shops
            </Link>

            <Link
              to="/book"
              className="px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            >
              Book Service
            </Link>

            {/* AI Front Desk Modal trigger button */}
            {onOpenAiFrontDesk && (
              <button
                onClick={onOpenAiFrontDesk}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors shadow-sm"
                title="Test AI Front Desk Voice Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                <span className="hidden sm:inline">AI Front Desk</span>
              </button>
            )}

            {user ? (
              <>
                {user.role === 'CUSTOMER' ? (
                  <Link
                    to="/portal"
                    className="px-3 py-1.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Customer Portal
                  </Link>
                ) : (
                  <Link
                    to="/pos"
                    className="px-3 py-1.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shadow-brand-600/30 transition-colors"
                  >
                    Shop POS
                  </Link>
                )}

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 relative transition-colors"
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
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <div className="font-bold text-sm text-slate-900">Notifications</div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllNotificationsRead}
                            className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
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
                                !n.isRead ? 'bg-brand-50/40 border-l-2 border-brand-500' : ''
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

                {/* User menu / Logout */}
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                  <div className="text-right hidden md:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {currentRole || user.role}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register-owner"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
                >
                  Register Shop
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
