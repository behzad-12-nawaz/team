import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  UserPlus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Smartphone,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { api, mockControls } from '../api/client';

export function LinkPatient() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingLink, setPendingLink] = useState(null);
  const [simulatedAccepted, setSimulatedAccepted] = useState(false);

  const isMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const code = inviteCode.trim().toUpperCase();
      if (!code) throw new Error('Please enter a valid patient invite code.');

      const res = await api('/doctor-links', {
        method: 'POST',
        body: JSON.stringify({ invite_code: code }),
      });

      setPendingLink({
        id: res.id,
        status: res.status, // "pending"
        patient_id: res.patient_id,
        invite_code: code
      });
    } catch (err) {
      setError(err.message || 'Failed to link patient. Please verify the invite code.');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const patients = await api('/doctor/patients');
      if (pendingLink && patients.some((p) => p.id === pendingLink.patient_id || p.link_id === pendingLink.id)) {
        navigate('/');
      } else {
        alert('Patient has not yet consented on WhatsApp. Still in pending state.');
      }
    } catch (err) {
      alert(err.message || 'Error checking status');
    }
  };

  const handleSimulateConsent = () => {
    if (pendingLink && pendingLink.id) {
      mockControls.simulatePatientConsent(pendingLink.id);
      setSimulatedAccepted(true);
      setTimeout(() => {
        navigate('/');
      }, 1200);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      
      {/* Back button */}
      <div className="mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Active Patients
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-sky-50/50 via-teal-50/30 to-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Link Patient to Clinic</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Request access using the patient's WhatsApp invite code. Requires explicit patient consent.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to process invite code</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!pendingLink ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Patient Invite Code
                </label>
                <div className="relative max-w-md">
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ALI-4821"
                    className="w-full px-4 py-3 text-lg font-mono font-bold tracking-widest uppercase rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 shadow-sm transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  The patient can view their invite code on WhatsApp by typing <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">Invite code</code>.
                </p>

                {/* Quick button for demo */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Demo Code:</span>
                  <button
                    type="button"
                    onClick={() => setInviteCode('ALI-4821')}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    ALI-4821 (Ali Khan)
                  </button>
                </div>
              </div>

              {/* Protocol explainer banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Two-Way Consent Protocol</p>
                  <p>
                    As soon as you submit this code, the backend sends an interactive WhatsApp notification to the patient with <b>[Allow]</b> and <b>[Deny]</b> buttons. 
                    Medical records and prescriptions will only unlock after the patient confirms.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Send Consent Request</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* Pending Consent State */
            <div className="space-y-6">
              
              <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-amber-900">
                        Waiting for Patient Consent on WhatsApp
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-800 uppercase">
                        Pending
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mt-1">
                      Link request created for code <b className="font-mono">{pendingLink.invite_code}</b>. 
                      A WhatsApp prompt has been dispatched to the patient's registered phone.
                    </p>
                  </div>
                </div>

                {/* Simulated WhatsApp preview card */}
                <div className="mt-5 p-4 rounded-xl bg-white border border-amber-200 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp Bot Notification Sent to Patient</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100 text-xs text-slate-800 font-sans">
                    <p className="font-semibold text-emerald-950">🏥 DoseCare Clinic Connection Request</p>
                    <p className="mt-1">
                      "Dr. Sarah Ahmed requests permission to link with your DoseCare profile to review adherence and manage your medicine schedule."
                    </p>
                    <div className="mt-3 flex gap-2">
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium text-[11px] shadow-sm">
                        [Allow Access]
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-medium text-[11px]">
                        [Deny]
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {simulatedAccepted && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Patient tapped <b>Allow</b>! Access granted. Redirecting to patient list...</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={checkStatus}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Check Status (Refresh)
                </button>

                {isMock && !simulatedAccepted && (
                  <button
                    type="button"
                    onClick={handleSimulateConsent}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Simulate Patient Tapped 'Allow' (WhatsApp Mock)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPendingLink(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
                >
                  Link Another Code
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
