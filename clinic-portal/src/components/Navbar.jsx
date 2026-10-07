import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Stethoscope, 
  Users, 
  UserPlus, 
  LogOut, 
  ShieldCheck, 
  ChevronDown,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { mockControls } from '../api/client';

export function Navbar({ onResetMock }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const doctorName = user.name || 'Dr. Sarah Ahmed';
  const isMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleReset = () => {
    mockControls.reset();
    if (onResetMock) onResetMock();
    setDropdownOpen(false);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-900">DoseCare</span>
                  <span className="text-[11px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">Clinic</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Physician & Prescription Portal</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link 
                to="/" 
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'bg-sky-50 text-sky-700' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                Active Patients
              </Link>
              <Link 
                to="/link-patient" 
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/link-patient' 
                    ? 'bg-sky-50 text-sky-700' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Link New Patient
              </Link>
            </nav>
          </div>

          {/* Right: Environment tag, Profile & Actions */}
          <div className="flex items-center gap-3">
            {isMock ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles className="w-3.5 h-3.5" />
                Mock Mode
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Connected API
              </span>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center">
                  DR
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">{doctorName}</div>
                  <div className="text-[10px] text-slate-500">Verified Physician</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-800">{doctorName}</p>
                    <p className="text-[11px] text-slate-500 truncate">Role: Medical Practitioner</p>
                  </div>
                  
                  {isMock && (
                    <button
                      onClick={handleReset}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      Reset Demo Fixture Data
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
