import { ReliefRequest, Shelter } from '../types';
import { store } from '../db/store';
import { calculateDistanceMeters } from './caseBuilder';
import { calculateSafeRoute } from './routing';

export interface ReliefMatchResult {
  matchedShelter: Shelter;
  availableCapacityAfter: number;
  distanceKm: number;
  safeRoute: [number, number][];
  routeSummary: string;
}

export class ReliefMatchingService {
  /**
   * Matches an urgent relief/evacuation request to the nearest available shelter with capacity
   */
  public matchShelter(request: ReliefRequest): ReliefMatchResult | null {
    const shelters = store.getShelters().filter(s => s.isOpen);
    const peopleCount = request.householdCount || 1;

    let bestShelter: Shelter | null = null;
    let minDistance = Infinity;

    for (const s of shelters) {
      const remainingCapacity = s.totalCapacity - s.currentOccupancy;
      if (remainingCapacity >= peopleCount) {
        const dist = calculateDistanceMeters(
          request.location.lat,
          request.location.lng,
          s.location.lat,
          s.location.lng
        );

        if (dist < minDistance) {
          minDistance = dist;
          bestShelter = s;
        }
      }
    }

    if (!bestShelter) {
      return null;
    }

    // Calculate safe route bypassing flooded sectors
    const route = calculateSafeRoute(
      [request.location.lat, request.location.lng],
      [bestShelter.location.lat, bestShelter.location.lng]
    );

    // Update shelter occupancy
    store.updateShelter(bestShelter.id, {
      currentOccupancy: bestShelter.currentOccupancy + peopleCount,
      supplies: {
        ...bestShelter.supplies,
        foodPacks: Math.max(0, bestShelter.supplies.foodPacks - peopleCount * 2),
        waterLitres: Math.max(0, bestShelter.supplies.waterLitres - peopleCount * 3),
      },
    });

    // Update relief request
    store.updateReliefRequest(request.id, {
      status: 'ASSIGNED',
      matchedShelterId: bestShelter.id,
      safeRoute: route.path.map(p => ({ lat: p[0], lng: p[1] })),
    });

    return {
      matchedShelter: bestShelter,
      availableCapacityAfter: bestShelter.totalCapacity - (bestShelter.currentOccupancy + peopleCount),
      distanceKm: Math.round((minDistance / 1000) * 10) / 10,
      safeRoute: route.path,
      routeSummary: route.isDetour
        ? `Safe detour calculated avoiding flooded sector (bypassing ${route.bypassedHazards.join(', ')})`
        : 'Direct clear route to relief facility',
    };
  }
}

export const reliefMatching = new ReliefMatchingService();
