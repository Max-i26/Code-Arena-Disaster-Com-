import { CitizenReport, HazardCase, LocationCoordinates, SensorTelemetry, RoadHierarchy } from '../types';
import { store } from '../db/store';
import { WARDS } from '../db/mockData';

// Haversine distance in meters
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface CaseBuildContext {
  location: LocationCoordinates;
  nearbyReportsCount: number;
  nearbyReportIds: string[];
  wardSensors: SensorTelemetry[];
  nearestSensor?: SensorTelemetry;
  userTrustScore: number;
  isHighVolumeArtery: boolean;
}

export class CaseBuilderService {
  /**
   * Resolves raw GPS coordinate to closest Ward and Road Segment hierarchy
   */
  public resolveLocation(lat: number, lng: number, fallbackRoadName?: string): LocationCoordinates {
    let closestWard = WARDS[0];
    let minDistance = Infinity;

    for (const ward of WARDS) {
      const dist = calculateDistanceMeters(lat, lng, ward.center[0], ward.center[1]);
      if (dist < minDistance) {
        minDistance = dist;
        closestWard = ward;
      }
    }

    // Determine road hierarchy heuristically or by name
    const roadName = fallbackRoadName || `${closestWard.name.split(' ')[0]} Main Arterial Link`;
    let roadHierarchy: RoadHierarchy = 'LOCAL_STREET';

    const lower = roadName.toLowerCase();
    if (lower.includes('highway') || lower.includes('baseline') || lower.includes('galle road') || lower.includes('a1') || lower.includes('a2')) {
      roadHierarchy = 'ARTERIAL_A1';
    } else if (lower.includes('bypass') || lower.includes('junction') || lower.includes('hospital') || lower.includes('collector')) {
      roadHierarchy = 'MAJOR_COLLECTOR';
    } else if (lower.includes('lane') || lower.includes('cross')) {
      roadHierarchy = 'ALLEY';
    }

    return {
      lat,
      lng,
      roadName,
      roadHierarchy,
      wardId: closestWard.id,
      wardName: closestWard.name,
    };
  }

  /**
   * Assembles rich case context joining DB reports, GIS layers, and sensors
   */
  public buildCaseContext(report: CitizenReport): CaseBuildContext {
    const { lat, lng, wardId } = report.location;

    // 1. Fetch live sensors for the ward
    const allSensors = store.getSensors();
    const wardSensors = allSensors.filter(s => s.wardId === wardId);

    // 2. Find nearest sensor
    let nearestSensor: SensorTelemetry | undefined;
    let minSensorDist = Infinity;
    for (const sensor of allSensors) {
      const dist = calculateDistanceMeters(lat, lng, sensor.lat, sensor.lng);
      if (dist < minSensorDist) {
        minSensorDist = dist;
        nearestSensor = sensor;
      }
    }

    // 3. Find nearby reports within 200m in the last 3 hours (180 mins)
    const existingReports = store.getReports();
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;

    const nearbyReportIds: string[] = [];
    for (const r of existingReports) {
      if (r.id === report.id) continue;
      const reportTime = new Date(r.createdAt).getTime();
      if (reportTime >= threeHoursAgo) {
        const dist = calculateDistanceMeters(lat, lng, r.location.lat, r.location.lng);
        if (dist <= 200) {
          nearbyReportIds.push(r.id);
        }
      }
    }

    return {
      location: report.location,
      nearbyReportsCount: nearbyReportIds.length,
      nearbyReportIds,
      wardSensors,
      nearestSensor,
      userTrustScore: report.userTrustScore || 0.85,
      isHighVolumeArtery: report.location.roadHierarchy === 'ARTERIAL_A1',
    };
  }
}

export const caseBuilder = new CaseBuilderService();
