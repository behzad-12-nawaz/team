import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Navbar } from "../components/Navbar";

export function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

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
    // 30-second auto refresh as required by Step 5
    const id = setInterval(loadPatients, 30000);
    return () => clearInterval(id);
  }, [loadPatients]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
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
              className="inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent"></div>
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
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">No linked patients yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Add a patient in Settings using their name and mobile number.
            </p>
            <Link
              to="/settings"
              className="mt-4 inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-all shadow-xs"
            >
              Go to Settings
            </Link>
          </div>
        )}

        {/* Patients Grid */}
        {!loading && !error && patients.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => {
              const taken = patient.today?.taken ?? 0;
              const total = patient.today?.total ?? 0;
              const missed = patient.today?.missed ?? 0;
              const adherence = patient.adherence_7d ?? 0;
              const progressPct = total > 0 ? Math.round((taken / total) * 100) : 0;

              return (
                <div
                  key={patient.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center border border-slate-300/60 shadow-inner">
                          {patient.name?.charAt(0) || "P"}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {patient.name}
                          </h2>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            +{patient.phone}
                          </p>
                        </div>
                      </div>

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
                    </div>

                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                          <span>Today's Doses</span>
                          <span className="font-bold text-slate-900">
                            {taken} of {total} taken
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-xs font-medium text-slate-500">7-Day Adherence</span>
                        <span className={`text-sm font-bold ${
                          adherence >= 80 ? "text-emerald-600" : adherence >= 50 ? "text-amber-600" : "text-rose-600"
                        }`}>
                          {adherence}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/75 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Patient #{patient.id}</span>
                    <Link
                      to={`/patient/${patient.id}`}
                      className="inline-flex items-center text-xs font-bold text-teal-700 hover:text-teal-800 group-hover:translate-x-0.5 transition-transform"
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
    </div>
  );
}
