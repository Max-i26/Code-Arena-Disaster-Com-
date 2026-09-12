import { caseBuilder } from '../services/caseBuilder';
import { runImageCheck } from '../services/checks/imageCheck';
import { runWeatherCheck } from '../services/checks/weatherCheck';
import { runClusterCheck } from '../services/checks/clusterCheck';
import { runLocationCheck } from '../services/checks/locationCheck';
import { runRiskCheck } from '../services/checks/riskCheck';
import { hazardAggregator } from '../services/aggregator';
import { CitizenReport } from '../types';

async function testFallenTreeUpload() {
  console.log('=== Testing Fallen Tree Upload & AI Aggregation ===');

  const report: CitizenReport = {
    id: 'rep-test-tree-01',
    createdAt: new Date().toISOString(),
    userId: 'citizen-tree-user',
    userName: 'Testing Citizen',
    userTrustScore: 0.85,
    hazardType: 'FALLEN_TREE',
    severity: 'HIGH',
    location: {
      wardId: 'ward-01',
      wardName: 'Colombo Central & Fort (Ward 01)',
      roadName: 'Galle Road (A2)',
      roadHierarchy: 'ARTERIAL_A1',
      lat: 6.9344,
      lng: 79.8428,
    },
    // Base64 Data URI photo
    imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLERAQERAQEBD/wAARCAB4AKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4WGh4iJipKTlJWWl5iZmqBn/9oADAMBAAIRAAhA0...',
    description: 'Large banyan tree fallen into Galle Road completely blocking both traffic lanes near Galle Face Green.',
    needsRescue: false,
    householdCount: 1,
    status: 'PROCESSED',
  };

  const context = caseBuilder.buildCaseContext(report);

  const [imageCheck, weatherCheck, clusterCheck, locationCheck, riskCheck] = await Promise.all([
    runImageCheck(report, context),
    runWeatherCheck(report, context),
    runClusterCheck(report, context),
    runLocationCheck(report, context),
    runRiskCheck(report, context),
  ]);

  console.log('Image Check Result:', imageCheck);

  const verdict = hazardAggregator.aggregateSignals(
    'case-test-tree-01',
    report,
    { image: imageCheck, weather: weatherCheck, cluster: clusterCheck, location: locationCheck, risk: riskCheck },
    context
  );

  console.log('\nAggregator Verdict:');
  console.log('Verdict:', verdict.verdict);
  console.log('Confidence Score:', verdict.confidenceScore);
  console.log('Urgency:', verdict.urgency);
  console.log('Reasoning Chain:', verdict.reasoningChain);
  console.log('Recommended Actions:', verdict.recommendedActions);

  if (verdict.verdict === 'CONFIRMED' && verdict.confidenceScore >= 0.80) {
    console.log('\nSUCCESS: Fallen tree report correctly evaluated as CONFIRMED with high confidence!');
  } else {
    console.error('\nFAILURE: Fallen tree report did not achieve expected CONFIRMED status.');
    process.exit(1);
  }
}

testFallenTreeUpload().catch((err) => {
  console.error('Error in test:', err);
  process.exit(1);
});
