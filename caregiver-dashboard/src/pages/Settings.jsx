import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Navbar } from "../components/Navbar";

export function Settings() {
  // Add Patient Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientSuccess, setPatientSuccess] = useState("");
  const [patientError, setPatientError] = useState("");
  const [linkedPatients, setLinkedPatients] = useState([]);

  // Alert Mode state
  const [alertMode, setAlertMode] = useState("every");
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState("");
  const [alertError, setAlertError] = useState("");

  const loadLinkedPatients = async () => {
    try {
      const data = await api("/caregiver/patients");
      if (Array.isArray(data)) setLinkedPatients(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLinkedPatients();
  }, []);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setPatientSuccess("");
    setPatientError("");
    setPatientLoading(true);

    try {
      // Phone numbers: digits only with country code, e.g. 923001234567
      const cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error("Please enter a valid phone number with country code (e.g. 923001234567)");
      }

      const res = await api("/caregiver/patients", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), phone: cleanPhone }),
      });

      setPatientSuccess(`Patient "${name.trim()}" linked successfully! (ID: #${res.id})`);
      setName("");
      setPhone("");
      // Refresh linked patients list
      await loadLinkedPatients();
    } catch (err) {
      setPatientError(err.message || "Failed to add patient.");
    } finally {
      setPatientLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setAlertSuccess("");
    setAlertError("");
    setAlertLoading(true);

    try {
      const res = await api("/caregiver/settings", {
        method: "PUT",
        body: JSON.stringify({ alert_mode: alertMode }),
      });

      setAlertSuccess(`Alert mode updated to "${res.alert_mode === "every" ? "Every Missed Dose" : "Daily Summary"}".`);
    } catch (err) {
      setAlertError(err.message || "Failed to update settings.");
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Caregiver Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage linked loved ones and configure your WhatsApp notification preferences
            </p>
          </div>
          <Link
            to="/patients"
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <svg className="w-4 h-4 mr-1.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Patients List
          </Link>
        </div>

        <div className="space-y-8">
          {/* Add Patient Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="flex items-center space-x-3 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Link New Patient</h2>
                <p className="text-xs text-slate-500">Connect a family member using their WhatsApp mobile number</p>
              </div>
            </div>

            <form onSubmit={handleAddPatient} className="mt-6 space-y-5">
              {patientSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 font-medium">
                    <span>✓</span>
                    <span>{patientSuccess}</span>
                  </div>
                  <Link
                    to="/patients"
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
                  >
                    View in Patients List →
                  </Link>
                </div>
              )}
              {patientError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 font-medium">
                  ⚠ {patientError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Patient Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 923001234567"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-xs"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Digits with country code (e.g. 923001234567 for Pakistan)
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={patientLoading}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {patientLoading ? "Adding Patient..." : "+ Link Patient Now"}
                </button>
              </div>
            </form>

            {/* Currently Linked Patients List */}
            {linkedPatients.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Currently Linked Patients ({linkedPatients.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {linkedPatients.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 font-bold text-sm flex items-center justify-center">
                          {p.name?.charAt(0) || "P"}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">+{p.phone}</div>
                        </div>
                      </div>
                      <Link
                        to={`/patient/${p.id}`}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                      >
                        View &rarr;
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alert Preferences Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="flex items-center space-x-3 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Notification & Alert Mode</h2>
                <p className="text-xs text-slate-500">Choose when DoseCare notifies you about patient doses</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-6 space-y-5">
              {alertSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
                  ✓ {alertSuccess}
                </div>
              )}
              {alertError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 font-medium">
                  ⚠ {alertError}
                </div>
              )}

              <div className="space-y-3">
                <label className="flex items-start p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="alert_mode"
                    value="every"
                    checked={alertMode === "every"}
                    onChange={(e) => setAlertMode(e.target.value)}
                    className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-bold text-slate-900">
                      Alert on Every Missed Dose (Recommended)
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Receive an instant WhatsApp notification the moment a scheduled medication dose is missed.
                    </span>
                  </div>
                </label>

                <label className="flex items-start p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="alert_mode"
                    value="summary"
                    checked={alertMode === "summary"}
                    onChange={(e) => setAlertMode(e.target.value)}
                    className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-bold text-slate-900">
                      Daily Summary Only
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Receive a consolidated adherence summary at the end of each day instead of per-dose alerts.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={alertLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {alertLoading ? "Saving..." : "Save Alert Mode"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}