import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Pill, 
  Clock, 
  Calendar, 
  FileText, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Sparkles,
  Save,
  MessageSquare,
  Activity,
  HeartPulse,
  Info,
  Check,
  ChevronRight,
  RefreshCw,
  Phone
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api, mockControls } from '../api/client';
import { DoseStatusBadge, PrescriptionStatusBadge } from '../components/StatusBadge';

export function PatientPage() {
  const { id } = useParams();
  const patientId = parseInt(id, 10);
  const navigate = useNavigate();

  // State
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doses, setDoses] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [is403Revoked, setIs403Revoked] = useState(false);
  const [error, setError] = useState('');

  // Prescription editing state
  const [activeTab, setActiveTab] = useState('prescription'); // 'prescription' | 'adherence' | 'report' | 'notes'
  const [editedMedicines, setEditedMedicines] = useState([]);
  const [newMedForm, setNewMedForm] = useState(null);
  const [savingRx, setSavingRx] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Local doctor notes (stretch feature)
  const notesKey = `dosecare_doc_notes_p${patientId}`;
  const [notes, setNotes] = useState(() => localStorage.getItem(notesKey) || '');
  const [notesSavedAlert, setNotesSavedAlert] = useState(false);

  const isMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const loadData = async () => {
    setLoading(true);
    setError('');
    setIs403Revoked(false);

    try {
      // 1. Fetch patients list to locate this patient
      const patients = await api('/doctor/patients');
      const currentPatient = (Array.isArray(patients) ? patients : []).find((p) => p.id === patientId);
      
      if (!currentPatient) {
        // If not found in active links, could be revoked or non-existent
        const err = new Error('Access to this patient has ended');
        err.status = 403;
        throw err;
      }
      setPatient(currentPatient);

      // 2. Fetch active prescriptions
      const rxData = await api(`/patients/${patientId}/prescriptions?status=active`);
      const rxList = Array.isArray(rxData) ? rxData : [rxData];
      setPrescriptions(rxList);

      // Prepare initial state for prescription editor
      if (rxList.length > 0 && rxList[0].medicines) {
        setEditedMedicines(
          rxList[0].medicines.map((m, idx) => ({
            id: idx + 1,
            name: m.name,
            dose: m.dose || '',
            times: Array.isArray(m.times) ? [...m.times] : ['08:00'],
            days: m.days || 30,
            instructions: m.instructions || '',
            action: 'keep' // 'keep' | 'change' | 'stop'
          }))
        );
      }

      // 3. Fetch doses log
      const doseData = await api(`/patients/${patientId}/doses`);
      setDoses(Array.isArray(doseData) ? doseData : []);

      // 4. Fetch weekly report
      const repData = await api(`/reports/${patientId}/weekly`);
      setWeeklyReport(repData);

    } catch (err) {
      if (err.status === 403 || err.detail === 'Access to this patient has ended' || err.message?.includes('Access to this patient has ended')) {
        setIs403Revoked(true);
      } else {
        setError(err.message || 'Failed to load patient records');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  // Handle Prescription Action (Keep, Change, Stop)
  const setMedicineAction = (medIndex, action) => {
    setEditedMedicines((prev) =>
      prev.map((m, i) => (i === medIndex ? { ...m, action } : m))
    );
  };

  const updateMedicineField = (medIndex, field, value) => {
    setEditedMedicines((prev) =>
      prev.map((m, i) => {
        if (i !== medIndex) return m;
        if (field === 'times') {
          // split comma separated values
          const timesArr = value.split(',').map((t) => t.trim()).filter(Boolean);
          return { ...m, times: timesArr };
        }
        return { ...m, [field]: value };
      })
    );
  };

  const handleAddNewMedicine = (e) => {
    e.preventDefault();
    if (!newMedForm.name.trim()) return;

    const timesArr = newMedForm.times.split(',').map((t) => t.trim()).filter(Boolean);
    const newMed = {
      id: Date.now(),
      name: newMedForm.name.trim(),
      dose: newMedForm.dose.trim(),
      times: timesArr.length > 0 ? timesArr : ['08:00'],
      days: parseInt(newMedForm.days, 10) || 30,
      instructions: newMedForm.instructions.trim(),
      action: 'change' // new medicine is intrinsically a change
    };

    setEditedMedicines((prev) => [...prev, newMed]);
    setNewMedForm(null);
  };

  // Submit New Prescription (POST /prescriptions)
  const handleSavePrescription = async () => {
    const activeRx = prescriptions[0] || {};
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const doctorUserId = user.user_id || 5;

    // Filter out stopped medicines
    const medicinesToKeepOrChange = editedMedicines
      .filter((m) => m.action !== 'stop')
      .map((m) => ({
        name: m.name,
        dose: m.dose,
        times: m.times,
        days: m.days,
        instructions: m.instructions || null
      }));

    if (medicinesToKeepOrChange.length === 0) {
      if (!window.confirm('All medicines are marked stopped. Are you sure you want to prescribe 0 active medications?')) {
        return;
      }
    }

    setSavingRx(true);
    setSaveSuccessMsg('');

    try {
      const payload = {
        patient_id: patientId,
        prescribed_by: doctorUserId,
        supersedes_id: activeRx.id || 11,
        medicines: medicinesToKeepOrChange
      };

      const res = await api('/prescriptions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSaveSuccessMsg(
        `Prescription updated (v${res.version})! Status is "${res.status}". Patient will receive a WhatsApp message to confirm.`
      );

      // Re-fetch active data
      await loadData();
    } catch (err) {
      alert(`Error updating prescription: ${err.message}`);
    } finally {
      setSavingRx(false);
    }
  };

  // Download PDF Report
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await api(`/reports/${patientId}/weekly.pdf`);
      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Weekly_Report_${patient?.name?.replace(/\s+/g, '_') || 'Patient'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Could not download PDF: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Save notes locally
  const handleSaveNotes = () => {
    localStorage.setItem(notesKey, notes);
    setNotesSavedAlert(true);
    setTimeout(() => setNotesSavedAlert(false), 2500);
  };

  // Simulate Revoke (for contract test & demo)
  const handleSimulateRevoke = () => {
    if (window.confirm("Simulate patient sending 'Revoke doctor access' on WhatsApp?")) {
      mockControls.simulatePatientRevoke(patientId);
      loadData();
    }
  };

  // ================= 403 Access Revoked Screen =================
  if (is403Revoked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl shadow-xl border border-rose-200 p-8 sm:p-12 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
              Contract Enforced: 403 Forbidden
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Access to this patient has ended
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              The patient has revoked clinic consent on WhatsApp. Under the DoseCare medical privacy contract, 
              physician queries and medication changes are immediately restricted.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 max-w-md mx-auto text-left">
            <p className="font-semibold text-slate-700">DoseCare Safety Guarantee:</p>
            <p className="mt-0.5">
              The patient's daily WhatsApp reminders continue uninterrupted for their safety, 
              but external clinical modification is blocked until a new consent invitation is approved.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              to="/"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Patient Roster
            </Link>

            {isMock && (
              <button
                onClick={() => {
                  mockControls.reset();
                  loadData();
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Reset Demo Data
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= Loading & General Error States =================
  if (loading) {
    return (
      <div className="py-32 text-center">
        <div className="w-12 h-12 border-3 border-sky-600/20 border-t-sky-600 rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-sm font-bold text-slate-700">Loading Clinical Records</h2>
        <p className="text-xs text-slate-400 mt-1">Retrieving prescriptions, doses, and adherence logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Error Loading Patient</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700"
            >
              Retry
            </button>
            <Link
              to="/"
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Back to Patients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeRx = prescriptions[0] || {};
  const adherence = patient?.adherence_7d ?? weeklyReport?.adherence ?? 86;

  // Chart Data preparation
  const chartData = (weeklyReport?.rows || []).slice(-7).map((r, i) => ({
    name: r.date ? r.date.split('-').slice(1).join('/') : `Day ${i + 1}`,
    taken: r.status === 'CONFIRMED' || r.status === 'CONFIRMED_LATE' ? 1 : 0,
    missed: r.status === 'MISSED' ? 1 : 0,
    skipped: r.status === 'SKIPPED' ? 1 : 0,
    medicine: r.medicine
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Patient Roster
        </Link>

        {isMock && (
          <button
            onClick={handleSimulateRevoke}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors"
            title="Simulate patient sending 'revoke' on WhatsApp"
          >
            Simulate Patient Revoking Consent (Test 403)
          </button>
        )}
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-400 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
            {patient?.name?.charAt(0) || 'P'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{patient?.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified Link #{patient?.link_id}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                +{patient?.phone}
              </span>
              <span>• Age: {patient?.age || 68} yrs</span>
              <span>• {patient?.condition || 'Long-term medication adherence'}</span>
            </div>
          </div>
        </div>

        {/* Adherence Badge & Report Action */}
        <div className="flex flex-wrap items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="p-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">7-Day Adherence</div>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <HeartPulse className="w-4 h-4 text-emerald-600" />
              <span className="text-xl font-black text-slate-900">{adherence}%</span>
            </div>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download Weekly PDF'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('prescription')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
            activeTab === 'prescription'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Prescription Management</span>
          {prescriptions.some((r) => r.status === 'waiting_patient') && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('adherence')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
            activeTab === 'adherence'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Dose Adherence Log ({doses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
            activeTab === 'report'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Weekly Report & Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
            activeTab === 'notes'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Clinical Notes (Stretch)</span>
        </button>
      </div>

      {/* ================= TAB 1: PRESCRIPTION EDITOR ================= */}
      {activeTab === 'prescription' && (
        <div className="space-y-6">
          
          {saveSuccessMsg && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="font-bold">WhatsApp Confirmation Dispatched</p>
                <p className="mt-0.5">{saveSuccessMsg}</p>
              </div>
            </div>
          )}

          {/* Active Prescription Header Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Current Medicine Regimen</h2>
                  <PrescriptionStatusBadge status={activeRx.status || 'active'} />
                  <span className="text-xs text-slate-500 font-mono">v{activeRx.version || 1}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Physicians can <b>Keep</b>, <b>Change</b>, or <b>Stop</b> medications. Changes require WhatsApp confirmation from the patient.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNewMedForm({ name: '', dose: '', times: '08:00', days: 30, instructions: '' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New Medicine
              </button>
            </div>

            {/* Safety Protocol Reminder */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">DoseCare Safety Contract</p>
                <p>
                  The system never automatically suggests medicine changes or doses. Any doctor modification creates a 
                  <code className="mx-1 px-1 py-0.5 bg-amber-50 border border-amber-200 rounded text-amber-800 font-mono">waiting_patient</code> record 
                  and notifies the patient's WhatsApp. Current doses run until confirmed.
                </p>
              </div>
            </div>
          </div>

          {/* Add Medicine Form Modal/Box */}
          {newMedForm && (
            <div className="bg-white rounded-2xl shadow-md border-2 border-sky-400 p-6 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-600" />
                  Prescribe Additional Medication
                </h3>
                <button
                  type="button"
                  onClick={() => setNewMedForm(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddNewMedicine} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Glimepiride"
                    value={newMedForm.name}
                    onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dose / Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 mg"
                    value={newMedForm.dose}
                    onChange={(e) => setNewMedForm({ ...newMedForm, dose: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Times (24h, comma separated)</label>
                  <input
                    type="text"
                    placeholder="08:00, 20:00"
                    value={newMedForm.times}
                    onChange={(e) => setNewMedForm({ ...newMedForm, times: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newMedForm.days}
                    onChange={(e) => setNewMedForm({ ...newMedForm, days: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Take before breakfast"
                    value={newMedForm.instructions}
                    onChange={(e) => setNewMedForm({ ...newMedForm, instructions: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3 pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMedForm(null)}
                    className="px-3 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700"
                  >
                    Add to Updated Plan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Medication Cards List with Keep / Change / Stop */}
          <div className="space-y-4">
            {editedMedicines.map((med, index) => {
              const isStopped = med.action === 'stop';
              const isChanged = med.action === 'change';
              const isKeep = med.action === 'keep';

              return (
                <div 
                  key={med.id || index}
                  className={`bg-white rounded-2xl shadow-sm border transition-all p-5 ${
                    isStopped 
                      ? 'border-rose-200 bg-rose-50/30 opacity-75' 
                      : isChanged 
                      ? 'border-sky-300 ring-2 ring-sky-500/10' 
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    
                    {/* Left: Medication Info & Input fields if changed */}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isStopped ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-700'
                        }`}>
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className={`text-base font-bold ${isStopped ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {med.name}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            Current: {med.dose || 'Standard dose'}
                          </span>
                        </div>
                      </div>

                      {/* Editing fields when Change is selected */}
                      {isChanged ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dose / Strength</label>
                            <input
                              type="text"
                              value={med.dose}
                              onChange={(e) => updateMedicineField(index, 'dose', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dose Times (24h)</label>
                            <input
                              type="text"
                              value={med.times.join(', ')}
                              onChange={(e) => updateMedicineField(index, 'times', e.target.value)}
                              placeholder="08:00, 20:00"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Duration (Days)</label>
                            <input
                              type="number"
                              value={med.days}
                              onChange={(e) => updateMedicineField(index, 'days', parseInt(e.target.value, 10))}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Instructions</label>
                            <input
                              type="text"
                              value={med.instructions || ''}
                              onChange={(e) => updateMedicineField(index, 'instructions', e.target.value)}
                              placeholder="e.g. after dinner"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                            />
                          </div>
                        </div>
                      ) : (
                        /* Read-only view when Keep or Stop */
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Times</span>
                            <span className="font-mono font-medium">{med.times.join(', ')}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Days</span>
                            <span>{med.days} days</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Instructions</span>
                            <span>{med.instructions || 'Standard administration'}</span>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Right: Keep / Change / Stop Button Toggle Group */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => setMedicineAction(index, 'keep')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isKeep 
                            ? 'bg-white text-emerald-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Keep
                      </button>

                      <button
                        type="button"
                        onClick={() => setMedicineAction(index, 'change')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isChanged 
                            ? 'bg-sky-600 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Change
                      </button>

                      <button
                        type="button"
                        onClick={() => setMedicineAction(index, 'stop')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isStopped 
                            ? 'bg-rose-600 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-rose-600'
                        }`}
                      >
                        Stop
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Save / Dispatch Actions Footer */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-800">Ready to submit updated prescription?</p>
              <p className="text-xs text-slate-500">
                Creates a new version with status <code className="text-amber-800 font-mono">waiting_patient</code>. 
                Patient will verify and tap Confirm on WhatsApp.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSavePrescription}
              disabled={savingRx}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {savingRx ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Dispatch for Patient Consent</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* ================= TAB 2: DOSE ADHERENCE LOG ================= */}
      {activeTab === 'adherence' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Scheduled & Logged Doses</h3>
                <p className="text-xs text-slate-500">Directly from the DoseCare reminder engine</p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Total records: {doses.length}
              </span>
            </div>

            {doses.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No doses found for this patient.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Dose ID</th>
                      <th className="px-5 py-3.5">Medicine</th>
                      <th className="px-5 py-3.5">Dosage</th>
                      <th className="px-5 py-3.5">Scheduled UTC</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Reminders Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doses.map((dose) => (
                      <tr key={dose.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3 font-mono text-slate-400">#{dose.id}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{dose.medicine}</td>
                        <td className="px-5 py-3 text-slate-600">{dose.dose}</td>
                        <td className="px-5 py-3 font-mono text-slate-600">
                          {dose.scheduled_at?.replace('T', ' ')?.replace('Z', ' UTC')}
                        </td>
                        <td className="px-5 py-3">
                          <DoseStatusBadge status={dose.status} />
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-700">
                          {dose.reminder_count} of 3
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: WEEKLY REPORT & CHART ================= */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          
          {/* Adherence Chart Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">7-Day Adherence Visualization</h3>
                <p className="text-xs text-slate-500">
                  Daily taken (confirmed) vs missed doses
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Taken
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Missed
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="taken" name="Taken" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missed" name="Missed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Report Rows Table */}
          {weeklyReport && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Weekly Adherence Table</h3>
                  <p className="text-xs text-slate-500">
                    Period: {weeklyReport.week_start} to {weeklyReport.week_end} • Adherence: <b>{weeklyReport.adherence}%</b>
                  </p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Export PDF
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Medicine</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(weeklyReport.rows || []).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-medium text-slate-700">{row.date}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{row.medicine}</td>
                        <td className="px-5 py-3">
                          <DoseStatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= TAB 4: CLINICAL NOTES (STRETCH) ================= */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Physician Clinical Notes</h3>
              <p className="text-xs text-slate-500">
                Observational remarks regarding patient response and medication compliance.
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Stored Locally on Device
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-800 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <b>Note:</b> In accordance with the DoseCare contract, server-side clinical notes are a stretch feature. 
              These observations are saved safely in your local browser storage until a formal notes API contract is published.
            </span>
          </div>

          {notesSavedAlert && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Notes saved to local storage!</span>
            </div>
          )}

          <textarea
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter clinical observations, blood pressure / sugar levels, or follow-up instructions..."
            className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-sans"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveNotes}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Observations Locally
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
