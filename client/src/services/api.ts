import { AppState, CitizenReport, HazardCase, ReliefRequest } from '../types';

const API_BASE = '/api';

async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('Backend server unreachable or starting up. Please ensure backend server is running on http://localhost:3001.');
      }
      throw new Error(`Server response error: ${text.slice(0, 100)}`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    return data;
  } catch (err: any) {
    if (err.name === 'SyntaxError' || (err.message && err.message.includes('Unexpected token'))) {
      throw new Error('Backend API returned invalid HTML response. Ensure the backend server is running on http://localhost:3001.');
    }
    throw err;
  }
}

export const api = {
  async getState(): Promise<AppState> {
    return safeFetchJson(`${API_BASE}/state`);
  },

  async submitReport(payload: any): Promise<{
    report: CitizenReport;
    case: HazardCase;
    verdict: any;
    outcomes: any;
  }> {
    return safeFetchJson(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async verifyCase(caseId: string, payload: { userId?: string; confirmed: boolean; note?: string }): Promise<any> {
    return safeFetchJson(`${API_BASE}/cases/${caseId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async dispatchTicket(ticketId: string, crewId: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/tickets/${ticketId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crewId }),
    });
  },

  async markTicketOnSite(ticketId: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/tickets/${ticketId}/on-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/tickets/${ticketId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  async resolveTicket(ticketId: string, payload: { resolutionPhotoUrl?: string; resolutionNotes?: string }): Promise<any> {
    return safeFetchJson(`${API_BASE}/tickets/${ticketId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async requestRescue(payload: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/relief/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async matchReliefShelter(reliefRequestId: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/relief/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reliefRequestId }),
    });
  },

  async addShelter(payload: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/shelters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateShelter(id: string, updates: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/shelters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  async deleteShelter(id: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/shelters/${id}`, {
      method: 'DELETE',
    });
  },

  async addFieldCrew(payload: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/crews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateFieldCrew(id: string, updates: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/crews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  async deleteFieldCrew(id: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/crews/${id}`, {
      method: 'DELETE',
    });
  },

  async submitCaseFeedback(caseId: string, action: string, notes: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/cases/${caseId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
  },

  async deleteCase(caseId: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/cases/${caseId}`, {
      method: 'DELETE',
    });
  },

  async updateConfig(configUpdates: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configUpdates),
    });
  },

  async banUser(userId: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/users/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  async unbanUser(userId: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/users/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  async setSimulationStep(stepIndex: number): Promise<any> {
    return safeFetchJson(`${API_BASE}/simulation/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepIndex }),
    });
  },

  async toggleSimulationPlay(): Promise<any> {
    return safeFetchJson(`${API_BASE}/simulation/toggle`, {
      method: 'POST',
    });
  },

  async calculateSafeRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<any> {
    return safeFetchJson(`${API_BASE}/route/safe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startLat, startLng, endLat, endLng }),
    });
  },

  // Auth API
  async register(payload: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async login(payload: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getMe(token: string): Promise<any> {
    return safeFetchJson(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  async logout(): Promise<any> {
    return safeFetchJson(`${API_BASE}/auth/logout`, { method: 'POST' });
  },

  async getPendingVerifications(): Promise<any> {
    return safeFetchJson(`${API_BASE}/auth/pending-verifications`);
  },

  async verifyUser(userId: string, status: 'APPROVED' | 'REJECTED'): Promise<any> {
    return safeFetchJson(`${API_BASE}/auth/verify-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status }),
    });
  },

  async createAdmin(payload: any): Promise<any> {
    return safeFetchJson(`${API_BASE}/auth/create-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getAllUsers(): Promise<any> {
    return safeFetchJson(`${API_BASE}/users`);
  },
};
