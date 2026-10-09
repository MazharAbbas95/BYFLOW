import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shop } from '../types';
import {
  Wrench,
  CheckCircle,
  Calendar,
  Clock,
  Car,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building2,
  FileText,
} from 'lucide-react';

export const BookingWizard: React.FC = () => {
  const { shops, currentShop, setCurrentShop, user, login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // Step 2: Services & Problems
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [reportedProblem, setReportedProblem] = useState('');

  // Step 3: Date & Time Slot
  const todayStr = new Date().toISOString().split('T')[0];
  const [bookingDate, setBookingDate] = useState(todayStr);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Step 4: Personal & Vehicle Details
  const [name, setName] = useState(user?.name || 'Ahmed Khan');
  const [email, setEmail] = useState(user?.email || 'ahmed@mail.com');
  const [password, setPassword] = useState('password123');
  const [phone, setPhone] = useState(user?.phone || '+92 300 9876543');

  const [registrationPlate, setRegistrationPlate] = useState('LEA-1234');
  const [make, setMake] = useState('Honda');
  const [model, setModel] = useState('Civic');
  const [year, setYear] = useState('2016');
  const [color, setColor] = useState('White');
  const [mileage, setMileage] = useState('82000');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const commonServices = [
    'Check engine light',
    'Oil change',
    'Brake failure & Inspection',
    'Tire rotation & Balancing',
    'AC Performance & Gas Recharge',
    'Suspension & Shock Absorbers',
  ];

  // Initialize shop from query or context
  useEffect(() => {
    const qShopId = searchParams.get('shopId');
    const initialId = qShopId || currentShop?.id || (shops.length > 0 ? shops[0].id : '');
    if (initialId) {
      setSelectedShopId(initialId);
      const s = shops.find((x) => x.id === initialId);
      if (s) {
        setSelectedShop(s);
        setCurrentShop(s);
      }
    }
  }, [searchParams, shops, currentShop]);

  // Load available slots whenever shop or date changes
  useEffect(() => {
    if (!selectedShopId || !bookingDate) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await api.get(`/shops/${selectedShopId}?date=${bookingDate}`);
        setAvailableSlots(res.data.slots || []);
      } catch (err) {
        console.error('Failed to fetch slots', err);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedShopId, bookingDate]);

  const toggleService = (srv: string) => {
    if (selectedServices.includes(srv)) {
      setSelectedServices(selectedServices.filter((s) => s !== srv));
    } else {
      setSelectedServices([...selectedServices, srv]);
    }
  };

  const handleNextStep = () => {
    setErrorMessage('');
    if (step === 1 && !selectedShopId) {
      setErrorMessage('Please select a workshop to proceed.');
      return;
    }
    if (step === 2 && selectedServices.length === 0 && !reportedProblem.trim()) {
      setErrorMessage('Please select at least one service or describe the reported issue.');
      return;
    }
    if (step === 3 && !selectedTimeSlot) {
      setErrorMessage('Please choose an available time slot.');
      return;
    }
    if (step === 4) {
      if (!name || !email || !registrationPlate || !make || !model) {
        setErrorMessage('Please fill in all mandatory customer and vehicle fields.');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const payload = {
        shopId: selectedShopId,
        bookingDate,
        bookingTime: selectedTimeSlot,
        selectedServices,
        reportedProblem: reportedProblem || selectedServices.join(', '),
        name,
        email,
        password,
        phone,
        registrationPlate: registrationPlate.trim().toUpperCase(),
        make,
        model,
        year,
        color,
        mileage,
      };

      const res = await api.post('/bookings', payload);

      // Auto login with returned token
      if (res.data.token) {
        localStorage.setItem('bayflow_token', res.data.token);
      }

      // Navigate straight to Customer Dashboard
      navigate('/portal');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Wizard Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-brand-600 font-bold">
            Customer Booking Portal
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-1">
            Book Auto Service in 5 Easy Steps
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Transparent pricing • Certified technician inspections • Quality checked before delivery
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span className={step >= 1 ? 'text-brand-600 font-bold' : ''}>1. Select Shop</span>
            <span className={step >= 2 ? 'text-brand-600 font-bold' : ''}>2. Services</span>
            <span className={step >= 3 ? 'text-brand-600 font-bold' : ''}>3. Time Slot</span>
            <span className={step >= 4 ? 'text-brand-600 font-bold' : ''}>4. Particulars</span>
            <span className={step >= 5 ? 'text-brand-600 font-bold' : ''}>5. Confirm</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Container Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: SELECT SHOP */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-900">Choose Workshop</h3>
              <p className="text-xs text-slate-500">
                Select from our certified network of independent repair shops:
              </p>

              <div className="space-y-3 pt-2">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    onClick={() => {
                      setSelectedShopId(shop.id);
                      setSelectedShop(shop);
                      setCurrentShop(shop);
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      selectedShopId === shop.id
                        ? 'border-brand-600 bg-brand-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{shop.name}</div>
                        <div className="text-xs text-slate-500">
                          {shop.address}, {shop.city} • Open {shop.workingHours}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        ★ {shop.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: SERVICES & REPORTED PROBLEM */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Select Services & Symptoms</h3>
                <p className="text-xs text-slate-500">
                  Pick standard services or describe the problem your vehicle is experiencing:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {commonServices.map((srv) => {
                  const isChecked = selectedServices.includes(srv);
                  return (
                    <button
                      type="button"
                      key={srv}
                      onClick={() => toggleService(srv)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                        isChecked
                          ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                      }`}
                    >
                      <span>{srv}</span>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Customer Reported Problem / Technician Notes
                </label>
                <textarea
                  rows={3}
                  value={reportedProblem}
                  onChange={(e) => setReportedProblem(e.target.value)}
                  placeholder="e.g. Light came on yesterday, car vibrates at idle, squeaking sound from brakes..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME SLOT */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Select Date & Time Slot</h3>
                <p className="text-xs text-slate-500">
                  Live bay availability for {selectedShop?.name || 'Workshop'}:
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Appointment Date</label>
                <input
                  type="date"
                  min={todayStr}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Available Slots ({selectedShop?.slotCapacity} cars per slot)
                </label>

                {slotsLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading slot capacity...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedTimeSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedTimeSlot(slot.time)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            !slot.isAvailable
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'border-brand-600 bg-brand-600 text-white font-bold shadow-md shadow-brand-600/20'
                              : 'border-slate-200 bg-slate-50 hover:border-brand-500 text-slate-800 font-semibold'
                          }`}
                        >
                          <div className="text-xs">{slot.time}</div>
                          <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-brand-100' : 'text-slate-500'}`}>
                            {slot.isAvailable ? `${slot.capacity - slot.bookedCount} spots left` : 'Fully Booked'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: PERSONAL & VEHICLE DETAILS */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Personal & Vehicle Details</h3>
                <p className="text-xs text-slate-500">
                  Enter your details to track vehicle progress and approve estimates:
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Customer Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Portal Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Vehicle Particulars
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Registration Plate</label>
                    <input
                      type="text"
                      value={registrationPlate}
                      onChange={(e) => setRegistrationPlate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-mono uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Make</label>
                    <input
                      type="text"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Model</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Year</label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Color (Optional)</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Mileage (Optional)</label>
                    <input
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & CONFIRM */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Review & Confirm Appointment</h3>
                <p className="text-xs text-slate-500">
                  Please verify your booking details before submission:
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Selected Workshop:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedShop?.name}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Scheduled Time Slot:</span>
                  <span className="font-bold text-brand-600 text-sm">
                    {bookingDate} at {selectedTimeSlot}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Vehicle:</span>
                  <span className="font-bold text-slate-900">
                    {year} {make} {model} ({registrationPlate.toUpperCase()})
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{name} ({email})</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Selected Services & Notes:</span>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    {selectedServices.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedServices.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-slate-700 italic">"{reportedProblem || 'Standard Checkup'}"</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <strong>Next Step:</strong> Your booking will be registered as <span className="font-mono font-bold">PENDING</span>.
                The shop's Service Advisor will confirm and assign a certified mechanic for inspection.
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
            ) : <div />}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-black transition-all shadow-lg shadow-brand-600/30 flex items-center space-x-2"
              >
                <span>{isSubmitting ? 'Confirming...' : 'Confirm & Create Booking'}</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
