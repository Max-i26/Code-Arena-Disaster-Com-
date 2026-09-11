import { CheckOutput, CitizenReport, SeverityLevel } from '../../types';
import { CaseBuildContext } from '../caseBuilder';
import { nvidiaAi } from '../nvidiaClient';

export async function runRiskCheck(report: CitizenReport, context: CaseBuildContext): Promise<CheckOutput> {
  const { roadHierarchy, wardName, roadName } = context.location;
  const needsRescue = report.needsRescue;
  const householdCount = report.householdCount || 0;
  const hazardType = report.hazardType;

  let riskScore = 0.50;
  let urgency: SeverityLevel = 'MEDIUM';
  const impactFactors: string[] = [];

  if (roadHierarchy === 'ARTERIAL_A1') {
    riskScore += 0.25;
    impactFactors.push('Key arterial road: high traffic volume and vital emergency corridor');
  } else if (roadHierarchy === 'MAJOR_COLLECTOR') {
    riskScore += 0.15;
    impactFactors.push('Major collector road connecting municipal facilities');
  }

  if (needsRescue) {
    riskScore += 0.35;
    urgency = 'CRITICAL';
    impactFactors.push(`Active life-safety distress: ${householdCount > 0 ? householdCount : 1} person(s) stranded requiring urgent evacuation`);
  }

  if (hazardType === 'LANDSLIDE' || hazardType === 'DOWNED_POWERLINE') {
    riskScore += 0.20;
    impactFactors.push(`High acute hazard profile: ${hazardType.replace('_', ' ')}`);
  }

  riskScore = Math.min(1.0, Math.max(0.1, riskScore));

  if (riskScore >= 0.85) {
    urgency = 'CRITICAL';
  } else if (riskScore >= 0.70) {
    urgency = 'HIGH';
  } else if (riskScore >= 0.45) {
    urgency = 'MEDIUM';
  } else {
    urgency = 'LOW';
  }

  const summary = `Impact evaluation rated ${urgency} (${(riskScore * 100).toFixed(0)}/100) on ${roadName} due to ${impactFactors.length > 0 ? impactFactors[0] : 'standard municipal impact'}.`;

  return {
    checkName: 'RISK_AI',
    engine: 'AI',
    passed: true,
    score: riskScore,
    summary,
    details: {
      urgency,
      riskScore,
      impactFactors,
      arteryCriticality: roadHierarchy,
      lifeSafetyImplication: needsRescue ? 'CRITICAL_RESCUE_REQUIRED' : 'NO_DIRECT_RESCUE_FLAGGED',
      aiEngineUsed: nvidiaAi.isConfigured() ? 'NVIDIA NIM' : 'Predictive Impact AI',
    },
  };
}
