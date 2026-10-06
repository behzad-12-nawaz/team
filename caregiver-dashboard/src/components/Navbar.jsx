import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export function Navbar({ searchQuery = "", onSearchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_id");
    navigate("/login");
  };

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
    if (location.pathname !== "/patients" && val.trim() !== "") {
      navigate("/patients");
    }
  };

  const navLinks = [
    { name: "Patients", path: "/patients" },
    { name: "Settings", path: "/settings" }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          <div className="flex items-center space-x-6">
            <Link to="/patients" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] bg-clip-text text-transparent">
                  DoseCare
                </span>
                <span className="block text-[11px] font-medium text-slate-500 tracking-wider uppercase">Caregiver Portal</span>
              </div>
            </Link>

            <nav className="hidden md:flex space-x-2">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#EFF6FF] text-[#1E3A8A] shadow-xs font-bold"
                        : "text-[#1E293B] hover:text-[#2563EB] hover:bg-[#EFF6FF]/60"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Search Bar in Navbar */}
          <div className="flex-1 max-w-xs sm:max-w-sm">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={onSearchChange ? searchQuery : localSearch}
                onChange={handleSearchInput}
                placeholder="Search patient by name or phone..."
                className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-[#F8FAFC] hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#2563EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all placeholder:text-slate-400 text-[#1E293B]"
              />
              {(onSearchChange ? searchQuery : localSearch) && (
                <button
                  onClick={() => {
                    setLocalSearch("");
                    if (onSearchChange) onSearchChange("");
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 text-xs font-medium text-slate-600 bg-[#EFF6FF] px-3 py-1.5 rounded-full border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse"></span>
              <span className="text-[#1E3A8A] font-semibold">Live Caregiver Mode</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium text-[#1E293B] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 hover:border-rose-200 cursor-pointer"
            >
              <svg className="w-4 h-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}