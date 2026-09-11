import { CheckOutput, CitizenReport } from '../../types';
import { CaseBuildContext } from '../caseBuilder';

export function runClusterCheck(report: CitizenReport, context: CaseBuildContext): CheckOutput {
  const nearbyCount = context.nearbyReportsCount;
  const nearbyIds = context.nearbyReportIds;

  // Plain code deterministic rule:
  // Are there >= 1 corroborating independent reports within 200m in the last 3 hours?
  const passed = nearbyCount >= 1;

  let score = 0.50; // Neutral baseline for isolated single report
  let summary = 'Single isolated incident report (no corroborating reports within 200m in last 3h).';

  if (nearbyCount >= 3) {
    score = 0.96;
    summary = `High cluster density confirmed: ${nearbyCount + 1} independent reports within 200m radius over the past 3 hours.`;
  } else if (nearbyCount >= 1) {
    score = 0.85;
    summary = `Moderate cluster corroboration: ${nearbyCount} nearby report(s) logged within 200m.`;
  }

  return {
    checkName: 'CLUSTER_SYSTEM',
    engine: 'SYSTEM',
    passed,
    score,
    summary,
    details: {
      reportsInCluster: nearbyCount + 1,
      corroboratingReportIds: nearbyIds,
      searchRadiusMeters: 200,
      timeWindowHours: 3,
    },
  };
}
