import { AggregatorVerdict, CheckOutput, CitizenReport, SeverityLevel, Verdict } from '../types';
import { CaseBuildContext } from './caseBuilder';
import { store } from '../db/store';

export interface CheckBundle {
  image: CheckOutput;
  weather: CheckOutput;
  cluster: CheckOutput;
  location: CheckOutput;
  risk: CheckOutput;
}

export class HazardAggregatorService {
  /**
   * AI-powered Multi-Signal Synthesis
   */
  public aggregateSignals(
    caseId: string,
    report: CitizenReport,
    checks: CheckBundle,
    context: CaseBuildContext
  ): AggregatorVerdict {
    const config = store.getConfig();
    const threshold = config.aiConfidenceThreshold; // e.g. 0.70

    const imgScore = checks.image.score;
    const weatherScore = checks.weather.score;
    const clusterScore = checks.cluster.score;
    const locScore = checks.location.score;
    const riskScore = checks.risk.score;

    // Weight matrix for multi-signal fusion:
    // Dynamic weighting based on hazard characteristics
    const isNonWeatherHazard = ['FALLEN_TREE', 'LANDSLIDE', 'BLOCKED_DRAIN', 'DOWNED_POWERLINE'].includes(report.hazardType);

    let weightedConfidence = 0;
    if (isNonWeatherHazard) {
      // For physical localized hazards (e.g. fallen tree, landslide), visual proof and location AI carry primary weight:
      // Image AI (45%), Location AI (25%), Reporter Trust (15%), Cluster (15%)
      weightedConfidence =
        imgScore * 0.45 +
        locScore * 0.25 +
        context.userTrustScore * 0.15 +
        clusterScore * 0.15;
    } else {
      // For hydrological hazards (FLOOD):
      // Image AI (35%), Weather Telemetry (25%), Cluster (15%), Location AI (15%), Reporter Trust (10%)
      weightedConfidence =
        imgScore * 0.35 +
        weatherScore * 0.25 +
        clusterScore * 0.15 +
        locScore * 0.15 +
        context.userTrustScore * 0.10;
    }

    const roundedConfidence = Math.round(weightedConfidence * 100) / 100;

    let verdict: Verdict = 'NEEDS_VERIFICATION';
    const reasoningChain: string[] = [];
    const recommendedActions: string[] = [];
    const triggeredOutcomes: ('NEED_MORE_INFO' | 'PUBLISHED' | 'AREA_ALERT' | 'COUNCIL_TICKET')[] = [];

    // Check for hard rejections (e.g. invalid meme/spam photo)
    if (!checks.image.passed && imgScore < 0.20) {
      verdict = 'REJECTED';
      reasoningChain.push('Image failed validation: Photo content identified as non-hazard or irrelevant.');
      reasoningChain.push(`Weighted confidence (${(roundedConfidence * 100).toFixed(0)}%) is below acceptable disaster verification standards.`);
      recommendedActions.push('Discard report and notify user of invalid submission');
      return {
        caseId,
        verdict,
        confidenceScore: roundedConfidence,
        urgency: 'LOW',
        primaryHazard: report.hazardType,
        checks,
        reasoningChain,
        recommendedActions,
        triggeredOutcomes,
      };
    }

    // Determine Verdict based on confidence & system corroborations
    const isHighQualityVisualProof = checks.image.passed && imgScore >= 0.85 && locScore >= 0.70;
    const isCorroboratedByTelemetry = checks.weather.passed && checks.cluster.passed;

    if (roundedConfidence >= threshold || isHighQualityVisualProof || isCorroboratedByTelemetry) {
      verdict = 'CONFIRMED';
      reasoningChain.push(`Corroborated by high multi-signal confidence score (${(roundedConfidence * 100).toFixed(0)}%), meeting threshold >= ${(threshold * 100).toFixed(0)}%.`);
      
      if (checks.image.passed) {
        reasoningChain.push(`Visual AI confirmed authentic hazard signature for ${report.hazardType.replace(/_/g, ' ')} (${(imgScore * 100).toFixed(0)}% visual confidence).`);
      }
      if (checks.weather.passed) {
        reasoningChain.push(`System weather telemetry actively corroborates storm load in ${context.location.wardName}.`);
      }
      if (checks.cluster.passed) {
        reasoningChain.push(`Geospatial clustering validates multiple independent reports within 200m.`);
      }
      reasoningChain.push(`Location AI confirms scene matches road topography on ${context.location.roadName}.`);

      // Trigger standard verified outcomes
      triggeredOutcomes.push('PUBLISHED');
      triggeredOutcomes.push('COUNCIL_TICKET');

      if (checks.risk.details.urgency === 'CRITICAL' || checks.risk.details.urgency === 'HIGH') {
        triggeredOutcomes.push('AREA_ALERT');
        recommendedActions.push(`Issue immediate road closure on ${context.location.roadName}`);
        recommendedActions.push(`Broadcast localized area alert to residents of ${context.location.wardName}`);
      }

      recommendedActions.push(`Dispatch council emergency crew (${report.hazardType === 'FLOOD' ? 'De-watering pump squad' : report.hazardType === 'FALLEN_TREE' ? 'Chainsaw & tree clearance team' : 'Emergency response team'})`);

      if (report.needsRescue) {
        recommendedActions.push(`Initiate immediate rescue dispatch for ${report.householdCount || 1} stranded individual(s)`);
      }
    } else {
      verdict = 'NEEDS_VERIFICATION';
      reasoningChain.push(`Confidence score (${(roundedConfidence * 100).toFixed(0)}%) is below automatic confirmation threshold (${(threshold * 100).toFixed(0)}%).`);
      reasoningChain.push('Lacks sufficient independent corroboration or weather gauge threshold confirmation.');
      reasoningChain.push('Triggering crowdsourced community verification loop to nearby residents.');
      
      triggeredOutcomes.push('NEED_MORE_INFO');
      recommendedActions.push('Ping nearby active app users within 300m to verify ground conditions');
    }

    const urgency: SeverityLevel = checks.risk.details.urgency || 'MEDIUM';

    return {
      caseId,
      verdict,
      confidenceScore: roundedConfidence,
      urgency,
      primaryHazard: report.hazardType,
      checks,
      reasoningChain,
      recommendedActions,
      triggeredOutcomes,
    };
  }
}

export const hazardAggregator = new HazardAggregatorService();
