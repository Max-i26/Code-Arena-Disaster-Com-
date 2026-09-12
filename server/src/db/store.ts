import fs from 'fs';
import path from 'path';
import { 
  CitizenReport, 
  HazardCase, 
  SensorTelemetry, 
  Shelter, 
  FieldCrew, 
  CouncilTicket, 
  ReliefRequest, 
  SystemConfig, 
  AiTuningLog 
} from '../types';
import { WARDS, SENSORS, SHELTERS, FIELD_CREWS, INITIAL_CASES, INITIAL_CONFIG, WardDefinition } from './mockData';
import { dbService } from './databaseService';

const PERSISTENT_FILE_PATH = path.join(__dirname, 'persistent_store.json');

class StateStore {
  private wards: WardDefinition[] = [...WARDS];
  private sensors: SensorTelemetry[] = JSON.parse(JSON.stringify(SENSORS));
  private shelters: Shelter[] = JSON.parse(JSON.stringify(SHELTERS));
  private fieldCrews: FieldCrew[] = JSON.parse(JSON.stringify(FIELD_CREWS));
  private cases: HazardCase[] = JSON.parse(JSON.stringify(INITIAL_CASES));
  private reports: CitizenReport[] = [];
  private tickets: CouncilTicket[] = [
    {
      id: 'ticket-01',
      caseId: 'case-01',
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      wardId: 'ward-02',
      hazardType: 'FLOOD',
      urgency: 'CRITICAL',
      status: 'DISPATCHED',
      assignedCrewId: 'crew-03',
      assignedCrewName: 'Navy Disaster Rescue Boat Squad A',
      detourRoute: [
        { lat: 6.9500, lng: 79.8800, instruction: 'Take Grandpass North Expressway' },
        { lat: 6.9650, lng: 79.8880, instruction: 'Bypass Kelani Bridge via Kandy Road Overpass' },
      ],
    },
    {
      id: 'ticket-02',
      caseId: 'case-02',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      wardId: 'ward-01',
      hazardType: 'FALLEN_TREE',
      urgency: 'HIGH',
      status: 'OPEN',
      assignedCrewId: undefined,
    },
  ];
  private reliefRequests: ReliefRequest[] = [
    {
      id: 'relief-req-01',
      caseId: 'case-01',
      reportId: 'rep-init-01',
      citizenName: 'Sunil Perera',
      citizenPhone: '+94 77 987 6543',
      householdCount: 4,
      specialNeeds: ['Elderly grandmother with mobility restriction', 'Drinking water shortage'],
      location: {
        lat: 6.9580,
        lng: 79.8910,
        roadName: 'Kelani River View Lane',
        roadHierarchy: 'LOCAL_STREET',
        wardId: 'ward-02',
        wardName: 'Kelani River Basin',
      },
      urgency: 'HIGH',
      status: 'QUEUED',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
  ];
  private config: SystemConfig = { ...INITIAL_CONFIG };
  private aiTuningLogs: AiTuningLog[] = [];
  private bannedUsers: Set<string> = new Set();
  private subscribers: ((event: { type: string; payload: any }) => void)[] = [];

  constructor() {
    this.loadPersistentState();
  }

  private loadPersistentState() {
    try {
      if (fs.existsSync(PERSISTENT_FILE_PATH)) {
        const raw = fs.readFileSync(PERSISTENT_FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.cases)) this.cases = data.cases;
        if (Array.isArray(data.reports)) this.reports = data.reports;
        if (Array.isArray(data.shelters)) this.shelters = data.shelters;
        if (Array.isArray(data.fieldCrews)) this.fieldCrews = data.fieldCrews;
        if (Array.isArray(data.tickets)) this.tickets = data.tickets;
        if (Array.isArray(data.reliefRequests)) this.reliefRequests = data.reliefRequests;
        if (data.config) this.config = { ...INITIAL_CONFIG, ...data.config };
        if (Array.isArray(data.aiTuningLogs)) this.aiTuningLogs = data.aiTuningLogs;
        if (Array.isArray(data.bannedUsers)) this.bannedUsers = new Set(data.bannedUsers);
        console.log('[ResQCity Store] Successfully loaded persistent store state from disk.');
      }
    } catch (err: any) {
      console.warn('[ResQCity Store] Could not load persistent state, using default seed:', err.message);
    }
  }

  public savePersistentState() {
    try {
      const payload = {
        cases: this.cases,
        reports: this.reports,
        shelters: this.shelters,
        fieldCrews: this.fieldCrews,
        tickets: this.tickets,
        reliefRequests: this.reliefRequests,
        config: this.config,
        aiTuningLogs: this.aiTuningLogs,
        bannedUsers: Array.from(this.bannedUsers),
      };
      fs.writeFileSync(PERSISTENT_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');

      // Sync with SQL Database Engine
      this.cases.forEach(c => dbService.saveCase(c));
      this.tickets.forEach(t => dbService.saveTicket(t));
      this.shelters.forEach(s => dbService.saveShelter(s));
      this.fieldCrews.forEach(fc => dbService.saveFieldCrew(fc));
      this.reliefRequests.forEach(r => dbService.saveReliefRequest(r));
      this.aiTuningLogs.forEach(l => dbService.saveAiLog(l));
    } catch (err: any) {
      console.error('[ResQCity Store] Error saving persistent state:', err.message);
    }
  }

  public resetToInitialSeed() {
    this.wards = [...WARDS];
    this.sensors = JSON.parse(JSON.stringify(SENSORS));
    this.shelters = JSON.parse(JSON.stringify(SHELTERS));
    this.fieldCrews = JSON.parse(JSON.stringify(FIELD_CREWS));
    this.cases = JSON.parse(JSON.stringify(INITIAL_CASES));
    this.reports = [];
    this.tickets = [
      {
        id: 'ticket-01',
        caseId: 'case-01',
        createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        wardId: 'ward-02',
        hazardType: 'FLOOD',
        urgency: 'CRITICAL',
        status: 'DISPATCHED',
        assignedCrewId: 'crew-03',
        assignedCrewName: 'Navy Disaster Rescue Boat Squad A',
        detourRoute: [
          { lat: 6.9500, lng: 79.8800, instruction: 'Take Grandpass North Expressway' },
          { lat: 6.9650, lng: 79.8880, instruction: 'Bypass Kelani Bridge via Kandy Road Overpass' },
        ],
      },
      {
        id: 'ticket-02',
        caseId: 'case-02',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        wardId: 'ward-01',
        hazardType: 'FALLEN_TREE',
        urgency: 'HIGH',
        status: 'OPEN',
        assignedCrewId: undefined,
      },
    ];
    this.reliefRequests = [
      {
        id: 'relief-req-01',
        caseId: 'case-01',
        reportId: 'rep-init-01',
        citizenName: 'Sunil Perera',
        citizenPhone: '+94 77 987 6543',
        householdCount: 4,
        specialNeeds: ['Elderly grandmother with mobility restriction', 'Drinking water shortage'],
        location: {
          lat: 6.9580,
          lng: 79.8910,
          roadName: 'Kelani River View Lane',
          roadHierarchy: 'LOCAL_STREET',
          wardId: 'ward-02',
          wardName: 'Kelani River Basin',
        },
        urgency: 'HIGH',
        status: 'QUEUED',
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
    ];
    this.config = { ...INITIAL_CONFIG };
    this.aiTuningLogs = [];
    this.bannedUsers = new Set();

    if (fs.existsSync(PERSISTENT_FILE_PATH)) {
      try {
        fs.unlinkSync(PERSISTENT_FILE_PATH);
      } catch (e) { }
    }
    this.emit('STATE_RESET', { message: 'State store reset to initial seed data.' });
  }

  // Broadcast to WebSockets / SSE
  public subscribe(callback: (event: { type: string; payload: any }) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  public emit(type: string, payload: any) {
    this.savePersistentState();
    this.subscribers.forEach(cb => {
      try {
        cb({ type, payload });
      } catch (err) {
        console.error('Error emitting state event:', err);
      }
    });
  }

  // Wards
  public getWards(): WardDefinition[] {
    return this.wards;
  }

  public getWardById(id: string): WardDefinition | undefined {
    return this.wards.find(w => w.id === id);
  }

  // Sensors
  public getSensors(): SensorTelemetry[] {
    return this.sensors;
  }

  public updateSensor(stationId: string, updates: Partial<SensorTelemetry>): SensorTelemetry | undefined {
    const idx = this.sensors.findIndex(s => s.stationId === stationId);
    if (idx >= 0) {
      this.sensors[idx] = { ...this.sensors[idx], ...updates, updatedAt: new Date().toISOString() };
      this.emit('SENSOR_UPDATED', this.sensors[idx]);
      return this.sensors[idx];
    }
    return undefined;
  }

  // Reports
  public addReport(report: CitizenReport): CitizenReport {
    this.reports.unshift(report);
    this.emit('REPORT_CREATED', report);
    return report;
  }

  public getReports(): CitizenReport[] {
    return this.reports;
  }

  // Cases
  public addCase(hazardCase: HazardCase): HazardCase {
    this.cases.unshift(hazardCase);
    this.emit('CASE_CREATED', hazardCase);
    return hazardCase;
  }

  public getCases(): HazardCase[] {
    return this.cases;
  }

  public getCaseById(id: string): HazardCase | undefined {
    return this.cases.find(c => c.id === id);
  }

  public updateCase(id: string, updates: Partial<HazardCase>): HazardCase | undefined {
    const idx = this.cases.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.cases[idx] = { ...this.cases[idx], ...updates };
      this.emit('CASE_UPDATED', this.cases[idx]);
      return this.cases[idx];
    }
    return undefined;
  }

  public deleteCase(id: string): boolean {
    const idx = this.cases.findIndex(c => c.id === id);
    if (idx >= 0) {
      const deleted = this.cases.splice(idx, 1)[0];
      this.emit('CASE_DELETED', deleted);
      return true;
    }
    return false;
  }

  // Shelters
  public getShelters(): Shelter[] {
    return this.shelters;
  }

  public getShelterById(id: string): Shelter | undefined {
    return this.shelters.find(s => s.id === id);
  }

  public updateShelter(id: string, updates: Partial<Shelter>): Shelter | undefined {
    const idx = this.shelters.findIndex(s => s.id === id);
    if (idx >= 0) {
      const existing = this.shelters[idx];
      const updatedSupplies = updates.supplies
        ? { ...existing.supplies, ...updates.supplies }
        : existing.supplies;
      this.shelters[idx] = {
        ...existing,
        ...updates,
        supplies: updatedSupplies,
      };
      this.emit('SHELTER_UPDATED', this.shelters[idx]);
      return this.shelters[idx];
    }
    return undefined;
  }

  public addShelter(newShelter: Omit<Shelter, 'id'> & { id?: string }): Shelter {
    const id = newShelter.id || `shelter-${Date.now()}`;
    const shelter: Shelter = { ...newShelter, id };
    this.shelters.push(shelter);
    this.emit('SHELTER_ADDED', shelter);
    return shelter;
  }

  public deleteShelter(id: string): boolean {
    const idx = this.shelters.findIndex(s => s.id === id);
    if (idx >= 0) {
      const deleted = this.shelters.splice(idx, 1)[0];
      this.emit('SHELTER_DELETED', deleted);
      return true;
    }
    return false;
  }

  // Field Crews
  public getFieldCrews(): FieldCrew[] {
    return this.fieldCrews;
  }

  public getFieldCrewById(id: string): FieldCrew | undefined {
    return this.fieldCrews.find(c => c.id === id);
  }

  public addFieldCrew(newCrew: Omit<FieldCrew, 'id'> & { id?: string }): FieldCrew {
    const id = newCrew.id || `crew-${Date.now()}`;
    const crew: FieldCrew = { ...newCrew, id };
    this.fieldCrews.push(crew);
    this.emit('FIELD_CREW_ADDED', crew);
    return crew;
  }

  public updateFieldCrew(id: string, updates: Partial<FieldCrew>): FieldCrew | undefined {
    const idx = this.fieldCrews.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.fieldCrews[idx] = { ...this.fieldCrews[idx], ...updates };
      this.emit('FIELD_CREW_UPDATED', this.fieldCrews[idx]);
      return this.fieldCrews[idx];
    }
    return undefined;
  }

  public deleteFieldCrew(id: string): boolean {
    const idx = this.fieldCrews.findIndex(c => c.id === id);
    if (idx >= 0) {
      const deleted = this.fieldCrews.splice(idx, 1)[0];
      this.emit('FIELD_CREW_DELETED', deleted);
      return true;
    }
    return false;
  }

  // Council Tickets
  public getTickets(): CouncilTicket[] {
    return this.tickets;
  }

  public getTicketById(id: string): CouncilTicket | undefined {
    return this.tickets.find(t => t.id === id);
  }

  public addTicket(ticket: CouncilTicket): CouncilTicket {
    this.tickets.unshift(ticket);
    this.emit('TICKET_CREATED', ticket);
    return ticket;
  }

  public updateTicket(id: string, updates: Partial<CouncilTicket>): CouncilTicket | undefined {
    const idx = this.tickets.findIndex(t => t.id === id);
    if (idx >= 0) {
      this.tickets[idx] = { ...this.tickets[idx], ...updates };
      this.emit('TICKET_UPDATED', this.tickets[idx]);
      return this.tickets[idx];
    }
    return undefined;
  }

  public deleteTicketByCaseId(caseId: string): boolean {
    const idx = this.tickets.findIndex(t => t.caseId === caseId);
    if (idx >= 0) {
      const deleted = this.tickets.splice(idx, 1)[0];
      this.emit('TICKET_DELETED', deleted);
      return true;
    }
    return false;
  }

  // Relief Requests
  public getReliefRequests(): ReliefRequest[] {
    return this.reliefRequests;
  }

  public addReliefRequest(request: ReliefRequest): ReliefRequest {
    this.reliefRequests.unshift(request);
    this.emit('RELIEF_REQUEST_CREATED', request);
    return request;
  }

  public updateReliefRequest(id: string, updates: Partial<ReliefRequest>): ReliefRequest | undefined {
    const idx = this.reliefRequests.findIndex(r => r.id === id);
    if (idx >= 0) {
      this.reliefRequests[idx] = { ...this.reliefRequests[idx], ...updates };
      this.emit('RELIEF_REQUEST_UPDATED', this.reliefRequests[idx]);
      return this.reliefRequests[idx];
    }
    return undefined;
  }

  // System Config
  public getConfig(): SystemConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<SystemConfig>): SystemConfig {
    this.config = { ...this.config, ...updates };
    this.emit('CONFIG_UPDATED', this.config);
    return this.config;
  }

  // AI Tuning Logs
  public getAiTuningLogs(): AiTuningLog[] {
    return this.aiTuningLogs;
  }

  public addAiTuningLog(log: AiTuningLog): AiTuningLog {
    this.aiTuningLogs.unshift(log);
    this.emit('AI_TUNING_LOG_ADDED', log);
    return log;
  }

  // Banned Users
  public banUser(userId: string) {
    this.bannedUsers.add(userId);
    this.emit('USER_BANNED', { userId });
  }

  public unbanUser(userId: string) {
    this.bannedUsers.delete(userId);
    this.emit('USER_UNBANNED', { userId });
  }

  public isUserBanned(userId: string): boolean {
    return this.bannedUsers.has(userId);
  }

  public getBannedUsers(): string[] {
    return Array.from(this.bannedUsers);
  }
}

export const store = new StateStore();
