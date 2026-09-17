import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://127.0.0.1:3001';

interface TestResult {
  stage: string;
  criterion: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, stage: string, criterion: string, details: string) {
  results.push({
    stage,
    criterion,
    passed: condition,
    details,
  });
  const symbol = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} [${stage}] ${criterion} -> ${details}`);
}

async function runEndToEndVerification() {
  console.log('\n================================================================');
  console.log('  RESQCITY · COMPETITION CRITERIA & END-TO-END VALIDATION SUITE');
  console.log('================================================================\n');

  try {
    // 0. HEALTH CHECK
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert(healthRes.ok, 'SYSTEM_INIT', 'Backend Server Health', `HTTP ${healthRes.status} OK`);

    // 1. STAGE 01 (INLET 1) -> STAGE 02 -> STAGE 03 -> STAGE 04 -> STAGE 05: CITIZEN REPORT
    console.log('\n--- 1. Testing Citizen Flood Submission (6-Stage Flow) ---');
    const floodReportRes = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'eval-citizen-01',
        userName: 'Priyani Fernando',
        contactPhone: '+94 77 555 1234',
        hazardType: 'FLOOD',
        severity: 'HIGH',
        lat: 6.958,
        lng: 79.891,
        roadName: 'Kelani Flood Embankment Road (A1)',
        imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
        description: 'Severe water level rise, 3ft deep across road curb',
        needsRescue: true,
        householdCount: 4,
        specialNeeds: ['Elderly grandmother'],
      }),
    });
    const floodData = await floodReportRes.json();

    assert(floodReportRes.ok, 'STAGE_01', 'Citizen Inbound Channel', `Report ID generated: ${floodData.report?.id}`);
    assert(floodData.case?.location?.wardId === 'ward-02', 'STAGE_02', 'Case Builder Spatial Join', `Resolved to Ward: ${floodData.case?.location?.wardName}`);
    assert(floodData.verdict?.checks?.weather?.engine === 'SYSTEM' && floodData.verdict?.checks?.weather?.passed === true, 'STAGE_03', 'Deterministic Weather Check (SYSTEM)', `Weather score: ${floodData.verdict?.checks?.weather?.score}`);
    assert(floodData.verdict?.checks?.image?.engine === 'AI' && floodData.verdict?.checks?.image?.passed === true, 'STAGE_03', 'Image Vision AI Check', `Detected: ${floodData.verdict?.checks?.image?.details?.detectedHazard} (${floodData.verdict?.checks?.image?.details?.aiEngineUsed})`);
    assert(floodData.verdict?.checks?.cluster?.engine === 'SYSTEM', 'STAGE_03', 'Spatial Cluster Check (SYSTEM)', `200m / 3h cluster query executed`);
    assert(floodData.verdict?.checks?.location?.engine === 'AI', 'STAGE_03', 'Location Scene Match AI', `Geographic confidence: ${floodData.verdict?.checks?.location?.details?.geographicConfidence}`);
    assert(floodData.verdict?.checks?.risk?.engine === 'AI', 'STAGE_03', 'Predictive Risk & Arterial AI', `Urgency: ${floodData.verdict?.urgency}`);
    assert(floodData.verdict?.verdict === 'CONFIRMED' && floodData.verdict?.confidenceScore >= 0.70, 'STAGE_04', 'Hazard Aggregator AI Synthesis', `Verdict: ${floodData.verdict?.verdict} (${(floodData.verdict?.confidenceScore * 100).toFixed(0)}% confidence)`);
    assert(floodData.outcomes?.roadClosed === true, 'STAGE_05', 'Outcome: Published Road Closure', `Road closed on public map`);
    assert(floodData.outcomes?.areaAlertSent === true, 'STAGE_05', 'Outcome: Area Warning Broadcast', `Alert dispatched to ward residents`);
    assert(Boolean(floodData.outcomes?.ticketId), 'STAGE_05', 'Outcome: Council Work Order', `Ticket ID: ${floodData.outcomes?.ticketId}`);

    // 2. STAGE 03: AI SPAM / MEME FILTERING TEST
    console.log('\n--- 2. Testing AI Spam / Meme Photo Rejection ---');
    await fetch(`${BASE_URL}/api/users/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'spammer-01' }),
    });
    const memeReportRes = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'spammer-01',
        userName: 'Troll User',
        hazardType: 'FLOOD',
        lat: 6.93,
        lng: 79.85,
        roadName: 'Chatham St',
        imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
        description: 'Cat meme joke photo test',
      }),
    });
    const memeData = await memeReportRes.json();
    assert(memeData.verdict?.verdict === 'REJECTED' && memeData.verdict?.checks?.image?.passed === false, 'STAGE_03_AI_FILTER', 'Spam & Meme Photo Rejection', `Image check failed (${(memeData.verdict?.confidenceScore * 100).toFixed(0)}% confidence). Verdict: REJECTED.`);

    // 3. STAGE 01 (INLET 2): WEATHER & RIVER STREAM REPLAY ENGINE
    console.log('\n--- 3. Testing Autonomous Sensor Stream Trigger ---');
    const simStepRes = await fetch(`${BASE_URL}/api/simulation/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepIndex: 2 }), // Step 2: Peak flash flood (94% river, 88mm/h rain)
    });
    const simData = await simStepRes.json();
    assert(simData.currentStepIndex === 2, 'STAGE_01_SENSOR_FEED', 'Storm Telemetry Progression', `Storm Phase: ${simData.currentStep?.stormPhase}`);

    // 4. STAGE 05 (OUTCOME 1): COMMUNITY VERIFICATION LOOP
    console.log('\n--- 4. Testing Crowdsourced Community Verification Loop ---');
    const verifyRes = await fetch(`${BASE_URL}/api/cases/${floodData.case?.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'citizen-nearby-99',
        confirmed: true,
        note: 'Water rising up to shopfronts.',
      }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyData.case?.nearbyVerifications?.length >= 1, 'STAGE_05_COMMUNITY', 'Nearby Citizen Verification Loop', `Confirmations recorded: ${verifyData.case?.nearbyVerifications?.length}`);

    // 5. STAGE 06 (ROLE 1): COUNCIL OFFICER DISPATCH
    console.log('\n--- 5. Testing Council Officer Crew Dispatch ---');
    const ticketId = floodData.outcomes?.ticketId;
    const dispatchRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crewId: 'crew-01' }),
    });
    const dispatchData = await dispatchRes.json();
    assert(dispatchData.ticket?.status === 'DISPATCHED' && dispatchData.crew?.status === 'DISPATCHED', 'STAGE_06_COUNCIL', 'Council Officer Dispatch', `Dispatched squad: ${dispatchData.crew?.name}`);

    // 5b. Field Crew Arrival On-Site
    console.log('\n--- 5b. Testing Field Crew Mark On-Site ---');
    const onSiteRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/on-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const onSiteData = await onSiteRes.json();
    assert(onSiteData.ticket?.status === 'ON_SITE' && onSiteData.crew?.status === 'ON_SITE', 'STAGE_06_FIELD_CREW_ARRIVE', 'Field Crew Arrival On-Site', `Ticket and crew status updated to ON_SITE`);

    // 6. STAGE 06 (ROLE 2): FIELD CREW SAFE NAVIGATION & RESOLUTION WITH PHOTO
    console.log('\n--- 6. Testing Field Crew Safe Detour & Photographic Closure ---');
    const resolveRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolutionPhotoUrl: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
        resolutionNotes: 'Water pumped, mud cleared, road surface safe for transit.',
      }),
    });
    const resolveData = await resolveRes.json();
    assert(resolveData.ticket?.status === 'RESOLVED' && resolveData.case?.status === 'RESOLVED' && resolveData.case?.roadClosed === false, 'STAGE_06_FIELD_CREW', 'Photographic Job Closure & Public Map Update', `Ticket marked RESOLVED -> Public map road opened.`);

    // 7. STAGE 06 (ROLE 3) + STRETCH GOAL: NEAREST SHELTER ALLOCATION & SAFE DETOUR ROUTING
    console.log('\n--- 7. Testing Intelligent Shelter Matching & Detour Pathfinding ---');
    const reliefMatchRes = await fetch(`${BASE_URL}/api/relief/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reliefRequestId: 'relief-req-01' }),
    });
    const reliefData = await reliefMatchRes.json();
    assert(Boolean(reliefData.result?.matchedShelter?.name), 'STAGE_06_RELIEF', 'Nearest Shelter Allocation with Capacity', `Matched to: ${reliefData.result?.matchedShelter?.name} (${reliefData.result?.availableCapacityAfter} beds free)`);
    assert(reliefData.result?.safeRoute?.length > 0, 'STRETCH_GOAL_DETOUR', 'Dynamic Detour Pathfinding', `Safe waypoint count: ${reliefData.result?.safeRoute?.length}`);

    // 8. STAGE 06 (ROLE 4): ADMIN AI RETUNING & CONTINUOUS LEARNING FEEDBACK LOOP
    console.log('\n--- 8. Testing Admin AI Thresholds & Continuous Learning Feedback Loop ---');
    const feedbackRes = await fetch(`${BASE_URL}/api/cases/${floodData.case?.id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'AGREED',
        notes: 'Officer confirms diagnosis was accurate; field crew verified.',
      }),
    });
    const feedbackData = await feedbackRes.json();
    assert(Boolean(feedbackData.log?.id), 'STAGE_06_FEEDBACK_LOOP', 'Human AI Learning Feedback Loop', `Tuning log: ${feedbackData.log?.promptAdjustment}`);

    const configRes = await fetch(`${BASE_URL}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiConfidenceThreshold: 0.75 }),
    });
    const configData = await configRes.json();
    assert(configData.config?.aiConfidenceThreshold === 0.75, 'STAGE_06_ADMIN', 'Dynamic AI Threshold Configuration', `Threshold updated to: ${(configData.config?.aiConfidenceThreshold * 100)}%`);

    // 9. REPUTATION & SPAM BAN MANAGEMENT
    console.log('\n--- 9. Testing Spam User Ban & Reputation Management ---');
    const banRes = await fetch(`${BASE_URL}/api/users/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'spammer-01' }),
    });
    const banData = await banRes.json();
    assert(banData.bannedUsers?.includes('spammer-01'), 'STAGE_06_SECURITY', 'Spammer Reputation Banning', `Banned users: ${banData.bannedUsers?.join(', ')}`);

    // SUMMARY
    console.log('\n================================================================');
    console.log('                    FINAL TEST RESULTS SUMMARY                  ');
    console.log('================================================================');
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`Total Criteria Tested: ${totalCount}`);
    console.log(`Passed: ${passedCount} / ${totalCount} (${((passedCount / totalCount) * 100).toFixed(0)}%)`);
    if (passedCount === totalCount) {
      console.log('🏆 ALL COMPETITION CRITERIA & ARCHITECTURAL STAGES FULLY VALIDATED!');
    }
  } catch (err: any) {
    console.error('Test Suite Exception:', err);
  }
}

runEndToEndVerification();
