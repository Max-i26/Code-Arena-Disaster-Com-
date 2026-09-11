import { AiTuningLog, Verdict } from '../types';
import { store } from '../db/store';

export class AiFeedbackService {
  /**
   * Logs an officer or field crew override and adjusts weights/prompts dynamically
   */
  public logHumanDecision(
    caseId: string,
    action: 'AGREED' | 'OVERRIDDEN_VERIFIED' | 'OVERRIDDEN_REJECTED',
    officerNotes: string
  ): AiTuningLog {
    const hazardCase = store.getCaseById(caseId);
    const originalVerdict: Verdict = hazardCase?.verdictData?.verdict || 'NEEDS_VERIFICATION';
    const originalConfidence = hazardCase?.verdictData?.confidenceScore || 0.50;

    let promptAdjustment = 'Standard baseline weights maintained.';

    if (action === 'OVERRIDDEN_VERIFIED') {
      promptAdjustment = 'System tuning: Increased weight on citizen image clarity (+5%) and lowered conservative weather thresholds for local micro-climate flash zones.';
    } else if (action === 'OVERRIDDEN_REJECTED') {
      promptAdjustment = 'System tuning: Increased penalty on single isolated reports (-10%) and tightened AI vision clutter threshold.';
      if (hazardCase?.reportId) {
        // Penalize user trust score
        const report = store.getReports().find(r => r.id === hazardCase.reportId);
        if (report) {
          report.userTrustScore = Math.max(0.1, report.userTrustScore - 0.25);
        }
      }
    }

    const log: AiTuningLog = {
      id: `tune-${Date.now()}`,
      timestamp: new Date().toISOString(),
      caseId,
      officerAction: action,
      originalAiVerdict: originalVerdict,
      originalAiConfidence: originalConfidence,
      officerNotes: officerNotes || (action === 'AGREED' ? 'AI diagnosis confirmed by human operator' : 'Officer manual correction applied'),
      promptAdjustment,
    };

    store.addAiTuningLog(log);
    return log;
  }
}

export const aiFeedback = new AiFeedbackService();
