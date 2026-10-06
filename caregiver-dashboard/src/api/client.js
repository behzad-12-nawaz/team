import mock from "../mock/data.json";

// Safe mock detection: defaults to true if VITE_USE_MOCK is "true" or undefined/dev mode
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Persistent mock store helper using localStorage
function getMockPatients() {
  try {
    const saved = localStorage.getItem("dosecare_mock_patients");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return mock.caregiver_patients;
}

function saveMockPatients(patients) {
  try {
    localStorage.setItem("dosecare_mock_patients", JSON.stringify(patients));
  } catch (e) {
    console.error(e);
  }
}

function getMockDoses() {
  try {
    const saved = localStorage.getItem("dosecare_mock_doses");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return mock.doses;
}

function saveMockDoses(doses) {
  try {
    localStorage.setItem("dosecare_mock_doses", JSON.stringify(doses));
  } catch (e) {
    console.error(e);
  }
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
    const newId = Math.floor(Math.random() * 1000) + 10;
    const newPatient = {
      id: newId,
      name: body.name || "New Patient",
      phone: body.phone || "923001234567",
      today: { taken: 0, total: 2, missed: 0 },
      adherence_7d: 100,
    };

    const currentList = getMockPatients();
    const updatedList = [...currentList, newPatient];
    saveMockPatients(updatedList);

    return Promise.resolve({ id: newId });
  }

  if (path.match(/\/patients\/\d+\/doses/) && method === "GET") {
    return Promise.resolve(getMockDoses());
  }

  // Contract: POST /doses/{id}/reply with {"action": "taken" | "skip" | "snooze"}
  if (path.match(/\/doses\/(\d+)\/reply/) && method === "POST") {
    const match = path.match(/\/doses\/(\d+)\/reply/);
    const doseId = match ? parseInt(match[1], 10) : null;
    const body = options.body ? JSON.parse(options.body) : {};
    const action = body.action || "taken";

    let newStatus = "CONFIRMED";
    if (action === "skip") newStatus = "SKIPPED";
    else if (action === "snooze") newStatus = "NOTIFIED";

    const currentDoses = getMockDoses();
    const updatedDoses = currentDoses.map((d) => {
      if (d.id === doseId) {
        return {
          ...d,
          status: newStatus,
          reminder_count: action === "snooze" ? (d.reminder_count || 0) + 1 : d.reminder_count,
        };
      }
      return d;
    });
    saveMockDoses(updatedDoses);

    // Update patient today counts in mock
    const patients = getMockPatients();
    const updatedPatients = patients.map((p) => {
      if (action === "taken") {
        return {
          ...p,
          today: {
            ...p.today,
            taken: (p.today?.taken || 0) + 1,
          },
        };
      }
      return p;
    });
    saveMockPatients(updatedPatients);

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