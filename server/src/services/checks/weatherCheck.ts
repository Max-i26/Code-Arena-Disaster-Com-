import { CheckOutput, CitizenReport } from '../../types';
import { CaseBuildContext } from '../caseBuilder';
import { store } from '../../db/store';
import { liveWeatherService } from '../liveWeatherService';

export async function runWeatherCheck(report: CitizenReport, context: CaseBuildContext): Promise<CheckOutput> {
  const config = store.getConfig();
  const wardSensors = context.wardSensors;

  // Fetch live weather data from Open-Meteo API (with fallback)
  const liveWeather = await liveWeatherService.fetchLiveWeather(context.location.lat, context.location.lng);
  
  // Find highest rainfall rate and river capacity in the ward
  let maxRainfall = 0;
  let maxRiverPct = 0;
  let maxAccumulated3h = 0;

  for (const s of wardSensors) {
    if (s.rainfallRateMmH > maxRainfall) maxRainfall = s.rainfallRateMmH;
    if (s.rainfallAccumulated3h > maxAccumulated3h) maxAccumulated3h = s.rainfallAccumulated3h;
    if (s.riverCapacityPct > maxRiverPct) maxRiverPct = s.riverCapacityPct;
  }

  // Factor live API precipitation into calculation if telemetry is at zero baseline
  if (liveWeather.isRaining && maxRainfall === 0) {
    maxRainfall = Math.max(maxRainfall, liveWeather.precipitationMm * 4);
  }

  // Plain code deterministic rule engine:
  // Rule 1: High current rainfall rate >= config threshold (default 30 mm/h)
  // Rule 2: High river level >= config threshold (default 75%)
  // Rule 3: Heavy 3h accumulation >= 60mm
  const isRainfallDanger = maxRainfall >= config.weatherRainfallDangerMmH;
  const isRiverDanger = maxRiverPct >= config.riverLevelDangerPct;
  const isAccumulatedDanger = maxAccumulated3h >= 60.0;

  const passed = isRainfallDanger || isRiverDanger || isAccumulatedDanger;

  let score = 0.40;
  let summary = `Weather telemetry does not strongly corroborate acute hazard (Rainfall: ${maxRainfall} mm/h, River Level: ${maxRiverPct}%).`;
  let ruleMatched = 'NORMAL_RANGE';

  if (isRainfallDanger && isRiverDanger) {
    score = 0.98;
    ruleMatched = 'CONCURRENT_EXTREME_RAINFALL_AND_RIVER_CREST';
    summary = `Extreme weather corroborated: Ward rainfall is ${maxRainfall.toFixed(1)} mm/h (exceeds ${config.weatherRainfallDangerMmH} mm/h limit) and river basin level is ${maxRiverPct.toFixed(1)}%.`;
  } else if (isRiverDanger) {
    score = 0.92;
    ruleMatched = 'CRITICAL_RIVER_CAPACITY_EXCEEDED';
    summary = `River gauge alert: Ultrasonic river station is at ${maxRiverPct.toFixed(1)}% capacity (danger threshold ${config.riverLevelDangerPct}%).`;
  } else if (isRainfallDanger) {
    score = 0.88;
    ruleMatched = 'HEAVY_PRECIPITATION_BURST';
    summary = `Precipitation alert: Active rainfall rate is ${maxRainfall.toFixed(1)} mm/h with ${maxAccumulated3h.toFixed(1)} mm 3-hour accumulation.`;
  } else if (maxRainfall >= 15.0 || maxRiverPct >= 50.0) {
    score = 0.70;
    ruleMatched = 'MODERATE_ENVIRONMENTAL_LOAD';
    summary = `Moderate weather conditions detected: ${maxRainfall.toFixed(1)} mm/h rainfall in ward.`;
  }

  if (liveWeather.source === 'OPEN_METEO_LIVE_API') {
    summary += ` [Live Open-Meteo Feed: ${liveWeather.temperatureC}°C, Cloud: ${liveWeather.cloudCoverPct}%]`;
  }

  return {
    checkName: 'WEATHER_SYSTEM',
    engine: 'SYSTEM',
    passed,
    score,
    summary,
    details: {
      maxRainfallRateMmH: maxRainfall,
      maxRiverCapacityPct: maxRiverPct,
      accumulated3hMm: maxAccumulated3h,
      ruleMatched,
      stationCountEvaluated: wardSensors.length,
      liveWeatherApi: liveWeather,
    },
  };
}
