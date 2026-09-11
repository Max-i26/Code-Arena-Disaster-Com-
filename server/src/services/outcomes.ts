import { AggregatorVerdict, CitizenReport, CouncilTicket, HazardCase, SeverityLevel } from '../types';
import { store } from '../db/store';
import { calculateSafeRoute } from './routing';

export class OutcomeDispatcherService {
  /**
   * Executes the automated outcomes triggered by the Hazard Aggregator
   */
  public async dispatchOutcomes(
    hazardCase: HazardCase,
    verdict: AggregatorVerdict,
    report: CitizenReport
  ): Promise<{
    published: boolean;
    roadClosed: boolean;
    areaAlertSent: boolean;
    ticketId?: string;
    needMoreInfoPinged: boolean;
  }> {
    let published = false;
    let roadClosed = false;
    let areaAlertSent = false;
    let ticketId: string | undefined;
    let needMoreInfoPinged = false;

    const outcomes = verdict.triggeredOutcomes;

    // 1. PUBLISHED
    if (outcomes.includes('PUBLISHED')) {
      published = true;
      // Close road if critical or high urgency
      if (verdict.urgency === 'CRITICAL' || verdict.urgency === 'HIGH') {
        roadClosed = true;
      }
      store.updateCase(hazardCase.id, {
        status: 'VERIFIED',
        roadClosed,
        verdictData: verdict,
      });
    }

    // 2. AREA ALERT
    if (outcomes.includes('AREA_ALERT')) {
      areaAlertSent = true;
      store.updateCase(hazardCase.id, {
        broadcastSent: true,
      });

      // Emit broadcast alert event for all connected clients/citizens
      store.emit('AREA_ALERT_BROADCAST', {
        caseId: hazardCase.id,
        wardId: hazardCase.location.wardId,
        wardName: hazardCase.location.wardName,
        roadName: hazardCase.location.roadName,
        hazardType: hazardCase.hazardType,
        urgency: verdict.urgency,
        message: `EMERGENCY ALERT: Confirmed ${hazardCase.hazardType.replace('_', ' ')} on ${hazardCase.location.roadName}. Road is CLOSED. Follow indicated detour routes.`,
      });
    }

    // 3. COUNCIL TICKET
    if (outcomes.includes('COUNCIL_TICKET')) {
      // Find an available field crew suitable for the hazard
      const crews = store.getFieldCrews();
      let targetCrew = crews.find(c => c.status === 'AVAILABLE');

      if (hazardCase.hazardType === 'FLOOD') {
        targetCrew = crews.find(c => c.specialization === 'WATER_PUMPING' && c.status === 'AVAILABLE') || targetCrew;
      } else if (hazardCase.hazardType === 'FALLEN_TREE') {
        targetCrew = crews.find(c => c.specialization === 'TREE_CLEARANCE' && c.status === 'AVAILABLE') || targetCrew;
      }

      // Calculate detour route for crew if road is closed
      const safeRoute = calculateSafeRoute(
        targetCrew ? [targetCrew.currentLocation.lat, targetCrew.currentLocation.lng] : [6.93, 79.86],
        [hazardCase.location.lat, hazardCase.location.lng]
      );

      const newTicket: CouncilTicket = {
        id: `ticket-${Date.now()}`,
        caseId: hazardCase.id,
        createdAt: new Date().toISOString(),
        wardId: hazardCase.location.wardId,
        hazardType: hazardCase.hazardType,
        urgency: verdict.urgency,
        status: targetCrew ? 'DISPATCHED' : 'OPEN',
        assignedCrewId: targetCrew?.id,
        assignedCrewName: targetCrew?.name,
        detourRoute: safeRoute.steps,
      };

      store.addTicket(newTicket);
      ticketId = newTicket.id;

      if (targetCrew) {
        store.updateFieldCrew(targetCrew.id, {
          status: 'DISPATCHED',
          assignedTicketId: newTicket.id,
        });
      }

      store.updateCase(hazardCase.id, {
        ticketId: newTicket.id,
      });
    }

    // 4. NEED MORE INFO
    if (outcomes.includes('NEED_MORE_INFO')) {
      needMoreInfoPinged = true;
      store.updateCase(hazardCase.id, {
        status: 'PENDING',
        verdictData: verdict,
      });

      store.emit('COMMUNITY_VERIFICATION_REQUEST', {
        caseId: hazardCase.id,
        wardId: hazardCase.location.wardId,
        roadName: hazardCase.location.roadName,
        hazardType: hazardCase.hazardType,
        prompt: `A ${hazardCase.hazardType.toLowerCase()} was reported near your location on ${hazardCase.location.roadName}. Please verify if conditions are hazardous.`,
      });
    }

    return {
      published,
      roadClosed,
      areaAlertSent,
      ticketId,
      needMoreInfoPinged,
    };
  }
}

export const outcomeDispatcher = new OutcomeDispatcherService();
