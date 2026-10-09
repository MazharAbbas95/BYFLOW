import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Shop, ServiceItem } from '../../types';
import {
  Building2,
  Users,
  Wrench,
  TrendingUp,
  Plus,
  Shield,
  CheckCircle,
  Eye,
  Settings,
  Car,
} from 'lucide-react';

export const OwnerView: React.FC<{
  onSelectSupportRole?: (role: string) => void;
}> = ({ onSelectSupportRole }) => {
  const { currentShop, setCurrentShop, shops, user, refreshUserData } = useAuth();
  const [activeTab, setActiveTab] = useState<'METRICS' | 'TEAM' | 'SERVICES' | 'NEW_SHOP'>('METRICS');

  const [shopAnalytics, setShopAnalytics] = useState<any | null>(null);
  const [multiShopOverview, setMultiShopOverview] = useState<any | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Team Member Form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    password: 'password123',
    phone: '',
    role: 'TECHNICIAN',
  });

  // New Shop Form
  const [newShop, setNewShop] = useState({
    name: '',
    address: '',
    city: 'Lahore',
    phone: '+92 42 ',
    workingHours: '09:00 AM - 06:00 PM',
    slotCapacity: 3,
  });

  // New Service Form
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    estimatedDuration: 60,
    basePrice: 5000,
  });

  const loadData = async () => {
    if (!currentShop) return;
    setIsLoading(true);
    try {
      const [analyticsRes, ownerRes, membersRes, shopRes] = await Promise.all([
        api.get(`/analytics/shops/${currentShop.id}`),
        api.get('/analytics/owner/overview'),
        api.get(`/shops/${currentShop.id}/members`),
        api.get(`/shops/${currentShop.id}`),
      ]);

      setShopAnalytics(analyticsRes.data.analytics);
      setMultiShopOverview(ownerRes.data);
      setTeamMembers(membersRes.data.members || []);
      setServices(shopRes.data.shop?.services || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return;
    try {
      await api.post(`/shops/${currentShop.id}/members`, newMember);
      setShowAddMember(false);
      setNewMember({ name: '', email: '', password: 'password123', phone: '', role: 'TECHNICIAN' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleMember = async (memberId: string, currentActive: boolean) => {
    if (!currentShop) return;
    try {
      await api.put(`/shops/${currentShop.id}/members/${memberId}`, {
        isActive: !currentActive,
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/shops', newShop);
      alert(`New branch shop "${res.data.shop.name}" created successfully!`);
      setActiveTab('METRICS');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return;
    try {
      await api.post(`/shops/${currentShop.id}/services`, newService);
      setShowAddService(false);
      setNewService({ name: '', description: '', estimatedDuration: 60, basePrice: 5000 });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Tabs and Role Support preview */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('METRICS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'METRICS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Multi-Shop Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('TEAM')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'TEAM'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team & Access Control ({teamMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SERVICES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'SERVICES'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Service Catalog ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('NEW_SHOP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'NEW_SHOP'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-brand-700 hover:bg-brand-50 border border-brand-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Shop</span>
          </button>
        </div>

        {/* Owner Support Role Switcher */}
        {onSelectSupportRole && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-semibold hidden sm:inline">Owner Support Mode:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => onSelectSupportRole('SERVICE_ADVISOR')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-white transition-colors"
                title="Open SA view"
              >
                SA View
              </button>
              <button
                onClick={() => onSelectSupportRole('TECHNICIAN')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-white transition-colors"
                title="Open Technician view"
              >
                Tech View
              </button>
              <button
                onClick={() => onSelectSupportRole('PARTS_PERSON')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-white transition-colors"
                title="Open Parts view"
              >
                Parts View
              </button>
              <button
                onClick={() => onSelectSupportRole('QC_INSPECTOR')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-white transition-colors"
                title="Open QC view"
              >
                QC View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: METRICS & CONSOLIDATED ANALYTICS */}
      {activeTab === 'METRICS' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Multi-Shop High Level Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Multi-Shop Revenue
              </span>
              <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
                PKR {multiShopOverview?.overallRevenue?.toLocaleString() || '0'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Across all owned branches</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Fleet Bookings
              </span>
              <div className="text-2xl font-black font-mono text-brand-600 mt-1">
                {multiShopOverview?.overallBookings || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Lifetime customers served</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                QC Fail Rate ({currentShop?.city})
              </span>
              <div className="text-2xl font-black font-mono text-amber-600 mt-1">
                {shopAnalytics?.qcFailRate || '0%'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">{shopAnalytics?.qcIssuesCount || 0} defects caught early</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Active In-Shop Repairs
              </span>
              <div className="text-2xl font-black font-mono text-purple-600 mt-1">
                {shopAnalytics?.inRepairBookings || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">{shopAnalytics?.qcPendingBookings || 0} awaiting QC test</span>
            </div>
          </div>

          {/* Owned Shops Performance Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm">
              Owned Workshops Fleet Performance
            </div>
            <table className="w-full">
              <thead className="bg-slate-100/50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left">Workshop</th>
                  <th className="py-2.5 px-4 text-left">City</th>
                  <th className="py-2.5 px-4 text-center">Active Jobs</th>
                  <th className="py-2.5 px-4 text-center">Completed</th>
                  <th className="py-2.5 px-4 text-right">Revenue (PKR)</th>
                  <th className="py-2.5 px-4 text-center">Team Size</th>
                  <th className="py-2.5 px-4 text-center">Switch Shop</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {multiShopOverview?.shops?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-slate-600">{s.city}</td>
                    <td className="py-3 px-4 text-center font-bold text-brand-600">{s.activeBookings}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">{s.completedBookings}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      PKR {s.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{s.teamCount}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          const found = shops.find((x) => x.id === s.id);
                          if (found) setCurrentShop(found);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          currentShop?.id === s.id
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {currentShop?.id === s.id ? 'Active' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM MANAGEMENT */}
      {activeTab === 'TEAM' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Staff Members of {currentShop?.name}
              </h3>
              <p className="text-xs text-slate-500">
                Shop staff accounts are provisioned by the Owner. Roles are scoped per tenant.
              </p>
            </div>
            <button
              onClick={() => setShowAddMember(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left">Member Name</th>
                  <th className="py-3 px-4 text-left">Email Address</th>
                  <th className="py-3 px-4 text-left">Assigned Role</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.user.name}</td>
                    <td className="py-3 px-4 text-slate-600">{m.user.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full font-bold font-mono text-[10px] bg-slate-100 text-slate-800 uppercase">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          m.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {m.role !== 'OWNER' && (
                        <button
                          onClick={() => handleToggleMember(m.id, m.isActive)}
                          className="text-xs text-slate-500 hover:text-slate-900 underline"
                        >
                          {m.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICES CATALOG */}
      {activeTab === 'SERVICES' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Configured Services for {currentShop?.name}
              </h3>
              <p className="text-xs text-slate-500">
                Services presented in the customer booking wizard for this branch.
              </p>
            </div>
            <button
              onClick={() => setShowAddService(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((srv) => (
              <div key={srv.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm">{srv.name}</h4>
                  <span className="font-mono font-bold text-brand-600">PKR {srv.basePrice?.toLocaleString()}</span>
                </div>
                <p className="text-slate-500">{srv.description}</p>
                <div className="pt-2 text-[11px] text-slate-400">
                  Estimated Duration: {srv.estimatedDuration} mins
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CREATE NEW SHOP */}
      {activeTab === 'NEW_SHOP' && (
        <div className="max-w-xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm animate-in fade-in">
          <h3 className="text-lg font-black text-slate-900 mb-1">Register New Workshop Branch</h3>
          <p className="text-xs text-slate-500 mb-6">
            Each shop has its own independent team members, slots, inventory catalog, and bookings.
          </p>

          <form onSubmit={handleCreateShop} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Shop Name</label>
              <input
                type="text"
                required
                value={newShop.name}
                onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                placeholder="e.g. Rawalpindi Auto Works"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                required
                value={newShop.address}
                onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
                placeholder="e.g. Main Peshawar Road, Saddar"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={newShop.city}
                  onChange={(e) => setNewShop({ ...newShop, city: e.target.value })}
                  placeholder="Rawalpindi"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={newShop.phone}
                  onChange={(e) => setNewShop({ ...newShop, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Working Hours</label>
                <input
                  type="text"
                  value={newShop.workingHours}
                  onChange={(e) => setNewShop({ ...newShop, workingHours: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Slot Capacity (cars/hour)</label>
                <input
                  type="number"
                  min={1}
                  value={newShop.slotCapacity}
                  onChange={(e) => setNewShop({ ...newShop, slotCapacity: parseInt(e.target.value) || 2 })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/30"
              >
                Create Branch Workshop
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD TEAM MEMBER */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Shop Staff Member</h3>
            <p className="text-xs text-slate-500 mb-4">
              Provision credentials for {currentShop?.name}:
            </p>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Staff Member Name</label>
                <input
                  type="text"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="e.g. Asad Rauf"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="asad@lahoreauto.pk"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role in this Shop</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="SERVICE_ADVISOR">Service Advisor (Front Desk)</option>
                  <option value="TECHNICIAN">Technician (Mechanic)</option>
                  <option value="QC_INSPECTOR">QC Inspector (Quality Control)</option>
                  <option value="PARTS_PERSON">Parts Person (Procurement)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Password</label>
                <input
                  type="text"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE */}
      {showAddService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Catalog Service</h3>
            <form onSubmit={handleCreateService} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="e.g. Complete Transmission Flush"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  placeholder="Fluid drain, filter replacement and pressurized flush..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Price (PKR)</label>
                  <input
                    type="number"
                    value={newService.basePrice}
                    onChange={(e) => setNewService({ ...newService, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Duration (mins)</label>
                  <input
                    type="number"
                    value={newService.estimatedDuration}
                    onChange={(e) => setNewService({ ...newService, estimatedDuration: parseInt(e.target.value) || 60 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddService(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
