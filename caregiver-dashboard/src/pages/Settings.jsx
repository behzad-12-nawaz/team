import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Navbar } from "../components/Navbar";

export function Settings() {
  const [activeTab, setActiveTab] = useState("general"); // "general" | "history"

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

  // Patient Delete state
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // History Archive state
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryModal, setSelectedHistoryModal] = useState(null);
  const [relinkLoading, setRelinkLoading] = useState(null);
  const [relinkSuccess, setRelinkSuccess] = useState("");

  const loadData = async () => {
    try {
      const patientsData = await api("/caregiver/patients");
      if (Array.isArray(patientsData)) setLinkedPatients(patientsData);

      const historyData = await api("/caregiver/history");
      if (Array.isArray(historyData)) setHistoryList(historyData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setPatientSuccess("");
    setPatientError("");
    setPatientLoading(true);

    try {
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
      await loadData();
    } catch (err) {
      setPatientError(err.message || "Failed to add patient.");
    } finally {
      setPatientLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    try {
      setDeleteLoading(true);
      await api(`/caregiver/patients/${patientToDelete.id}`, {
        method: "DELETE",
      });
      setPatientToDelete(null);
      await loadData();
    } catch (err) {
      alert(`Could not remove patient: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRelink = async (historyItem) => {
    try {
      setRelinkLoading(historyItem.id);
      setRelinkSuccess("");
      await api(`/caregiver/history/${historyItem.id}/relink`, {
        method: "POST",
      });
      setRelinkSuccess(`✓ ${historyItem.name} has been restored to your active dashboard!`);
      setTimeout(() => setRelinkSuccess(""), 4000);
      await loadData();
    } catch (err) {
      alert(`Could not relink: ${err.message}`);
    } finally {
      setRelinkLoading(null);
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

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return isoString;
    }
  };

  const filteredHistory = historyList.filter((item) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase().trim();
    return (
      (item.name || "").toLowerCase().includes(q) ||
      (item.phone || "").includes(q) ||
      (item.medicines || []).some((m) => m.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] tracking-tight">
              Caregiver Settings & Archives
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage active loved ones, configure notifications, and view permanent medical journey logs
            </p>
          </div>
          <Link
            to="/patients"
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-[#1E293B] text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <svg className="w-4 h-4 mr-1.5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Patients List
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-slate-200 mb-8 pb-1">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "general"
                ? "bg-[#EFF6FF] text-[#1E3A8A] border-b-2 border-[#2563EB] shadow-xs"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            ⚙️ General & Link Patient
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === "history"
                ? "bg-[#EFF6FF] text-[#1E3A8A] border-b-2 border-[#2563EB] shadow-xs"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>📜 Patient History & Medical Archive</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#2563EB] text-white">
              {historyList.length}
            </span>
          </button>
        </div>

        {/* Tab 1: General Settings & Link Patient */}
        {activeTab === "general" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Add Patient Section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
              <div className="flex items-center space-x-3 pb-5 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-blue-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Link New Patient</h2>
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-1.5">
                      Patient Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tariq Mehmood"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm shadow-xs text-[#1E293B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-1.5">
                      WhatsApp Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 923001234567"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm shadow-xs text-[#1E293B]"
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
                    className="px-5 py-2.5 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] hover:from-blue-900 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {patientLoading ? "Adding Patient..." : "Link Patient Now"}
                  </button>
                </div>
              </form>

              {/* Currently Linked Patients List with Unlink Action */}
              {linkedPatients.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Currently Linked Patients ({linkedPatients.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {linkedPatients.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E3A8A] font-bold text-sm flex items-center justify-center border border-blue-200">
                            {p.name?.charAt(0) || "P"}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#1E293B]">{p.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">+{p.phone}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/patient/${p.id}`}
                            className="text-xs font-semibold text-[#2563EB] hover:text-[#1E3A8A] px-2 py-1 rounded-md hover:bg-blue-50"
                          >
                            View &rarr;
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPatientToDelete(p)}
                            title={`Unlink ${p.name}`}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Alert Preferences Section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
              <div className="flex items-center space-x-3 pb-5 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Notification & Alert Mode</h2>
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
                  <label className="flex items-start p-4 rounded-xl border border-slate-200 hover:bg-[#EFF6FF]/40 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="alert_mode"
                      value="every"
                      checked={alertMode === "every"}
                      onChange={(e) => setAlertMode(e.target.value)}
                      className="mt-1 h-4 w-4 text-[#2563EB] focus:ring-[#2563EB] border-slate-300"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-[#1E293B]">
                        Alert on Every Missed Dose (Recommended)
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Receive an instant WhatsApp notification the moment a scheduled medication dose is missed.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start p-4 rounded-xl border border-slate-200 hover:bg-[#EFF6FF]/40 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="alert_mode"
                      value="summary"
                      checked={alertMode === "summary"}
                      onChange={(e) => setAlertMode(e.target.value)}
                      className="mt-1 h-4 w-4 text-[#2563EB] focus:ring-[#2563EB] border-slate-300"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-[#1E293B]">
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
                    className="px-5 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {alertLoading ? "Saving..." : "Save Alert Mode"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Patient History & Medical Records Archive */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B] flex items-center space-x-2">
                    <span>📜 Permanent Medical Journey Archive</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Full history of all active, finished, or unlinked patients. Records are never deleted.
                  </p>
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search history by name, phone or medicine..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                  />
                </div>
              </div>

              {relinkSuccess && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
                  {relinkSuccess}
                </div>
              )}

              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No historical records matching "{historySearch}".
                </div>
              ) : (
                <div className="mt-6 divide-y divide-slate-100">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 p-3 rounded-2xl transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                          item.status === "Active"
                            ? "bg-[#EFF6FF] text-[#2563EB] border border-blue-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {item.name?.charAt(0) || "P"}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-bold text-[#1E293B]">{item.name}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              item.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                            <span>Phone: <strong className="text-slate-700">+{item.phone}</strong></span>
                            <span>&bull;</span>
                            <span>Linked: <strong className="text-slate-700">{formatDate(item.linked_at)}</strong></span>
                            {item.unlinked_at && (
                              <>
                                <span>&bull;</span>
                                <span>Completed/Unlinked: <strong className="text-slate-700">{formatDate(item.unlinked_at)}</strong></span>
                              </>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-slate-600">
                            <strong>Medicines Logged:</strong>{" "}
                            {Array.isArray(item.medicines) && item.medicines.length > 0
                              ? item.medicines.join(", ")
                              : "No active medicines"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryModal(item)}
                          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-xs cursor-pointer"
                        >
                          📋 View Medical Summary
                        </button>

                        {item.status !== "Active" && (
                          <button
                            type="button"
                            disabled={relinkLoading === item.id}
                            onClick={() => handleRelink(item)}
                            className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {relinkLoading === item.id ? "Restoring..." : "↻ Re-link"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Medical Summary Detail Modal */}
      {selectedHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Medical Journey Summary</h3>
                <p className="text-xs text-blue-100">{selectedHistoryModal.name} &bull; +{selectedHistoryModal.phone}</p>
              </div>
              <button
                onClick={() => setSelectedHistoryModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Status</span>
                  <span className="font-bold text-slate-800">{selectedHistoryModal.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Overall Compliance</span>
                  <span className="font-bold text-emerald-600">{selectedHistoryModal.adherence_overall || 0}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">First Linked Date</span>
                  <span className="font-bold text-slate-800">{formatDate(selectedHistoryModal.linked_at)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Completed Date</span>
                  <span className="font-bold text-slate-800">{formatDate(selectedHistoryModal.unlinked_at)}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Prescription & Medicine History
                </h4>
                <div className="space-y-1.5">
                  {(selectedHistoryModal.medicines || []).map((med, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center space-x-2">
                      <span className="text-[#2563EB]">💊</span>
                      <span>{med}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Medical Notes & Journey Outcome
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedHistoryModal.doctor_notes || "Caregiver monitored medication schedule. Complete history preserved."}
                </p>
              </div>
            </div>

            <div className="bg-[#F8FAFC] px-6 py-3.5 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedHistoryModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

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
              Their medical history will be safely preserved in your <strong>History Archive</strong>, and you can re-link them at any time.
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
                {deleteLoading ? "Archiving..." : "Yes, Unlink & Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}