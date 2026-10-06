import mock from "../mock/data.json";

// Safe mock detection: defaults to true if VITE_USE_MOCK is "true" or undefined/dev mode
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Initial seed patients
const SEED_PATIENTS = [
  { id: 1, name: "Ali Khan", phone: "923001234567", today: { taken: 1, total: 3, missed: 1 }, adherence_7d: 86 },
  { id: 3, name: "Amina Bibi", phone: "923007654321", today: { taken: 2, total: 2, missed: 0 }, adherence_7d: 100 }
];

// Seed doses strictly for the 2 fixture patients
const INITIAL_SEED_DOSES = {
  "1": [
    { id: 101, patient_id: 1, medicine: "Metformin", dose: "500 mg", scheduled_at: "2026-10-06T03:00:00Z", status: "CONFIRMED", reminder_count: 1 },
    { id: 102, patient_id: 1, medicine: "Amlodipine", dose: "5 mg", scheduled_at: "2026-10-06T04:00:00Z", status: "MISSED", reminder_count: 3 },
    { id: 103, patient_id: 1, medicine: "Metformin", dose: "500 mg", scheduled_at: "2026-10-06T15:00:00Z", status: "NOTIFIED", reminder_count: 2 },
    { id: 104, patient_id: 1, medicine: "Metformin", dose: "500 mg", scheduled_at: "2026-10-07T03:00:00Z", status: "SCHEDULED", reminder_count: 0 }
  ],
  "3": [
    { id: 301, patient_id: 3, medicine: "Lisinopril", dose: "10 mg", scheduled_at: "2026-10-06T03:00:00Z", status: "CONFIRMED", reminder_count: 1 },
    { id: 302, patient_id: 3, medicine: "Calcium + Vit D3", dose: "600 mg", scheduled_at: "2026-10-06T09:00:00Z", status: "CONFIRMED", reminder_count: 1 }
  ]
};

function getMockPatients() {
  try {
    const saved = localStorage.getItem("dosecare_mock_patients_v4");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return SEED_PATIENTS;
}

function saveMockPatients(patients) {
  try {
    localStorage.setItem("dosecare_mock_patients_v4", JSON.stringify(patients));
  } catch (e) {
    console.error(e);
  }
}

function getAllMockDosesMap() {
  try {
    const saved = localStorage.getItem("dosecare_mock_all_doses_map_v4");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_SEED_DOSES;
}

function saveAllMockDosesMap(map) {
  try {
    localStorage.setItem("dosecare_mock_all_doses_map_v4", JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}

function getDosesForPatient(patientId) {
  const map = getAllMockDosesMap();
  const pidStr = String(patientId);

  if (map[pidStr]) {
    return map[pidStr];
  }

  map[pidStr] = [];
  saveAllMockDosesMap(map);
  return [];
}

function syncPatientStats(patientId) {
  const doses = getDosesForPatient(patientId);
  const taken = doses.filter(d => d.status === "CONFIRMED" || d.status === "CONFIRMED_LATE").length;
  const missed = doses.filter(d => d.status === "MISSED").length;
  const total = doses.length;
  const adherence = total > 0 ? Math.round((100 * taken) / Math.max(1, taken + missed)) : 0;

  const patients = getMockPatients();
  const updatedPatients = patients.map((p) => {
    if (String(p.id) === String(patientId)) {
      return {
        ...p,
        today: { taken, total, missed },
        adherence_7d: adherence
      };
    }
    return p;
  });

  saveMockPatients(updatedPatients);
}

// MOCK: replace on merge day
function mockResponse(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  if (path === "/auth/login" && method === "POST") {
    return Promise.resolve(mock.login);
  }

  if (path === "/caregiver/patients" && method === "GET") {
    return Promise.resolve(getMockPatients());
  }

  if (path === "/caregiver/patients" && method === "POST") {
    const body = options.body ? JSON.parse(options.body) : {};
    const newId = Math.floor(Math.random() * 9000) + 100;
    
    const newPatient = {
      id: newId,
      name: body.name || "New Patient",
      phone: body.phone || "923001234567",
      today: { taken: 0, total: 0, missed: 0 },
      adherence_7d: 0,
    };

    const currentList = getMockPatients();
    const updatedList = [...currentList, newPatient];
    saveMockPatients(updatedList);

    const allMap = getAllMockDosesMap();
    allMap[String(newId)] = [];
    saveAllMockDosesMap(allMap);

    return Promise.resolve({ id: newId });
  }

  // DELETE /caregiver/patients/{id} (Unlink / Remove patient)
  const deletePatientMatch = path.match(/\/caregiver\/patients\/(\d+)/);
  if (deletePatientMatch && method === "DELETE") {
    const patientId = deletePatientMatch[1];
    const currentList = getMockPatients();
    const updatedList = currentList.filter(p => String(p.id) !== String(patientId));
    saveMockPatients(updatedList);

    const allMap = getAllMockDosesMap();
    delete allMap[String(patientId)];
    saveAllMockDosesMap(allMap);

    return Promise.resolve({ success: true, removed_id: Number(patientId) });
  }

  // Match /patients/{id}/doses
  const patientDosesMatch = path.match(/\/patients\/(\d+)\/doses/);
  if (patientDosesMatch && method === "GET") {
    const patientId = patientDosesMatch[1];
    return Promise.resolve(getDosesForPatient(patientId));
  }

  // Contract: POST /doses/{id}/reply with {"action": "taken" | "skip" | "snooze"}
  const doseReplyMatch = path.match(/\/doses\/(\d+)\/reply/);
  if (doseReplyMatch && method === "POST") {
    const doseId = parseInt(doseReplyMatch[1], 10);
    const body = options.body ? JSON.parse(options.body) : {};
    const action = body.action || "taken";

    let newStatus = "CONFIRMED";
    if (action === "skip") newStatus = "SKIPPED";
    else if (action === "snooze") newStatus = "NOTIFIED";

    const allMap = getAllMockDosesMap();
    let foundPatientId = null;

    for (const pid in allMap) {
      const idx = allMap[pid].findIndex(d => d.id === doseId);
      if (idx !== -1) {
        foundPatientId = pid;
        allMap[pid][idx] = {
          ...allMap[pid][idx],
          status: newStatus,
          reminder_count: action === "snooze" ? (allMap[pid][idx].reminder_count || 0) + 1 : allMap[pid][idx].reminder_count,
        };
        break;
      }
    }

    if (foundPatientId) {
      saveAllMockDosesMap(allMap);
      syncPatientStats(foundPatientId);
    }

    return Promise.resolve({ id: doseId, status: newStatus });
  }

  if (path === "/caregiver/settings" && method === "PUT") {
    const body = options.body ? JSON.parse(options.body) : {};
    return Promise.resolve({ alert_mode: body.alert_mode || "every" });
  }

  if (path.match(/\/reports\/\d+\/weekly/) && method === "GET") {
    return Promise.resolve(mock.weekly_report);
  }

  return Promise.reject(new Error(`Mock endpoint not found: ${method} ${path}`));
}

export async function api(path, options = {}) {
  if (USE_MOCK) return mockResponse(path, options); // MOCK: replace on merge day
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${res.status}`);
  }
  return res.json();
}