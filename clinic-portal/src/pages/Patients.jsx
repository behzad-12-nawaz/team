import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Search, 
  Activity, 
  Phone, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Trash2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  HeartPulse
} from 'lucide-react';
import { api, mockControls } from '../api/client';

export function Patients() {
  const [patients, setPatients] = useState([]);
  const [pendingLinks, setPendingLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const isMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api('/doctor/patients');
      setPatients(Array.isArray(data) ? data : []);
      
      if (isMock) {
        setPendingLinks(mockControls.getPendingLinks() || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load patients. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleRevokeLink = async (patient) => {
    if (!window.confirm(`Are you sure you want to unlink patient ${patient.name}? Doctor access will be revoked immediately.`)) {
      return;
    }

    try {
      setActionLoading(patient.id);
      await api(`/doctor-links/${patient.link_id}`, { method: 'DELETE' });
      await fetchPatients();
    } catch (err) {
      alert(`Error revoking link: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateConsent = async (linkId) => {
    mockControls.simulatePatientConsent(linkId);
    await fetchPatients();
  };

  const filteredPatients = patients.filter((p) => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone && p.phone.includes(search))
  );

  // Summary Metrics
  const totalPatients = patients.length;
  const avgAdherence = totalPatients > 0 
    ? Math.round(patients.reduce((sum, p) => sum + (p.adherence_7d || 0), 0) / totalPatients)
    : 0;
  const highRiskCount = patients.filter((p) => (p.adherence_7d || 0) < 80).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Patient Roster</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              Active Care Links
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time adherence monitoring, WhatsApp consent tracking, and prescription management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPatients}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh patient list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <Link
            to="/link-patient"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Link Patient with Code</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Patients</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalPatients}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Verified WhatsApp consent</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg 7-Day Adherence</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{avgAdherence}%</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${avgAdherence >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {avgAdherence >= 80 ? 'Good' : 'Needs Review'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Across all confirmed doses</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High Risk (&lt;80%)</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{highRiskCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Frequent dose skips or misses</p>
          </div>
        </div>

      </div>

      {/* Pending Consent Warning / Section (if any pending) */}
      {pendingLinks.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 animate-spin" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Pending WhatsApp Patient Consent ({pendingLinks.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-700 font-medium">Awaiting patient to tap [Allow]</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingLinks.map((link) => (
              <div key={link.id} className="p-3.5 rounded-xl bg-white border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">{link.patient_name || 'Patient'}</div>
                  <div className="text-[11px] text-slate-500 font-mono">Code: {link.invite_code}</div>
                </div>
                {isMock && (
                  <button
                    onClick={() => handleSimulateConsent(link.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    Simulate 'Allow'
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Patient List Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Search header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients by name or phone..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredPatients.length} of {patients.length} active patients
          </span>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-sky-600/20 border-t-sky-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading linked patients...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Could not retrieve patient records</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchPatients}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No active patients found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search ? 'No patients match your search criteria.' : 'You have not linked any patients yet. Click below to enter a patient invite code.'}
            </p>
            {!search && (
              <Link
                to="/link-patient"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Link Your First Patient
              </Link>
            )}
          </div>
        ) : (
          /* Patients Table / List */
          <div className="divide-y divide-slate-100">
            {filteredPatients.map((patient) => {
              const adherence = patient.adherence_7d ?? 0;
              const adhBadgeColor = adherence >= 80 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : adherence >= 60
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200';

              return (
                <div 
                  key={patient.id} 
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Patient Avatar & Details */}
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-100 to-teal-100 text-sky-800 font-bold flex items-center justify-center shrink-0 text-sm border border-sky-200">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/patient/${patient.id}`}
                          className="font-bold text-sm sm:text-base text-slate-900 hover:text-sky-600 transition-colors"
                        >
                          {patient.name}
                        </Link>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active Link
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        {patient.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            +{patient.phone}
                          </span>
                        )}
                        {patient.condition && (
                          <span className="text-slate-600 font-medium">
                            • {patient.condition}
                          </span>
                        )}
                        <span className="text-slate-400">
                          • Link ID: #{patient.link_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Adherence indicator & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    
                    {/* Adherence Pill */}
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">7-Day Adherence</div>
                      <div className={`mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${adhBadgeColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {adherence}%
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/patient/${patient.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
                      >
                        <span>Manage Plan</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => handleRevokeLink(patient)}
                        disabled={actionLoading === patient.id}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                        title="Revoke doctor link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Safety Policy Notice */}
      <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Physician Access Policy & Patient Control</p>
          <p className="mt-0.5">
            Patients retain full control over medical access at all times. If a patient revokes link access on WhatsApp, 
            the server immediately returns <code className="bg-white px-1 py-0.5 rounded border border-sky-200 text-sky-800 font-mono">403 Forbidden</code> for that patient's records.
            Doctors cannot update prescriptions without the patient's WhatsApp confirmation.
          </p>
        </div>
      </div>

    </div>
  );
}
