import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  CheckCircle2,
  Car,
  ArrowRight,
  Phone,
  Sparkles,
  FileText,
  Calendar,
  Shield,
  Award,
  Zap,
  Disc,
  Settings,
  Cpu,
  Gauge,
  ThumbsUp,
  ChevronRight,
  Lock,
  Check,
  ExternalLink,
  Users,
  Activity,
  Layers,
  Fuel,
  TrendingUp,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { shops, setCurrentShop } = useAuth();
  const [selectedCity, setSelectedCity] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [plateSearch, setPlateSearch] = useState('');
  const [vehicleHistory, setVehicleHistory] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const cities = ['All', 'Lahore', 'Karachi', 'Islamabad'];

  // Handle URL hash anchor scrolling on mount
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, [location]);

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

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSubscribed(false), 5000);
    }
  };

  // Curated Services Matching Autorizen Reference Theme
  const platformServices = [
    {
      title: 'Preventative Maintenance',
      category: 'Oil & Fluids',
      desc: 'Complete full-synthetic engine oil replacement, OEM oil filter, fluid top-ups, air filter inspection, and multi-point safety scan.',
      turnaround: '45 - 60 Mins',
      warranty: '6 Months / 10,000 km',
      icon: Gauge,
      badge: 'Popular',
    },
    {
      title: 'Brake Repair & Services',
      category: 'Braking Systems',
      desc: 'Ceramic brake pad replacement, rotor resurfacing or OEM replacement, brake hydraulic fluid flush, and ABS electronic diagnostics.',
      turnaround: '2 - 3 Hours',
      warranty: '12 Months / 20,000 km',
      icon: Disc,
      badge: 'High Safety',
    },
    {
      title: 'Transmission Services',
      category: 'Drivetrain & Gearbox',
      desc: 'Automatic & manual transmission fluid exchange, filter replacement, clutch friction plate adjustment, and electronic solenoid scan.',
      turnaround: '3 - 5 Hours',
      warranty: '12 Months / 25,000 km',
      icon: Settings,
      badge: 'Certified',
    },
    {
      title: 'Engine Diagnostics & Tuning',
      category: 'Engine Care',
      desc: 'Full OBD-II ECU computer scanner check, spark plug ignition renewal, fuel injector ultrasonic cleaning, and sensor calibration.',
      turnaround: 'Same Day',
      warranty: '12 Months / 20,000 km',
      icon: Cpu,
      badge: 'Computerized',
    },
    {
      title: 'Tires & Laser Alignment',
      category: 'Wheels & Suspension',
      desc: '3D computerized four-wheel laser alignment, high-speed dynamic wheel balancing, tire rotation, and nitrogen inflation.',
      turnaround: '30 - 45 Mins',
      warranty: '6 Months Alignment Warranty',
      icon: Activity,
      badge: 'Laser 3D',
    },
    {
      title: 'Body Repair & Painting',
      category: 'Collision & Paint',
      desc: 'Paintless dent removal (PDR), computerized spectrometer paint matching, baked oven spray booth painting, and scratch restoration.',
      turnaround: '2 - 4 Days',
      warranty: '24 Months Paint Finish',
      icon: Car,
      badge: 'Oven Baked',
    },
  ];

  // Mock Partners Data
  const mockPartners = [
    {
      name: 'Bosch Car Service',
      category: 'Diagnostic Systems & Sensors',
      badge: 'Tier 1 OEM Supplier',
      logoText: 'BOSCH',
      color: 'from-blue-600 to-indigo-700',
      description: 'Authorized diagnostic scanning software and genuine electronic sensors integrated into BayFlow inspection kiosks.',
    },
    {
      name: 'Brembo Performance',
      category: 'High Performance Brakes',
      badge: 'Certified Braking Partner',
      logoText: 'brembo',
      color: 'from-red-600 to-rose-700',
      description: 'Direct supplier of OEM-grade ceramic pads and ventilated brake rotors with QR-code provenance verification.',
    },
    {
      name: 'Motul Lubricants',
      category: '100% Synthetic Oils',
      badge: 'Official Oil Partner',
      logoText: 'MOTUL',
      color: 'from-red-700 to-rose-900',
      description: 'Direct factory distribution of 8100 X-cess and 300V motorsport-grade engine lubricants across all partner garages.',
    },
    {
      name: 'Mobil 1 Engine Oils',
      category: 'Advanced Full Synthetic',
      badge: 'Premium Lubrication',
      logoText: 'Mobil 1',
      color: 'from-blue-700 to-blue-900',
      description: 'Certified engine protection fluids providing maximum thermal stability and sludge prevention for high-mileage vehicles.',
    },
    {
      name: 'Castrol EDGE',
      category: 'Fluid Titanium Technology',
      badge: 'Performance Partner',
      logoText: 'Castrol',
      color: 'from-emerald-600 to-green-700',
      description: 'Fluid Titanium technology oils that transform under pressure to reduce friction and unlock maximum horsepower.',
    },
    {
      name: 'Denso Auto Parts',
      category: 'OEM Electrical & Spark Plugs',
      badge: 'Japanese OEM Specialist',
      logoText: 'DENSO',
      color: 'from-blue-800 to-slate-900',
      description: 'Authorized Iridium spark plugs, alternators, and A/C compressor components for Japanese and European car brands.',
    },
    {
      name: 'Michelin Tires',
      category: 'Authorized Fitting Partner',
      badge: 'Tire & Safety Network',
      logoText: 'MICHELIN',
      color: 'from-yellow-600 to-blue-800',
      description: 'Certified laser alignment and road-hazard warranty support across our nationwide network of automotive centers.',
    },
    {
      name: 'Jubilee Motor Insurance',
      category: 'Direct Claim Settlement',
      badge: 'Direct-Billing Partner',
      logoText: 'Jubilee Insurance',
      color: 'from-sky-700 to-blue-800',
      description: 'Paperless accident assessment and direct shop billing with zero out-of-pocket delays for comprehensive policy holders.',
    },
  ];

  // How It Works Steps
  const workflowSteps = [
    {
      step: '01',
      title: 'Select Workshop & Book Online',
      desc: 'Browse verified independent garages in your city. Select an available bay slot and specify your vehicle model with real-time calendar confirmation.',
      icon: Calendar,
      highlight: 'Zero Waiting Queue',
    },
    {
      step: '02',
      title: '24-Point Digital Inspection',
      desc: 'On vehicle arrival, a certified technician runs a digital diagnostic scan and uploads clear photos of any worn components directly to your order.',
      icon: FileText,
      highlight: 'Transparent Photo Evidence',
    },
    {
      step: '03',
      title: 'Approve Itemized Estimates',
      desc: 'Review genuine part numbers, labor rates, and tax on your phone. Approve or decline specific repairs with 1-click before a single wrench turns.',
      icon: CheckCircle2,
      highlight: 'You Stay In Complete Control',
    },
    {
      step: '04',
      title: 'Independent QC Sign-Off & Delivery',
      desc: 'Before car release, an independent Quality Control inspector runs an audit checklist. Your complete digital service history is logged to your plate.',
      icon: ShieldCheck,
      highlight: 'Certified QC Pass Guarantee',
    },
  ];

  // Customer Trust Testimonials
  const testimonials = [
    {
      name: 'Ahmed Khan',
      city: 'Lahore',
      vehicle: 'Honda Civic Oriel (2022)',
      rating: 5,
      review:
        'The transparent estimate approval completely changed auto repair for me. The technician attached photos of my worn rear brake pads, and I approved the replacement from my office phone. Saved 35% compared to authorized dealership pricing!',
    },
    {
      name: 'Dr. Ayesha Siddiqui',
      city: 'Karachi',
      vehicle: 'Toyota Fortuner 2.8D (2023)',
      rating: 5,
      review:
        'Having a dedicated Quality Control inspector sign off on the repair checklist before delivery gives incredible peace of mind. Karachi Motor Works did a flawless transmission fluid exchange with zero delays.',
    },
    {
      name: 'Zubair Hashmi',
      city: 'Islamabad',
      vehicle: 'Audi A4 2.0 TFSI (2021)',
      rating: 5,
      review:
        'When I went to resell my car, having the BayFlow digital maintenance history on my license plate proved every single oil change was done with certified Motul fluids. The buyer finalized the deal on the spot!',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* ========================================================
          1. HERO SECTION (Autorizen Style: Bold Navy Backdrop)
         ======================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#091838] via-[#0B1E48] to-[#0A1A3D] text-white pt-14 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:28px_28px] opacity-20" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>Next-Gen Multi-Tenant Automotive SaaS Platform</span>
          </div>

          {/* Headline matching Reference Image */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
            Your Trusted Partner For All Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-200">
              Auto Needs.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            From routine maintenance to major mechanical overhauls, our multi-tenant platform connects car owners
            to certified independent workshops with transparent digital estimates, genuine parts, and verified Quality Control.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/book"
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-sm sm:text-base text-white shadow-xl shadow-blue-600/40 hover:shadow-blue-500/60 transition-all hover:-translate-y-0.5 flex items-center space-x-2.5"
            >
              <span>Book A Service Now</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="#shops-section"
              className="px-7 py-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 font-bold text-sm sm:text-base text-slate-200 border border-slate-600/70 backdrop-blur-md transition-all flex items-center space-x-2"
            >
              <span>Explore Verified Garages</span>
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </a>

            <a
              href="#how-it-works"
              className="px-6 py-4 rounded-xl text-blue-300 hover:text-white font-semibold text-sm transition-colors flex items-center space-x-1.5"
            >
              <span>See How It Works</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Core Trust Pillars */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
              <ShieldCheck className="w-6 h-6 text-cyan-400 mb-2.5" />
              <div className="text-sm font-bold text-white">100% Tenant Isolation</div>
              <div className="text-xs text-slate-300 mt-1">Strict shop data boundary & private pricing</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
              <CheckCircle className="w-6 h-6 text-emerald-400 mb-2.5" />
              <div className="text-sm font-bold text-white">Audit State Machine</div>
              <div className="text-xs text-slate-300 mt-1">No work begins without your digital approval</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
              <Phone className="w-6 h-6 text-amber-400 mb-2.5" />
              <div className="text-sm font-bold text-white">In-App Voice Calling</div>
              <div className="text-xs text-slate-300 mt-1">Direct WebRTC audio link with service advisors</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
              <Sparkles className="w-6 h-6 text-purple-400 mb-2.5" />
              <div className="text-sm font-bold text-white">AI Voice Front Desk</div>
              <div className="text-xs text-slate-300 mt-1">24/7 automated booking & vehicle history query</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. PUBLIC VEHICLE SERVICE HISTORY LOOKUP TOOL
         ======================================================== */}
      <section id="history-lookup" className="max-w-4xl mx-auto -mt-12 px-4 w-full relative z-20">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-5 sm:p-7">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center space-x-2 text-xs font-black text-slate-600 uppercase tracking-wider">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <Car className="w-3.5 h-3.5" />
              </div>
              <span>Public Vehicle Maintenance History Check</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Verified Digital Record Registry
            </span>
          </div>

          <form onSubmit={handleLookupHistory} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter License Plate (e.g. LEA-1234, KHI-7890, ICT-456)..."
                value={plateSearch}
                onChange={(e) => setPlateSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono uppercase font-semibold text-slate-900 placeholder:normal-case placeholder:font-sans placeholder:font-normal"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-mono">REG#</span>
            </div>
            <button
              type="submit"
              disabled={historyLoading}
              className="px-6 py-3 bg-[#0B1E48] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-slate-900/20"
            >
              <Search className="w-4 h-4" />
              <span>{historyLoading ? 'Verifying...' : 'Check Service History'}</span>
            </button>
          </form>

          {historyError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center space-x-2">
              <span>⚠️</span>
              <span>{historyError}</span>
            </div>
          )}

          {vehicleHistory && (
            <div className="mt-5 p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div>
                  <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Verified Vehicle Passport</div>
                  <h4 className="font-black text-base text-slate-900 mt-0.5">
                    {vehicleHistory.year} {vehicleHistory.make} {vehicleHistory.model}
                  </h4>
                  <p className="font-mono text-slate-500 text-xs">
                    License Plate: <strong className="text-slate-900 font-bold">{vehicleHistory.registrationPlate}</strong>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                    {vehicleHistory.bookings?.length || 0} Service Records
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Authenticated</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {vehicleHistory.bookings?.length === 0 ? (
                  <p className="text-slate-500 py-3 text-center">No past maintenance records recorded yet for this vehicle.</p>
                ) : (
                  vehicleHistory.bookings?.map((b: any) => (
                    <div key={b.id} className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{b.reportedProblem}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                          <span className="font-semibold text-slate-700">{b.shop?.name}</span>
                          <span>•</span>
                          <span>{b.bookingDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {b.status}
                        </span>
                        {b.totalAmount && (
                          <span className="font-mono font-bold text-xs text-slate-900">
                            PKR {b.totalAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          3. ABOUT US / COMPREHENSIVE CARE SECTION (From Reference)
         ======================================================== */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider">
              <span>ABOUT US</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Comprehensive care by experts with convenience
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              BayFlow solves the biggest problem in independent auto repair: <strong>the trust deficit</strong>.
              Car owners are tired of vague estimates, unauthorized part replacements, and delayed vehicle handovers.
            </p>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Our multi-tenant platform powers certified independent automotive centers with enterprise-grade
              workstation POS, transparent digital customer estimates, live parts inventory allocation,
              and strict Quality Control verification loops.
            </p>

            {/* Feature Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-slate-800">100% Genuine OEM & Performance Parts</div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-slate-800">Clear Photo Evidence with Estimates</div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-slate-800">Certified QC Inspector Sign-off</div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-slate-800">12-Month Nationwide Warranty</div>
              </div>
            </div>

            <div className="pt-4 flex items-center space-x-4">
              <a
                href="#how-it-works"
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-600/30 inline-flex items-center space-x-2"
              >
                <span>Discover More</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="#services"
                className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center space-x-1.5"
              >
                <span>View Services</span>
              </a>
            </div>
          </div>

          {/* Right Visual Image Collage (Matching Reference Auto Imagery) */}
          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 group">
                  <img
                    src="https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=700&q=80"
                    alt="Master Auto Technician"
                    className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-4">
                    <span className="text-white text-xs font-bold">Certified Diagnostics Station</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm">
                  <div className="text-3xl font-black text-blue-700">100%</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">Multi-Tenant Isolation</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Strict per-workshop privacy and independent databases</div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="space-y-4 pt-6">
                <div className="p-5 rounded-2xl bg-[#0B1E48] text-white shadow-xl">
                  <div className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Quality Verified</span>
                  </div>
                  <div className="text-2xl font-black mt-2">Zero Markup</div>
                  <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                    Transparent labor units & OEM part numbers verified on every invoice.
                  </p>
                </div>

                <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 group">
                  <img
                    src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=700&q=80"
                    alt="Precision Engine Care"
                    className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-4">
                    <span className="text-white text-xs font-bold">High Precision Engine Overhaul</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. SKILLED TECHNICIANS DARK BANNER (From Reference)
         ======================================================== */}
      <section className="bg-[#0B1E48] text-white py-16 px-4 sm:px-6 lg:px-8 border-y border-blue-900/40 relative overflow-hidden">
        <div className="absolute -right-20 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-widest mb-4">
              <span>CERTIFIED WORKFORCE</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Trust Your Car To Our Skilled Technicians
            </h3>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              Every partner shop onboarded to the BayFlow platform is audited for master mechanic certifications,
              professional computerized scan tools, clean bay standards, and insurance compliance.
            </p>

            {/* 2-Column Checklist from Reference Image */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
              <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>General Vehicle Maintenance</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>Bodywork and Paint Services</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>Mechanical Repairs</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>Professional Car Detailing</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>Tire and Wheel Services</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>Diagnostic ECU Car Scan</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>Electrical Services & Wiring</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>Certified QC Inspections</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link
              to="/book"
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-black text-sm text-white shadow-xl shadow-blue-600/30 transition-all flex items-center space-x-2"
            >
              <span>Schedule Inspection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. STATS COUNTER STRIP (88K+, 96%, 123K+, 24+ From Reference)
         ======================================================== */}
      <section className="bg-white border-b border-slate-200 py-10 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {/* Stat 1 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
            <div className="text-4xl sm:text-5xl font-black text-blue-600 tracking-tight">88K+</div>
            <div className="text-sm font-bold text-slate-900 mt-2">Happy Clients</div>
            <div className="text-xs text-slate-500 mt-0.5">Satisfied car owners across all cities</div>
          </div>

          {/* Stat 2 */}
          <div className="p-6 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">96%</div>
            <div className="text-sm font-bold text-blue-100 mt-2">Completed On-Time</div>
            <div className="text-xs text-blue-200 mt-0.5">Strict adherence to promised repair slots</div>
          </div>

          {/* Stat 3 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">123K+</div>
            <div className="text-sm font-bold text-slate-900 mt-2">Genuine Parts Sold</div>
            <div className="text-xs text-slate-500 mt-0.5">100% verified QR & serial code tracking</div>
          </div>

          {/* Stat 4 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">24+</div>
            <div className="text-sm font-bold text-slate-900 mt-2">Partner Workshops</div>
            <div className="text-xs text-slate-500 mt-0.5">Independent verified garages on platform</div>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. "OUR SERVICES" SECTION (From Reference & User Request)
         ======================================================== */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-3">
            <span>OUR SERVICES</span>
          </div>

          {/* Title Matching Reference Text */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Let us handle the dirty work so you don't have to
          </h2>

          <p className="mt-4 text-slate-500 text-sm sm:text-base leading-relaxed">
            All services are performed by certified technicians utilizing OEM parts, transparent labor times,
            and backed by our nationwide platform warranty.
          </p>
        </div>

        {/* 6 Services Grid (Styled after Autorizen 3x2 cards with blue badges) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {platformServices.map((service, idx) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Watermark subtle icon */}
                <div className="absolute -right-4 -bottom-4 text-slate-100 group-hover:text-blue-50/60 transition-colors pointer-events-none">
                  <Icon className="w-32 h-32 opacity-40" />
                </div>

                <div>
                  {/* Top Bar with blue badge */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                      {service.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      {service.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mt-2">
                    {service.title}
                  </h3>

                  <p className="mt-3 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {service.desc}
                  </p>

                  {/* Metadata pills */}
                  <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center space-x-1.5 text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Turnaround Time:</span>
                      </span>
                      <span className="font-bold text-slate-900">{service.turnaround}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center space-x-1.5 text-slate-500 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Warranty:</span>
                      </span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        {service.warranty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 relative z-10">
                  <button
                    onClick={() => navigate('/book')}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-600/20"
                  >
                    <span>Book This Service</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          7. "HOW IT WORKS" SECTION (User Request)
         ======================================================== */}
      <section id="how-it-works" className="bg-slate-100/70 border-y border-slate-200 py-20 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-3">
              <span>HOW IT WORKS</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Take Control of Your Car's Maintenance Today
            </h2>

            <p className="mt-4 text-slate-500 text-sm sm:text-base leading-relaxed">
              Our 4-step state-machine workflow eliminates uncertainty. You see every line item, approve parts before installation, and track live repair progress from anywhere.
            </p>
          </div>

          {/* 4 Steps Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((stepItem, idx) => {
              const StepIcon = stepItem.icon;
              return (
                <div
                  key={stepItem.step}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all flex flex-col justify-between relative group"
                >
                  {/* Step Number Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-black text-blue-600 font-mono tracking-tighter">
                      {stepItem.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {stepItem.title}
                    </h3>
                    <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                      {stepItem.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                      <Check className="w-3 h-3 text-blue-600" />
                      <span>{stepItem.highlight}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* State Machine Interactive Transparency Callout */}
          <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Audited POS State Machine</span>
              </div>
              <h4 className="text-xl font-black text-slate-900">
                Never pay for unauthorized work or surprise charges again
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                By law of our POS system, technicians cannot touch vehicle parts until the Service Advisor compiles the estimate and you digitally toggle your approval.
              </p>
            </div>

            <Link
              to="/book"
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2 whitespace-nowrap"
            >
              <span>Test The Booking Flow</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          8. "OUR PARTNERS" SECTION (User Request with Mock Partners)
         ======================================================== */}
      <section id="partners" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-3">
            <span>OUR PARTNERS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Backed by Industry-Leading Automotive & Insurance Partners
          </h2>

          <p className="mt-4 text-slate-500 text-sm sm:text-base leading-relaxed">
            We partner with global parts manufacturers, certified fluid refineries, and licensed insurance networks
            to guarantee zero counterfeits and seamless cashless repairs.
          </p>
        </div>

        {/* Mock Partners Grid (8 Certified Partners) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockPartners.map((partner) => (
            <div
              key={partner.name}
              className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Brand visual header block */}
                <div className={`h-14 rounded-xl bg-gradient-to-r ${partner.color} flex items-center justify-center text-white font-black text-lg sm:text-xl tracking-wider shadow-md group-hover:scale-102 transition-transform`}>
                  {partner.logoText}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {partner.badge}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
                  {partner.name}
                </h3>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  {partner.category}
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {partner.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center space-x-1 text-emerald-600">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorized Tier</span>
                </span>
                <span className="text-blue-600 group-hover:underline">Verified</span>
              </div>
            </div>
          ))}
        </div>

        {/* Partner Trust Guarantee Banner */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-[#0B1E48] via-[#0D2562] to-[#0A1A3D] text-white p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-xs font-black uppercase tracking-widest text-cyan-300">
              Zero Counterfeit Guarantee
            </div>
            <h4 className="text-xl sm:text-2xl font-black">
              100% Traceable OEM Serial Numbers on Every Invoice
            </h4>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              Every spark plug, brake pad, and oil drum is scanned into shop inventory with batch traceability. If any part fails prematurely, our partner warranty covers immediate replacement.
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <Link
              to="/register-owner"
              className="px-6 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs uppercase tracking-wider transition-colors shadow-md"
            >
              Become A Partner Shop
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          9. CUSTOMER TRUST & TESTIMONIALS (Proof & Identity)
         ======================================================== */}
      <section className="bg-white border-y border-slate-200 py-20 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-3">
              <span>CUSTOMER REVIEWS</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Real Experiences From Verified Car Owners
            </h2>

            <p className="mt-4 text-slate-500 text-sm sm:text-base leading-relaxed">
              Read how thousands of drivers protect their vehicles and wallets using BayFlow verified garages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="bg-slate-50 rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Star Rating */}
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(t.rating)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-slate-500 ml-1.5">5.0 Verified</span>
                  </div>

                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed italic">
                    "{t.review}"
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{t.name}</div>
                    <div className="text-[11px] text-slate-500">{t.city} • {t.vehicle}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {t.name[0]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          10. VERIFIED GARAGES DIRECTORY SECTION
         ======================================================== */}
      <section id="shops-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-2">
              <span>WORKSHOP DIRECTORY</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Verified Auto Repair Workshops
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Select a certified garage to check live appointment slot availability and book your service instantly.
            </p>
          </div>

          {/* City Filter Pills & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-slate-200/90 p-1.5 rounded-xl border border-slate-300/60">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCity === city
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search workshops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 w-52 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredShops.map((shop) => (
            <div
              key={shop.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-blue-600 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{shop.rating.toFixed(1)}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-4 group-hover:text-blue-600 transition-colors">
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
                  className="flex-1 py-3 px-4 rounded-xl bg-[#0B1E48] hover:bg-blue-600 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          11. HIGH QUALITY FOOTER (Autorizen Theme: Deep Rich Navy)
         ======================================================== */}
      <footer className="bg-[#07132D] text-slate-300 text-xs pt-16 pb-12 border-t border-blue-950 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Newsletter Strip */}
          <div className="pb-12 border-b border-blue-900/50 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h4 className="text-xl sm:text-2xl font-black text-white">
                Stay Ahead On Vehicle Maintenance & Special Shop Offers
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Receive preventative service reminders, seasonal tire & fluid advice, and exclusive partner garage discounts.
              </p>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="flex w-full lg:w-auto gap-2">
              <input
                type="email"
                required
                placeholder="Enter your email address..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="px-4 py-2.5 text-xs bg-slate-900 border border-blue-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white w-full sm:w-72"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white rounded-xl transition-colors whitespace-nowrap shadow-md shadow-blue-600/30"
              >
                {newsletterSubscribed ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
          </div>

          {/* 4 Footer Columns */}
          <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Col 1: Brand & Mission */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tight text-white">
                  Bay<span className="text-blue-400">Flow</span>
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Pakistan’s premier multi-tenant automotive repair SaaS platform. We empower verified independent workshops with cloud POS, real-time customer estimate approvals, and genuine part traceability.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-[11px] text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ISO 27001 Multi-Tenant Isolation Certified</span>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-3">
              <h5 className="font-black text-sm uppercase tracking-wider text-white">Platform Navigation</h5>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#about" className="hover:text-white transition-colors">About BayFlow OS</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Our Certified Services</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works (State Machine)</a></li>
                <li><a href="#partners" className="hover:text-white transition-colors">Our OEM & Insurance Partners</a></li>
                <li><a href="#history-lookup" className="hover:text-white transition-colors">Public Vehicle Service History</a></li>
                <li><Link to="/register-owner" className="hover:text-white transition-colors">Workshop Tenant Registration</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Staff POS Portal Sign In</Link></li>
              </ul>
            </div>

            {/* Col 3: Automotive Services */}
            <div className="space-y-3">
              <h5 className="font-black text-sm uppercase tracking-wider text-white">Automotive Services</h5>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/book" className="hover:text-white transition-colors">Preventative Maintenance & Oil Change</Link></li>
                <li><Link to="/book" className="hover:text-white transition-colors">Ceramic Brake Pads & Rotor Resurfacing</Link></li>
                <li><Link to="/book" className="hover:text-white transition-colors">Transmission Fluid & Clutch Service</Link></li>
                <li><Link to="/book" className="hover:text-white transition-colors">Complete Computerized OBD-II Diagnostics</Link></li>
                <li><Link to="/book" className="hover:text-white transition-colors">3D Laser Wheel Alignment & Balancing</Link></li>
                <li><Link to="/book" className="hover:text-white transition-colors">Paintless Dent Repair & Baked Spray Painting</Link></li>
              </ul>
            </div>

            {/* Col 4: Contact & Working Hours */}
            <div className="space-y-3">
              <h5 className="font-black text-sm uppercase tracking-wider text-white">Support & Workshops</h5>
              <div className="space-y-2.5 text-slate-400">
                <div className="flex items-start space-x-2.5">
                  <Phone className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-bold">+1 (555) 987-4643</div>
                    <div className="text-[11px] text-slate-500">+92 (51) 800-FLOW (Toll Free)</div>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-bold">Mon - Sat: 08:00 - 19:00</div>
                    <div className="text-[11px] text-slate-500">Sunday: Emergency Dispatch Only</div>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-bold">Lahore • Karachi • Islamabad</div>
                    <div className="text-[11px] text-slate-500">24+ Network Centers Across Pakistan</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-2.5 rounded-xl bg-blue-950/70 border border-blue-900 text-[11px] text-blue-200">
                    🚨 <strong>24/7 Roadside Assistance:</strong> Dial our toll-free hotline from your phone for instant mobile mechanic dispatch.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Legal Sub-Footer */}
          <div className="pt-8 border-t border-blue-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <div>
              © 2026 BayFlow Multi-Tenant Automotive Platform. All rights reserved. Enterprise Production Edition.
            </div>
            <div className="flex items-center space-x-4">
              <a href="#privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#terms" className="hover:text-slate-300 transition-colors">Terms of Service</a>
              <span>•</span>
              <a href="#security" className="hover:text-slate-300 transition-colors">Tenant Isolation SLA</a>
              <span>•</span>
              <a href="#cookies" className="hover:text-slate-300 transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
