import { AppState, CitizenReport, HazardCase, ReliefRequest } from '../types';

const API_BASE = '/api';

export const api = {
  async getState(): Promise<AppState> {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error('Failed to load state');
    return res.json();
  },

  async submitReport(payload: any): Promise<{
    report: CitizenReport;
    case: HazardCase;
    verdict: any;
    outcomes: any;
  }> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit report');
    }
    return res.json();
  },

  async verifyCase(caseId: string, payload: { userId?: string; confirmed: boolean; note?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async dispatchTicket(ticketId: string, crewId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crewId }),
    });
    return res.json();
  },

  async resolveTicket(ticketId: string, payload: { resolutionPhotoUrl?: string; resolutionNotes?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async matchReliefShelter(reliefRequestId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/relief/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reliefRequestId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to match shelter');
    }
    return res.json();
  },

  async submitCaseFeedback(caseId: string, action: string, notes: string): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    return res.json();
  },

  async updateConfig(configUpdates: any): Promise<any> {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configUpdates),
    });
    return res.json();
  },

  async banUser(userId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/users/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  async unbanUser(userId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/users/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  async setSimulationStep(stepIndex: number): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepIndex }),
    });
    return res.json();
  },

  async toggleSimulationPlay(): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/toggle`, {
      method: 'POST',
    });
    return res.json();
  },

  async calculateSafeRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<any> {
    const res = await fetch(`${API_BASE}/route/safe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startLat, startLng, endLat, endLng }),
    });
    return res.json();
  },
};
