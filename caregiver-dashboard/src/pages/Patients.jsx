import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Navbar } from "../components/Navbar";

export function Patients() {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  
  // Patient removal state
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const loadPatients = useCallback(async () => {
    try {
      setError("");
      const data = await api("/caregiver/patients");
      setPatients(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date());
    } catch (err) {
      setError("Could not load patients. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
    const id = setInterval(loadPatients, 30000);
    return () => clearInterval(id);
  }, [loadPatients]);

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    try {
      setDeleteLoading(true);
      await api(`/caregiver/patients/${patientToDelete.id}`, {
        method: "DELETE",
      });
      setDeleteSuccess(`Patient "${patientToDelete.name}" was unlinked successfully.`);
      setTimeout(() => setDeleteSuccess(""), 4000);
      setPatientToDelete(null);
      await loadPatients();
    } catch (err) {
      alert(`Could not remove patient: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = (patient.name || "").toLowerCase().includes(query);
    const phoneMatch = (patient.phone || "").includes(query);
    return nameMatch || phoneMatch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] tracking-tight">
              Linked Patients
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live medication monitoring & dose status for your family members
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 hidden sm:inline-block">
              Auto-refreshes every 30s &bull; Last: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={loadPatients}
              className="inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-[#1E293B] hover:bg-slate-50 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              to="/settings"
              className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] hover:from-blue-900 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-blue-500/30 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add New Patient
            </Link>
          </div>
        </div>

        {/* Global Delete Notification Banner */}
        {deleteSuccess && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900 font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{deleteSuccess}</span>
            </div>
            <button onClick={() => setDeleteSuccess("")} className="text-amber-700 hover:text-amber-900 text-xs">✕</button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#2563EB] border-t-transparent"></div>
            <p className="mt-4 text-sm text-slate-600 font-medium">Loading patient records...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="my-8 rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-rose-900">{error}</h3>
            <button
              onClick={loadPatients}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && patients.length === 0 && (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#1E293B]">No linked patients yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Add a patient using their name and mobile number.
            </p>
            <Link
              to="/settings"
              className="mt-4 inline-flex items-center px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
            >
              Add Patient Now
            </Link>
          </div>
        )}

        {/* Search Not Found State */}
        {!loading && !error && patients.length > 0 && filteredPatients.length === 0 && (
          <div className="py-16 text-center max-w-md mx-auto bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#1E293B]">No patients found</h3>
            <p className="text-xs text-slate-500 mt-1">
              No matching results for "<strong className="text-[#1E293B]">{searchQuery}</strong>"
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Patients Grid */}
        {!loading && !error && filteredPatients.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => {
              const taken = patient.today?.taken ?? 0;
              const total = patient.today?.total ?? 0;
              const missed = patient.today?.missed ?? 0;
              const adherence = patient.adherence_7d ?? 0;
              const progressPct = total > 0 ? Math.round((taken / total) * 100) : 0;

              return (
                <div
                  key={patient.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group hover:border-blue-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#EFF6FF] to-[#DBEAFE] text-[#1E3A8A] font-bold text-lg flex items-center justify-center border border-blue-200 shadow-inner">
                          {patient.name?.charAt(0) || "P"}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                            {patient.name}
                          </h2>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            +{patient.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {missed > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                            {missed} Missed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            On Track
                          </span>
                        )}

                        {/* Remove / Unlink Patient Icon Button */}
                        <button
                          type="button"
                          onClick={() => setPatientToDelete(patient)}
                          title={`Unlink ${patient.name}`}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-[#1E293B] mb-1.5">
                          <span>Today's Doses</span>
                          <span className="font-bold text-[#1E293B]">
                            {taken} of {total} taken
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#2563EB] to-blue-400 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-xs font-medium text-slate-500">7-Day Adherence</span>
                        <span className={`text-sm font-bold ${
                          total === 0 ? "text-slate-400" : adherence >= 80 ? "text-emerald-600" : adherence >= 50 ? "text-amber-600" : "text-rose-600"
                        }`}>
                          {total === 0 ? "0%" : `${adherence}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Patient #{patient.id}</span>
                    <Link
                      to={`/patient/${patient.id}`}
                      className="inline-flex items-center text-xs font-bold text-[#2563EB] hover:text-[#1E3A8A] group-hover:translate-x-0.5 transition-transform"
                    >
                      View Doses & Adherence
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal to Unlink/Remove Patient */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#1E293B] text-center">Unlink Patient Record?</h3>
            <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800">{patientToDelete.name}</strong> (+{patientToDelete.phone})? 
              This will remove their scheduled doses and active medication alerts from your dashboard.
            </p>

            <div className="mt-6 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeletePatient}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? "Removing..." : "Yes, Unlink Patient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}