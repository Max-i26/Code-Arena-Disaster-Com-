import { store } from '../db/store';
import { caseBuilder } from './caseBuilder';
import { runWeatherCheck } from './checks/weatherCheck';
import { runImageCheck } from './checks/imageCheck';
import { runClusterCheck } from './checks/clusterCheck';
import { runLocationCheck } from './checks/locationCheck';
import { runRiskCheck } from './checks/riskCheck';
import { hazardAggregator } from './aggregator';
import { outcomeDispatcher } from './outcomes';
import { CitizenReport, HazardCase } from '../types';

export interface StormScenarioStep {
  stepIndex: number;
  timeLabel: string;
  stormPhase: 'CLEAR' | 'APPROACHING_STORM' | 'TORRENTIAL_DOWNPOUR' | 'PEAK_FLASH_FLOOD' | 'RECEDING';
  sensorAdjustments: {
    stationId: string;
    rainfallMmH: number;
    riverPct: number;
  }[];
  autoEvents?: {
    wardId: string;
    roadName: string;
    lat: number;
    lng: number;
    description: string;
  }[];
}

export const STORM_SCENARIOS: StormScenarioStep[] = [
  {
    stepIndex: 0,
    timeLabel: '14:00 - Pre-Storm Baseline',
    stormPhase: 'CLEAR',
    sensorAdjustments: [
      { stationId: 'sensor-rg-01', rainfallMmH: 5.0, riverPct: 20 },
      { stationId: 'sensor-rl-02', rainfallMmH: 8.0, riverPct: 35 },
      { stationId: 'sensor-rg-03', rainfallMmH: 6.0, riverPct: 25 },
      { stationId: 'sensor-rl-04', rainfallMmH: 7.0, riverPct: 30 },
      { stationId: 'sensor-rg-05', rainfallMmH: 2.0, riverPct: 15 },
    ],
  },
  {
    stepIndex: 1,
    timeLabel: '15:30 - Rain Intensifies Across Basin',
    stormPhase: 'APPROACHING_STORM',
    sensorAdjustments: [
      { stationId: 'sensor-rg-01', rainfallMmH: 25.0, riverPct: 45 },
      { stationId: 'sensor-rl-02', rainfallMmH: 38.0, riverPct: 62 },
      { stationId: 'sensor-rg-03', rainfallMmH: 30.0, riverPct: 50 },
      { stationId: 'sensor-rl-04', rainfallMmH: 42.0, riverPct: 65 },
      { stationId: 'sensor-rg-05', rainfallMmH: 18.0, riverPct: 35 },
    ],
  },
  {
    stepIndex: 2,
    timeLabel: '17:00 - Extreme Flash Flood & River Crest (Peak)',
    stormPhase: 'PEAK_FLASH_FLOOD',
    sensorAdjustments: [
      { stationId: 'sensor-rg-01', rainfallMmH: 65.0, riverPct: 78 },
      { stationId: 'sensor-rl-02', rainfallMmH: 88.0, riverPct: 94 }, // Danger
      { stationId: 'sensor-rg-03', rainfallMmH: 72.0, riverPct: 86 },
      { stationId: 'sensor-rl-04', rainfallMmH: 95.0, riverPct: 96 }, // Danger
      { stationId: 'sensor-rg-05', rainfallMmH: 45.0, riverPct: 68 },
    ],
    autoEvents: [
      {
        wardId: 'ward-02',
        roadName: 'Kelani Flood Embankment Road',
        lat: 6.9610,
        lng: 79.8940,
        description: 'AUTOMATED SENSOR TRIGGER: River ultrasonic sensor exceeded 90% threshold. River overflow imminent.',
      },
    ],
  },
  {
    stepIndex: 3,
    timeLabel: '19:00 - Storm Passes, Runoff Recedes',
    stormPhase: 'RECEDING',
    sensorAdjustments: [
      { stationId: 'sensor-rg-01', rainfallMmH: 12.0, riverPct: 60 },
      { stationId: 'sensor-rl-02', rainfallMmH: 15.0, riverPct: 75 },
      { stationId: 'sensor-rg-03', rainfallMmH: 14.0, riverPct: 65 },
      { stationId: 'sensor-rl-04', rainfallMmH: 20.0, riverPct: 78 },
      { stationId: 'sensor-rg-05', rainfallMmH: 8.0, riverPct: 40 },
    ],
  },
];

class SimulatorService {
  private currentStepIndex: number = 2; // Default to active storm
  private isAutoPlaying: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  public getCurrentState() {
    return {
      currentStep: STORM_SCENARIOS[this.currentStepIndex],
      currentStepIndex: this.currentStepIndex,
      totalSteps: STORM_SCENARIOS.length,
      isAutoPlaying: this.isAutoPlaying,
    };
  }

  public setStep(index: number) {
    if (index < 0 || index >= STORM_SCENARIOS.length) return;
    this.currentStepIndex = index;
    const scenario = STORM_SCENARIOS[index];

    // Apply sensor updates
    for (const adj of scenario.sensorAdjustments) {
      const status = adj.riverPct >= 75 || adj.rainfallMmH >= 30 ? 'DANGER' : adj.riverPct >= 50 || adj.rainfallMmH >= 15 ? 'WARNING' : 'NORMAL';
      store.updateSensor(adj.stationId, {
        rainfallRateMmH: adj.rainfallMmH,
        riverCapacityPct: adj.riverPct,
        riverLevelMeters: (adj.riverPct / 100) * 6.5,
        status,
      });
    }

    // Check if auto-events are triggered by the sensor system
    if (scenario.autoEvents && scenario.autoEvents.length > 0) {
      for (const ev of scenario.autoEvents) {
        this.triggerSensorAlarm(ev);
      }
    }

    store.emit('SIMULATION_STEP_CHANGED', this.getCurrentState());
  }

  private async triggerSensorAlarm(ev: { wardId: string; roadName: string; lat: number; lng: number; description: string }) {
    const syntheticReport: CitizenReport = {
      id: `sensor-auto-rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
      userId: 'system-sensor-daemon',
      userName: 'Autonomous Telemetry Watchdog',
      userTrustScore: 1.0,
      hazardType: 'FLOOD',
      severity: 'CRITICAL',
      location: {
        lat: ev.lat,
        lng: ev.lng,
        roadName: ev.roadName,
        roadHierarchy: 'ARTERIAL_A1',
        wardId: ev.wardId,
        wardName: 'Kelani River Basin',
      },
      imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
      description: ev.description,
      needsRescue: false,
      status: 'PROCESSED',
    };

    store.addReport(syntheticReport);

    const context = caseBuilder.buildCaseContext(syntheticReport);
    const [imgCheck, weatherCheck, clusterCheck, locCheck, riskCheck] = await Promise.all([
      runImageCheck(syntheticReport, context),
      runWeatherCheck(syntheticReport, context),
      runClusterCheck(syntheticReport, context),
      runLocationCheck(syntheticReport, context),
      runRiskCheck(syntheticReport, context),
    ]);

    const caseId = `case-auto-${Date.now()}`;
    const verdict = hazardAggregator.aggregateSignals(
      caseId,
      syntheticReport,
      {
        image: imgCheck,
        weather: weatherCheck,
        cluster: clusterCheck,
        location: locCheck,
        risk: riskCheck,
      },
      context
    );

    const newCase: HazardCase = {
      id: caseId,
      reportId: syntheticReport.id,
      source: 'SENSOR_AUTO',
      createdAt: new Date().toISOString(),
      hazardType: 'FLOOD',
      status: 'VERIFIED',
      location: syntheticReport.location,
      imageUrl: syntheticReport.imageUrl,
      description: syntheticReport.description,
      roadClosed: true,
      broadcastSent: true,
      verdictData: verdict,
      nearbyVerifications: [],
    };

    store.addCase(newCase);
    await outcomeDispatcher.dispatchOutcomes(newCase, verdict, syntheticReport);
  }

  public nextStep() {
    const nextIdx = (this.currentStepIndex + 1) % STORM_SCENARIOS.length;
    this.setStep(nextIdx);
  }

  public prevStep() {
    const prevIdx = (this.currentStepIndex - 1 + STORM_SCENARIOS.length) % STORM_SCENARIOS.length;
    this.setStep(prevIdx);
  }

  public togglePlay() {
    this.isAutoPlaying = !this.isAutoPlaying;
    if (this.isAutoPlaying) {
      this.timer = setInterval(() => {
        this.nextStep();
      }, 10000);
    } else if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    store.emit('SIMULATION_PLAY_TOGGLED', { isAutoPlaying: this.isAutoPlaying });
  }
}

export const stormSimulator = new SimulatorService();
