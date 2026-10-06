import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";

export function Navbar({ searchQuery = "", onSearchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  const [patientsList, setPatientsList] = useState([]);
  const [liveToast, setLiveToast] = useState(null);
  const [soundAlerts, setSoundAlerts] = useState(true);

  // Load patients data for live caregiver alerts
  const fetchLiveStatus = async () => {
    try {
      setSyncing(true);
      const data = await api("/caregiver/patients");
      if (Array.isArray(data)) {
        setPatientsList(data);
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSyncing(false), 500);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const timer = setInterval(fetchLiveStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  const totalMissed = patientsList.reduce((acc, p) => acc + (p.today?.missed || 0), 0);

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

  // Simulate a live WhatsApp reminder trigger
  const handleSimulateReminder = () => {
    const targetPatient = patientsList[0] || { name: "Ali Khan", phone: "923001234567" };
    setLiveToast({
      title: "Live Reminder Dispatched",
      message: `WhatsApp reminder sent to ${targetPatient.name} (+${targetPatient.phone}) for Metformin 500 mg`,
      time: new Date().toLocaleTimeString(),
    });

    setTimeout(() => {
      setLiveToast(null);
    }, 6000);
  };

  const navLinks = [
    { name: "Patients", path: "/patients" },
    { name: "Settings", path: "/settings" }
  ];

  return (
    <>
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
              {/* Interactive Live Caregiver Mode Button */}
              <button
                type="button"
                onClick={() => setShowLiveModal(true)}
                title="Click to view Live Monitoring Hub & Patient Alerts"
                className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer shadow-xs ${
                  totalMissed > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse"
                    : "bg-[#EFF6FF] text-[#1E3A8A] border-blue-200 hover:bg-blue-100"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${totalMissed > 0 ? "bg-rose-500" : "bg-[#2563EB]"} animate-ping`}></span>
                <span>
                  {totalMissed > 0 ? `⚠️ Live Alert (${totalMissed} Missed)` : "Live Caregiver Mode"}
                </span>
              </button>
              
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

      {/* Live Toast Notification */}
      {liveToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-bounce">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{liveToast.title}</h4>
                <span className="text-[10px] text-slate-400">{liveToast.time}</span>
              </div>
              <p className="text-xs text-slate-200 mt-1">{liveToast.message}</p>
            </div>
            <button onClick={() => setLiveToast(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Live Caregiver Mode Modal / Control Panel */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-6 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Live Caregiver Control Hub</h3>
                  <p className="text-xs text-blue-100">Real-time Dose & WhatsApp Notification Monitor</p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Sync Status Banner */}
              <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Monitoring Active (30s Polling)</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Last Synced: <strong>{lastSyncTime}</strong> &bull; {patientsList.length} Linked Patients
                  </div>
                </div>
                <button
                  onClick={fetchLiveStatus}
                  disabled={syncing}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1"
                >
                  <svg className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{syncing ? "Syncing..." : "Sync Now"}</span>
                </button>
              </div>

              {/* Missed Doses Alert Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Emergency Dose Status
                </h4>
                {totalMissed > 0 ? (
                  <div className="space-y-2">
                    {patientsList.filter(p => (p.today?.missed || 0) > 0).map(p => (
                      <div key={p.id} className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-rose-900">{p.name}</div>
                          <div className="text-xs text-rose-700">{p.today?.missed} missed dose(s) today &bull; +{p.phone}</div>
                        </div>
                        <a
                          href={`https://wa.me/${p.phone}?text=Assalam-o-Alaikum%20${encodeURIComponent(p.name)},%20please%20take%20your%20scheduled%20medication.`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center space-x-1"
                        >
                          <span>💬 WhatsApp</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                    <span>✓</span>
                    <span>All linked patients are on track with zero missed doses!</span>
                  </div>
                )}
              </div>

              {/* Simulation Actions */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Live Engine Testing & Simulation
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Simulate a live WhatsApp dose reminder dispatch to verify how real-time notifications work:
                </p>
                <button
                  type="button"
                  onClick={handleSimulateReminder}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-300 bg-[#EFF6FF] hover:bg-blue-100 text-[#1E3A8A] text-xs font-bold transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>⚡</span>
                  <span>Test Simulate Live WhatsApp Dose Reminder</span>
                </button>
              </div>

              {/* Preferences */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Critical Alert Audio Chime</span>
                  <span className="text-[11px] text-slate-500">Play chime when a patient misses a dose</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]"></div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#F8FAFC] px-6 py-3.5 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowLiveModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}