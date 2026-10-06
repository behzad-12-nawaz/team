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
    return Promise.resolve(mock.doses);
  }

  if (path.match(/\/doses\/\d+\/reply/) && method === "POST") {
    return Promise.resolve(mock.dose_reply);
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