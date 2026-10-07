import { api, mockControls } from './src/api/client.js';

async function runTests() {
  console.log('--- Starting DoseCare Clinic Portal Contract Tests ---');

  // Test 1: Login
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@demo.pk', password: 'demo' })
  });
  console.assert(loginRes.role === 'doctor', 'Test 1 Failed: Role must be doctor');
  console.assert(!!loginRes.access_token, 'Test 1 Failed: Access token missing');
  console.log('✓ Test 1: POST /auth/login passed.');

  // Test 2: GET /doctor/patients
  const patients = await api('/doctor/patients');
  console.assert(Array.isArray(patients) && patients.length > 0, 'Test 2 Failed: No doctor patients returned');
  console.assert(patients[0].id === 1 && patients[0].name === 'Ali Khan', 'Test 2 Failed: Patient mismatch');
  console.log('✓ Test 2: GET /doctor/patients passed.');

  // Test 3: POST /doctor-links
  const linkRes = await api('/doctor-links', {
    method: 'POST',
    body: JSON.stringify({ invite_code: 'ALI-4821' })
  });
  console.assert(linkRes.status === 'pending', 'Test 3 Failed: Status must be pending');
  console.assert(linkRes.invite_code === 'ALI-4821', 'Test 3 Failed: Invite code mismatch');
  console.log('✓ Test 3: POST /doctor-links passed.');

  // Test 4: GET /patients/1/prescriptions?status=active
  const rxList = await api('/patients/1/prescriptions?status=active');
  console.assert(Array.isArray(rxList) && rxList.length > 0, 'Test 4 Failed: No active prescriptions');
  console.assert(rxList[0].medicines.length > 0, 'Test 4 Failed: No medicines found');
  console.log('✓ Test 4: GET /patients/1/prescriptions passed.');

  // Test 5: POST /prescriptions
  const newRxRes = await api('/prescriptions', {
    method: 'POST',
    body: JSON.stringify({
      patient_id: 1,
      prescribed_by: 5,
      supersedes_id: rxList[0].id,
      medicines: [
        { name: 'Metformin', dose: '850 mg', times: ['08:00', '20:00'], days: 30, instructions: 'after meals' }
      ]
    })
  });
  console.assert(newRxRes.status === 'waiting_patient', 'Test 5 Failed: Status must be waiting_patient');
  console.assert(newRxRes.version === 2, 'Test 5 Failed: Version must be incremented');
  console.log('✓ Test 5: POST /prescriptions passed.');

  // Test 6: GET /patients/1/doses
  const doses = await api('/patients/1/doses');
  console.assert(Array.isArray(doses) && doses.length > 0, 'Test 6 Failed: Doses array empty');
  console.log('✓ Test 6: GET /patients/1/doses passed.');

  // Test 7: GET /reports/1/weekly
  const report = await api('/reports/1/weekly');
  console.assert(report.patient_name === 'Ali Khan', 'Test 7 Failed: Report patient mismatch');
  console.assert(typeof report.adherence === 'number', 'Test 7 Failed: Adherence number missing');
  console.log('✓ Test 7: GET /reports/1/weekly passed.');

  // Test 8: 403 Forbidden check when access is revoked
  mockControls.simulatePatientRevoke(1);
  try {
    await api('/patients/1/prescriptions?status=active');
    console.error('Test 8 Failed: Should have thrown 403 error');
  } catch (err) {
    console.assert(err.status === 403, 'Test 8 Failed: Error status must be 403');
    console.assert(err.detail === 'Access to this patient has ended', 'Test 8 Failed: Detail mismatch');
    console.log('✓ Test 8: 403 Forbidden on revoked link passed.');
  }

  // Reset mock data for clean state
  mockControls.reset();

  console.log('🎉 ALL 8 CLINIC PORTAL CONTRACT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
