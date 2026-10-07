import mockData from "../mock/data.json" with { type: "json" };

// Safe mock detection: defaults to true if VITE_USE_MOCK is "true" or undefined/dev mode
const USE_MOCK = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_USE_MOCK === "false" ? false : true;
const BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:8000";

// In-memory/localStorage state for interactive mock testing
const STORAGE_KEY_PATIENTS = "dosecare_mock_doctor_patients";
const STORAGE_KEY_PRESCRIPTIONS = "dosecare_mock_prescriptions";
const STORAGE_KEY_PENDING_LINKS = "dosecare_mock_pending_links";
const STORAGE_KEY_REVOKED_PATIENTS = "dosecare_mock_revoked_patient_ids";

const memoryStore = {};

function getStoredMock(key, fallback) {
  try {
    if (typeof localStorage !== "undefined") {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    }
    return memoryStore[key] ? JSON.parse(memoryStore[key]) : fallback;
  } catch {
    return fallback;
  }
}

function setStoredMock(key, val) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(val));
    } else {
      memoryStore[key] = JSON.stringify(val);
    }
  } catch (e) {
    console.warn("Storage error", e);
  }
}

// MOCK: replace on merge day
async function mockResponse(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const urlObj = new URL(path, "http://localhost");
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // Simulate network latency for realism
  await new Promise((r) => setTimeout(r, 150));

  // 1. POST /auth/login
  if (pathname === "/auth/login" && method === "POST") {
    const body = options.body ? JSON.parse(options.body) : {};
    return {
      access_token: "mock-token-doctor",
      role: "doctor",
      user_id: 5,
      name: body.email ? `Dr. ${body.email.split("@")[0].replace(".", " ")}` : "Dr. Sarah Ahmed"
    };
  }

  // 2. GET /doctor/patients
  if (pathname === "/doctor/patients" && method === "GET") {
    const patients = getStoredMock(STORAGE_KEY_PATIENTS, mockData.doctor_patients);
    return patients;
  }

  // 3. POST /doctor-links
  if (pathname === "/doctor-links" && method === "POST") {
    const body = options.body ? JSON.parse(options.body) : {};
    const code = (body.invite_code || "").trim().toUpperCase();

    const pending = getStoredMock(STORAGE_KEY_PENDING_LINKS, mockData.pending_links);
    const newLink = {
      id: Math.floor(Math.random() * 800) + 20,
      patient_id: Math.floor(Math.random() * 100) + 10,
      invite_code: code,
      patient_name: code === "ALI-4821" ? "Ali Khan" : `Patient (${code})`,
      status: "pending",
      created_at: new Date().toISOString()
    };
    pending.unshift(newLink);
    setStoredMock(STORAGE_KEY_PENDING_LINKS, pending);

    return {
      id: newLink.id,
      status: "pending",
      patient_id: newLink.patient_id,
      invite_code: code
    };
  }

  // 4. DELETE /doctor-links/{id}
  const deleteLinkMatch = pathname.match(/^\/doctor-links\/(\d+)$/);
  if (deleteLinkMatch && method === "DELETE") {
    const linkId = parseInt(deleteLinkMatch[1], 10);
    // Remove from doctor_patients
    let patients = getStoredMock(STORAGE_KEY_PATIENTS, mockData.doctor_patients);
    const patientToRemove = patients.find((p) => p.link_id === linkId);
    if (patientToRemove) {
      // track as revoked
      const revoked = getStoredMock(STORAGE_KEY_REVOKED_PATIENTS, []);
      if (!revoked.includes(patientToRemove.id)) {
        revoked.push(patientToRemove.id);
        setStoredMock(STORAGE_KEY_REVOKED_PATIENTS, revoked);
      }
    }
    patients = patients.filter((p) => p.link_id !== linkId);
    setStoredMock(STORAGE_KEY_PATIENTS, patients);
    return { id: linkId, status: "revoked" };
  }

  // Check if patient access was revoked (Simulate 403 Forbidden as per Contract)
  const patientIdMatch = pathname.match(/^\/patients\/(\d+)/) || pathname.match(/^\/reports\/(\d+)/);
  if (patientIdMatch) {
    const targetPatientId = parseInt(patientIdMatch[1], 10);
    const revoked = getStoredMock(STORAGE_KEY_REVOKED_PATIENTS, []);
    if (revoked.includes(targetPatientId) || targetPatientId === 999) {
      const err = new Error("Access to this patient has ended");
      err.status = 403;
      err.detail = "Access to this patient has ended";
      throw err;
    }
  }

  // 5. GET /patients/{id}/prescriptions?status=active
  const rxMatch = pathname.match(/^\/patients\/(\d+)\/prescriptions$/);
  if (rxMatch && method === "GET") {
    const patientId = parseInt(rxMatch[1], 10);
    const allRx = getStoredMock(STORAGE_KEY_PRESCRIPTIONS, mockData.active_prescriptions);
    const matching = allRx.filter((r) => r.patient_id === patientId || (!r.patient_id && patientId === 1));
    return matching.length > 0 ? matching : mockData.active_prescriptions;
  }

  // 6. POST /prescriptions
  if (pathname === "/prescriptions" && method === "POST") {
    const body = options.body ? JSON.parse(options.body) : {};
    const allRx = getStoredMock(STORAGE_KEY_PRESCRIPTIONS, mockData.active_prescriptions);
    const newId = Math.floor(Math.random() * 900) + 100;
    const currentVersion = body.supersedes_id ? 2 : 1;

    const newPrescription = {
      id: newId,
      patient_id: body.patient_id || 1,
      prescribed_by: body.prescribed_by || 5,
      supersedes_id: body.supersedes_id || null,
      status: body.prescribed_by ? "waiting_patient" : "draft",
      version: currentVersion,
      created_at: new Date().toISOString(),
      medicines: body.medicines || []
    };

    allRx.push(newPrescription);
    setStoredMock(STORAGE_KEY_PRESCRIPTIONS, allRx);

    return {
      id: newId,
      status: newPrescription.status, // "waiting_patient" per contract when prescribed_by is set
      version: currentVersion
    };
  }

  // 7. GET /patients/{id}/doses
  const dosesMatch = pathname.match(/^\/patients\/(\d+)\/doses$/);
  if (dosesMatch && method === "GET") {
    return mockData.doses;
  }

  // 8. GET /reports/{patient_id}/weekly
  const weeklyMatch = pathname.match(/^\/reports\/(\d+)\/weekly$/);
  if (weeklyMatch && method === "GET") {
    const patientId = parseInt(weeklyMatch[1], 10);
    const patients = getStoredMock(STORAGE_KEY_PATIENTS, mockData.doctor_patients);
    const p = patients.find((pat) => pat.id === patientId);
    return {
      ...mockData.weekly_report,
      patient_name: p ? p.name : mockData.weekly_report.patient_name
    };
  }

  // 9. GET /reports/{patient_id}/weekly.pdf
  const pdfMatch = pathname.match(/^\/reports\/(\d+)\/weekly\.pdf$/);
  if (pdfMatch && method === "GET") {
    return new Blob(["%PDF-1.4 Mock DoseCare Weekly Report..."], { type: "application/pdf" });
  }

  throw new Error(`Mock endpoint not implemented: ${method} ${path}`);
}

export async function api(path, options = {}) {
  if (USE_MOCK) {
    return mockResponse(path, options); // MOCK: replace on merge day
  }

  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...options.headers
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.detail || `Error ${res.status}`);
    err.status = res.status;
    err.detail = errorData.detail;
    throw err;
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/pdf")) {
    return res.blob();
  }

  return res.json();
}

// Helpers for mock controls during testing/demo
export const mockControls = {
  reset() {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_PATIENTS);
      localStorage.removeItem(STORAGE_KEY_PRESCRIPTIONS);
      localStorage.removeItem(STORAGE_KEY_PENDING_LINKS);
      localStorage.removeItem(STORAGE_KEY_REVOKED_PATIENTS);
    }
    delete memoryStore[STORAGE_KEY_PATIENTS];
    delete memoryStore[STORAGE_KEY_PRESCRIPTIONS];
    delete memoryStore[STORAGE_KEY_PENDING_LINKS];
    delete memoryStore[STORAGE_KEY_REVOKED_PATIENTS];
  },
  getPendingLinks() {
    return getStoredMock(STORAGE_KEY_PENDING_LINKS, mockData.pending_links);
  },
  simulatePatientConsent(linkId) {
    // Moves a pending link to active doctor_patients
    const pending = getStoredMock(STORAGE_KEY_PENDING_LINKS, mockData.pending_links);
    const link = pending.find((l) => l.id === linkId);
    if (!link) return false;

    const remaining = pending.filter((l) => l.id !== linkId);
    setStoredMock(STORAGE_KEY_PENDING_LINKS, remaining);

    const patients = getStoredMock(STORAGE_KEY_PATIENTS, mockData.doctor_patients);
    patients.push({
      id: link.patient_id,
      name: link.patient_name,
      phone: "923005556677",
      link_id: link.id,
      adherence_7d: 92,
      status: "active",
      age: 65,
      condition: "Ongoing Care"
    });
    setStoredMock(STORAGE_KEY_PATIENTS, patients);
    return true;
  },
  simulatePatientRevoke(patientId) {
    const revoked = getStoredMock(STORAGE_KEY_REVOKED_PATIENTS, []);
    if (!revoked.includes(patientId)) {
      revoked.push(patientId);
      setStoredMock(STORAGE_KEY_REVOKED_PATIENTS, revoked);
    }
  }
};
