export type HazardType = 'FLOOD' | 'FALLEN_TREE' | 'LANDSLIDE' | 'BLOCKED_DRAIN' | 'DOWNED_POWERLINE';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CaseStatus = 'PENDING' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type Verdict = 'CONFIRMED' | 'NEEDS_VERIFICATION' | 'REJECTED';
export type RoadHierarchy = 'ARTERIAL_A1' | 'MAJOR_COLLECTOR' | 'LOCAL_STREET' | 'ALLEY';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  roadName: string;
  roadHierarchy: RoadHierarchy;
  wardId: string;
  wardName: string;
}

export interface CitizenReport {
  id: string;
  createdAt: string;
  userId: string;
  userName: string;
  userTrustScore: number;
  hazardType: HazardType;
  severity: SeverityLevel;
  location: LocationCoordinates;
  imageUrl: string;
  description: string;
  needsRescue: boolean;
  householdCount?: number;
  specialNeeds?: string[];
  contactPhone?: string;
  status: 'PENDING' | 'PROCESSED';
}

export interface SensorTelemetry {
  stationId: string;
  stationName: string;
  stationType: 'RAIN_GAUGE' | 'RIVER_LEVEL';
  wardId: string;
  lat: number;
  lng: number;
  rainfallRateMmH: number;
  rainfallAccumulated3h: number;
  riverLevelMeters: number;
  riverCapacityPct: number;
  status: 'NORMAL' | 'WARNING' | 'DANGER';
  updatedAt: string;
}

export interface CheckOutput<T = any> {
  checkName: 'IMAGE_AI' | 'WEATHER_SYSTEM' | 'CLUSTER_SYSTEM' | 'LOCATION_AI' | 'RISK_AI';
  engine: 'AI' | 'SYSTEM';
  passed: boolean;
  score: number;
  summary: string;
  details: T;
}

export interface AggregatorVerdict {
  caseId: string;
  verdict: Verdict;
  confidenceScore: number;
  urgency: SeverityLevel;
  primaryHazard: HazardType;
  checks: {
    image: CheckOutput;
    weather: CheckOutput;
    cluster: CheckOutput;
    location: CheckOutput;
    risk: CheckOutput;
  };
  reasoningChain: string[];
  recommendedActions: string[];
  triggeredOutcomes: ('NEED_MORE_INFO' | 'PUBLISHED' | 'AREA_ALERT' | 'COUNCIL_TICKET')[];
}

export interface HazardCase {
  id: string;
  reportId?: string;
  source: 'CITIZEN' | 'SENSOR_AUTO';
  createdAt: string;
  hazardType: HazardType;
  status: CaseStatus;
  location: LocationCoordinates;
  imageUrl?: string;
  description?: string;
  verdictData?: AggregatorVerdict;
  roadClosed: boolean;
  broadcastSent: boolean;
  ticketId?: string;
  nearbyVerifications: {
    userId: string;
    confirmed: boolean;
    timestamp: string;
    note?: string;
  }[];
}

export interface WardDefinition {
  id: string;
  name: string;
  polygon: [number, number][];
  center: [number, number];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  population: number;
}

export interface Shelter {
  id: string;
  name: string;
  wardId: string;
  location: LocationCoordinates;
  totalCapacity: number;
  currentOccupancy: number;
  isOpen: boolean;
  supplies: {
    foodPacks: number;
    waterLitres: number;
    medicalKits: number;
    blankets: number;
  };
  amenities: string[];
  contactPhone: string;
}

export interface ReliefRequest {
  id: string;
  caseId?: string;
  reportId: string;
  citizenName: string;
  citizenPhone: string;
  householdCount: number;
  specialNeeds: string[];
  location: LocationCoordinates;
  urgency: SeverityLevel;
  status: 'QUEUED' | 'ASSIGNED' | 'DISPATCHED' | 'SHELTERED';
  matchedShelterId?: string;
  assignedVehicleId?: string;
  safeRoute?: { lat: number; lng: number }[];
  createdAt: string;
}

export interface FieldCrew {
  id: string;
  name: string;
  specialization: 'WATER_PUMPING' | 'TREE_CLEARANCE' | 'RESCUE_BOAT' | 'ROAD_REPAIR';
  currentLocation: { lat: number; lng: number };
  status: 'AVAILABLE' | 'DISPATCHED' | 'ON_SITE' | 'MAINTENANCE';
  assignedTicketId?: string;
  contactPhone: string;
}

export interface CouncilTicket {
  id: string;
  caseId: string;
  createdAt: string;
  wardId: string;
  hazardType: HazardType;
  urgency: SeverityLevel;
  status: 'OPEN' | 'DISPATCHED' | 'ON_SITE' | 'RESOLVED';
  assignedCrewId?: string;
  assignedCrewName?: string;
  resolutionPhotoUrl?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  detourRoute?: { lat: number; lng: number; instruction: string }[];
}

export interface SystemConfig {
  aiConfidenceThreshold: number;
  autoCloseRoadOnCritical: boolean;
  broadcastRadiusMeters: number;
  weatherRainfallDangerMmH: number;
  riverLevelDangerPct: number;
}

export interface AiTuningLog {
  id: string;
  timestamp: string;
  caseId: string;
  officerAction: 'AGREED' | 'OVERRIDDEN_VERIFIED' | 'OVERRIDDEN_REJECTED';
  originalAiVerdict: Verdict;
  originalAiConfidence: number;
  officerNotes: string;
  promptAdjustment: string;
}

export interface SimulationState {
  currentStep: {
    stepIndex: number;
    timeLabel: string;
    stormPhase: string;
  };
  currentStepIndex: number;
  totalSteps: number;
  isAutoPlaying: boolean;
}

export interface AppState {
  wards: WardDefinition[];
  sensors: SensorTelemetry[];
  shelters: Shelter[];
  fieldCrews: FieldCrew[];
  cases: HazardCase[];
  tickets: CouncilTicket[];
  reliefRequests: ReliefRequest[];
  config: SystemConfig;
  bannedUsers: string[];
  aiTuningLogs: AiTuningLog[];
  simulation: SimulationState;
}
