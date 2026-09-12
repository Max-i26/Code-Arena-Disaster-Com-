import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { store } from '../db/store';
import { caseBuilder } from '../services/caseBuilder';
import { runImageCheck } from '../services/checks/imageCheck';
import { runWeatherCheck } from '../services/checks/weatherCheck';
import { runClusterCheck } from '../services/checks/clusterCheck';
import { runLocationCheck } from '../services/checks/locationCheck';
import { runRiskCheck } from '../services/checks/riskCheck';
import { hazardAggregator } from '../services/aggregator';
import { outcomeDispatcher } from '../services/outcomes';
import { reliefMatching } from '../services/reliefMatching';
import { aiFeedback } from '../services/aiFeedback';
import { stormSimulator } from '../services/simulator';
import { calculateSafeRoute } from '../services/routing';
import { CitizenReport, HazardCase, ReliefRequest } from '../types';

export const apiRouter = Router();

// Configure multer memory/disk storage
const storage = multer.memoryStorage();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

// 1. Initial State
apiRouter.get('/state', (req, res) => {
  res.json({
    wards: store.getWards(),
    sensors: store.getSensors(),
    shelters: store.getShelters(),
    fieldCrews: store.getFieldCrews(),
    cases: store.getCases(),
    tickets: store.getTickets(),
    reliefRequests: store.getReliefRequests(),
    config: store.getConfig(),
    bannedUsers: store.getBannedUsers(),
    aiTuningLogs: store.getAiTuningLogs(),
    simulation: stormSimulator.getCurrentState(),
  });
});

// 2. Submit Citizen Report (Runs 6-Stage Pipeline)
apiRouter.post('/reports', async (req, res) => {
  try {
    const {
      userId = 'citizen-' + Math.floor(Math.random() * 1000),
      userName = 'Citizen User',
      hazardType,
      severity = 'HIGH',
      lat,
      lng,
      roadName,
      imageUrl,
      description,
      needsRescue = false,
      householdCount = 1,
      specialNeeds = [],
      contactPhone = '',
    } = req.body;

    // Check banned user
    if (store.isUserBanned(userId)) {
      return res.status(403).json({ error: 'User is banned from reporting due to false submission history.' });
    }

    // Stage 02: Case Builder
    const resolvedLocation = caseBuilder.resolveLocation(Number(lat), Number(lng), roadName);

    const report: CitizenReport = {
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
      userId,
      userName,
      userTrustScore: 0.85,
      hazardType,
      severity,
      location: resolvedLocation,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
      description: description || `Reported ${hazardType} incident near ${resolvedLocation.roadName}`,
      needsRescue: Boolean(needsRescue),
      householdCount: Number(householdCount) || 1,
      specialNeeds,
      contactPhone,
      status: 'PROCESSED',
    };

    store.addReport(report);

    // Build context
    const context = caseBuilder.buildCaseContext(report);

    // Stage 03: Five Parallel Checks
    const [imageCheck, weatherCheck, clusterCheck, locationCheck, riskCheck] = await Promise.all([
      runImageCheck(report, context),
      runWeatherCheck(report, context),
      runClusterCheck(report, context),
      runLocationCheck(report, context),
      runRiskCheck(report, context),
    ]);

    const caseId = `case-${Date.now()}`;

    // Stage 04: Hazard Aggregator
    const verdict = hazardAggregator.aggregateSignals(
      caseId,
      report,
      {
        image: imageCheck,
        weather: weatherCheck,
        cluster: clusterCheck,
        location: locationCheck,
        risk: riskCheck,
      },
      context
    );

    const newCase: HazardCase = {
      id: caseId,
      reportId: report.id,
      source: 'CITIZEN',
      createdAt: new Date().toISOString(),
      hazardType: report.hazardType,
      status: verdict.verdict === 'CONFIRMED' ? 'VERIFIED' : verdict.verdict === 'REJECTED' ? 'REJECTED' : 'PENDING',
      location: report.location,
      imageUrl: report.imageUrl,
      description: report.description,
      roadClosed: false,
      broadcastSent: false,
      verdictData: verdict,
      nearbyVerifications: [],
    };

    store.addCase(newCase);

    // Stage 05: Four Outcomes
    const outcomeResults = await outcomeDispatcher.dispatchOutcomes(newCase, verdict, report);

    // If rescue is needed, automatically create a relief request
    if (report.needsRescue) {
      const reliefReq: ReliefRequest = {
        id: `relief-${Date.now()}`,
        caseId: newCase.id,
        reportId: report.id,
        citizenName: report.userName,
        citizenPhone: report.contactPhone || '+94 77 000 0000',
        householdCount: report.householdCount || 1,
        specialNeeds: report.specialNeeds || [],
        location: report.location,
        urgency: verdict.urgency,
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };
      store.addReliefRequest(reliefReq);
      // Try auto matching
      reliefMatching.matchShelter(reliefReq);
    }

    res.json({
      report,
      case: store.getCaseById(caseId),
      verdict,
      outcomes: outcomeResults,
    });
  } catch (err: any) {
    console.error('Error processing report:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Nearby Citizen Verification Loop
apiRouter.post('/cases/:id/verify', (req, res) => {
  const { id } = req.params;
  const { userId, confirmed, note } = req.body;
  const hazardCase = store.getCaseById(id);

  if (!hazardCase) {
    return res.status(404).json({ error: 'Case not found' });
  }

  hazardCase.nearbyVerifications.push({
    userId: userId || 'citizen-nearby',
    confirmed: Boolean(confirmed),
    timestamp: new Date().toISOString(),
    note,
  });

  // If positive confirmation threshold reached, promote to VERIFIED
  const positiveConfirmations = hazardCase.nearbyVerifications.filter(v => v.confirmed).length;
  if (positiveConfirmations >= 1 && hazardCase.status === 'PENDING') {
    hazardCase.status = 'VERIFIED';
    hazardCase.roadClosed = true;
    if (hazardCase.verdictData) {
      hazardCase.verdictData.verdict = 'CONFIRMED';
      hazardCase.verdictData.confidenceScore = Math.min(0.98, hazardCase.verdictData.confidenceScore + 0.20);
    }
  }

  store.updateCase(id, hazardCase);
  res.json({ case: hazardCase });
});

// 4. Council Ticket Dispatch Crew
apiRouter.post('/tickets/:id/dispatch', (req, res) => {
  const { id } = req.params;
  const { crewId } = req.body;

  const ticket = store.getTicketById(id);
  const crew = store.getFieldCrewById(crewId);

  if (!ticket || !crew) {
    return res.status(404).json({ error: 'Ticket or Crew not found' });
  }

  store.updateFieldCrew(crew.id, {
    status: 'DISPATCHED',
    assignedTicketId: ticket.id,
  });

  const updatedTicket = store.updateTicket(ticket.id, {
    status: 'DISPATCHED',
    assignedCrewId: crew.id,
    assignedCrewName: crew.name,
  });

  res.json({ ticket: updatedTicket, crew });
});

// 5. Field Crew Resolve Ticket with Photo (Stage 06 Crew Resolution)
apiRouter.post('/tickets/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { resolutionPhotoUrl, resolutionNotes } = req.body;

  const ticket = store.getTicketById(id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  // Mark ticket resolved
  const updatedTicket = store.updateTicket(ticket.id, {
    status: 'RESOLVED',
    resolutionPhotoUrl: resolutionPhotoUrl || 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
    resolvedAt: new Date().toISOString(),
    resolutionNotes: resolutionNotes || 'Hazard cleared completely; road flushed and safe for transit.',
  });

  // Free crew
  if (ticket.assignedCrewId) {
    store.updateFieldCrew(ticket.assignedCrewId, {
      status: 'AVAILABLE',
      assignedTicketId: undefined,
    });
  }

  // Close hazard case and open road on public map
  let updatedCase = undefined;
  const hazardCase = store.getCaseById(ticket.caseId);
  if (hazardCase) {
    updatedCase = store.updateCase(hazardCase.id, {
      status: 'RESOLVED',
      roadClosed: false,
    });
  }

  // Log learning feedback
  aiFeedback.logHumanDecision(ticket.caseId, 'AGREED', 'Field crew verified and resolved hazard with photographic proof.');

  res.json({ ticket: updatedTicket, case: updatedCase || hazardCase });
});

// 6. Relief Match Request & Direct Emergency Rescue Submission
apiRouter.post('/relief/request', (req, res) => {
  const {
    citizenName = 'Emergency Citizen',
    citizenPhone = '+94 77 000 0000',
    householdCount = 1,
    specialNeeds = [],
    roadName = 'Baseline Road',
    lat,
    lng,
  } = req.body;

  const resolvedLocation = caseBuilder.resolveLocation(
    lat !== undefined ? Number(lat) : 6.9344,
    lng !== undefined ? Number(lng) : 79.8428,
    roadName
  );

  const reliefReq: ReliefRequest = {
    id: `relief-${Date.now()}`,
    caseId: `direct-rescue-${Date.now()}`,
    reportId: `rep-rescue-${Date.now()}`,
    citizenName,
    citizenPhone,
    householdCount: Number(householdCount) || 1,
    specialNeeds: Array.isArray(specialNeeds) ? specialNeeds : [],
    location: resolvedLocation,
    urgency: 'CRITICAL',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
  };

  store.addReliefRequest(reliefReq);
  const matchResult = reliefMatching.matchShelter(reliefReq);
  const updatedReq = store.getReliefRequests().find(r => r.id === reliefReq.id) || reliefReq;

  res.json({
    success: true,
    request: updatedReq,
    match: matchResult,
    shelters: store.getShelters(),
  });
});

apiRouter.post('/relief/match', (req, res) => {
  const { reliefRequestId } = req.body;
  const request = store.getReliefRequests().find(r => r.id === reliefRequestId);

  if (!request) {
    return res.status(404).json({ error: 'Relief request not found' });
  }

  const result = reliefMatching.matchShelter(request);
  if (!result) {
    return res.status(400).json({ error: 'No open shelters with sufficient capacity available' });
  }

  res.json({ result, request: store.getReliefRequests().find(r => r.id === reliefRequestId) });
});

// 7. Human Decision & AI Retuning Loop
apiRouter.post('/cases/:id/feedback', (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body;

  const log = aiFeedback.logHumanDecision(id, action, notes);

  if (action === 'OVERRIDDEN_VERIFIED') {
    store.updateCase(id, { status: 'VERIFIED', roadClosed: true });
  } else if (action === 'OVERRIDDEN_REJECTED') {
    store.updateCase(id, { status: 'REJECTED', roadClosed: false });
  }

  res.json({ log, case: store.getCaseById(id) });
});

// 8. System Config Update
apiRouter.post('/config', (req, res) => {
  const updated = store.updateConfig(req.body);
  res.json({ config: updated });
});

// 9. Banning/Unbanning
apiRouter.post('/users/ban', (req, res) => {
  const { userId } = req.body;
  store.banUser(userId);
  res.json({ success: true, bannedUsers: store.getBannedUsers() });
});

apiRouter.post('/users/unban', (req, res) => {
  const { userId } = req.body;
  store.unbanUser(userId);
  res.json({ success: true, bannedUsers: store.getBannedUsers() });
});

// 10. Simulator Controls
apiRouter.post('/simulation/step', (req, res) => {
  const { stepIndex } = req.body;
  stormSimulator.setStep(Number(stepIndex));
  res.json(stormSimulator.getCurrentState());
});

apiRouter.post('/simulation/toggle', (req, res) => {
  stormSimulator.togglePlay();
  res.json(stormSimulator.getCurrentState());
});

// 11. Safe Detour Path Calculation
apiRouter.post('/route/safe', (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.body;
  const result = calculateSafeRoute([Number(startLat), Number(startLng)], [Number(endLat), Number(endLng)]);
  res.json(result);
});

// 12. Multipart Photo Upload Endpoint
apiRouter.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Convert uploaded buffer to base64 data URI for instant rendering
  const base64Str = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype || 'image/jpeg';
  const dataUri = `data:${mimeType};base64,${base64Str}`;

  res.json({
    success: true,
    url: dataUri,
    filename: req.file.originalname,
    size: req.file.size,
  });
});

// 13. System Audit Log & Evaluation Data Export
apiRouter.get('/audit/export', (req, res) => {
  const auditBundle = {
    exportedAt: new Date().toISOString(),
    system: 'ResQCity Disaster Response Engine (Topic 04)',
    config: store.getConfig(),
    totalCasesProcessed: store.getCases().length,
    cases: store.getCases(),
    tickets: store.getTickets(),
    reliefRequests: store.getReliefRequests(),
    aiTuningLogs: store.getAiTuningLogs(),
    bannedUsers: store.getBannedUsers(),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=ResQCity_Audit_Logs.json');
  res.send(JSON.stringify(auditBundle, null, 2));
});

// 14. Shelter Supply Restock (Stage 06 Relief Desk)
apiRouter.post('/shelters/:id/restock', (req, res) => {
  const { id } = req.params;
  const { foodPacks = 0, waterLitres = 0, medicalKits = 0, blankets = 0 } = req.body;

  const shelter = store.getShelterById(id);
  if (!shelter) {
    return res.status(404).json({ error: 'Shelter not found' });
  }

  const updatedShelter = store.updateShelter(id, {
    supplies: {
      foodPacks: shelter.supplies.foodPacks + Number(foodPacks),
      waterLitres: shelter.supplies.waterLitres + Number(waterLitres),
      medicalKits: shelter.supplies.medicalKits + Number(medicalKits),
      blankets: shelter.supplies.blankets + Number(blankets),
    },
  });

  res.json({ success: true, shelter: updatedShelter });
});

// 15. Shelter Toggle Open/Closed
apiRouter.post('/shelters/:id/toggle', (req, res) => {
  const { id } = req.params;
  const shelter = store.getShelterById(id);
  if (!shelter) {
    return res.status(404).json({ error: 'Shelter not found' });
  }
  const updated = store.updateShelter(id, { isOpen: !shelter.isOpen });
  res.json({ success: true, shelter: updated });
});
