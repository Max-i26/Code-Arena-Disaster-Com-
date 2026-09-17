# 🌊 ResQCity — Comprehensive User & Operational Guideline
> **Topic 04: Coordinating City Response to Floods and Road Hazards**  
> *CodeArena '26 Final Reference Document & Operational Standard Operating Procedure (SOP)*

---

## 1. Executive Summary & System Overview

**ResQCity** is an AI-powered, real-time disaster orchestration and road hazard response platform. It bridges the critical gap between noisy, unstructured citizen reports and isolated municipal sensor networks during extreme monsoon floods and storm events.

### 1.1 Core Problems Solved
1. **Unstructured & Duplicate Citizen Data**: Raw social media posts and hotline calls are notoriously noisy, often contain memes, fake images, or vague descriptions, and lack precise geospatial coordinates.
2. **Siloed Sensor Telemetry**: Automated river gauges and rainfall meters typically remain locked in separate departmental portals, failing to trigger pre-emptive road closures.
3. **Delayed Field Coordination**: Rescue units and clearance crews lack dynamic detour navigation that actively avoids submerged sectors, risking vehicle stalls and delayed operations.
4. **Chaotic Relief Management**: Displaced citizens struggle to locate emergency shelters with available beds, clean water, and medical accommodations.

### 1.2 System Mission
ResQCity combines live hydrological telemetry with multi-modal citizen submissions through a **6-Stage Reference Pipeline**, verifies events via a **5-Check Hybrid AI/Deterministic Engine**, and coordinates a **4-Role Operational Workflow** with an explainable, human-in-the-loop feedback chain.

---

## 2. End-to-End 6-Stage Reference Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STAGE 01: DUAL INGESTION ("Two Ways In")                                 │
│  • Inlet A: Citizen Portal (Photos, Geolocation, Rescue Demands)       │
│  • Inlet B: Physical Sensor Telemetry (Rainfall Gauges, River Levels)   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STAGE 02: CASE BUILDER (Deterministic Context Enrichment)               │
│  • Spatial Join: Coordinates -> Ward Boundary & Road Hierarchy (A1/Local)│
│  • Temporal Query: Pulls Ward sensor data & checks 200m/3h report cluster│
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STAGE 03: FIVE PARALLEL VERIFICATION CHECKS                             │
│  1. Image Vision AI     [AI]     -> Hazard presence & severity rating    │
│  2. Weather Rules       [SYSTEM] -> Deterministic rain rate & river %    │
│  3. Cluster Density     [SYSTEM] -> Spatial query (>=2 reports in 200m) │
│  4. Location Match      [AI]     -> Visual terrain vs. ward topography  │
│  5. Infrastructure Risk [AI]     -> Road importance & proximity to care  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STAGE 04: MULTI-SIGNAL HAZARD AGGREGATOR                                 │
│  • Synthesizes 5 checks -> CONFIRMED | NEEDS_VERIFICATION | REJECTED   │
│  • Computes confidence score (0-100%) and human-readable reasoning chain│
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STAGE 05: FOUR AUTOMATED SYSTEM OUTCOMES                                │
│  1. Citizen Clarification -> Community ping to nearby users for vote    │
│  2. Public GIS Publishing  -> Road marked CLOSED; dynamic detour live   │
│  3. Ward Emergency Alert  -> SMS/App broadcast warning sent to residents│
│  4. Council Work Order    -> Ticket created with triage diagnostic pack │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STAGE 06: FOUR OPERATIONAL ROLES & CONTINUOUS FEEDBACK                   │
│  • Council Officer   -> Real-time triage, squad dispatch, AI overrides  │
│  • Field Crew        -> Turn-by-turn flood bypass, photo completion     │
│  • Relief Desk       -> Intelligent shelter matching, resource restock  │
│  • System Admin      -> Confidence threshold tuning & spam governance   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 5-Check Hybrid Verification Engine

ResQCity separates deterministic physical facts from probabilistic artificial intelligence to ensure speed, auditability, and zero hallucination.

| # | Check Name | Modality | Engine Type | Evaluation Criteria | Output Schema |
|---|---|---|---|---|---|
| **1** | **IMAGE** | Multimodal Vision | DeepSeek / Heuristic Fallback | Validates presence of floodwater, downed trees, or mudslides. Immediately rejects memes, animals, and spam photos. | `{ pass: boolean, detectedHazard: string, visualSeverity: 'LOW'\|'MEDIUM'\|'HIGH'\|'CRITICAL', confidence: number }` |
| **2** | **WEATHER** | Numerical Telemetry | Plain Deterministic Rule | Verifies if local rainfall rate $\ge 30\text{ mm/h}$ OR upstream river capacity $\ge 75\%$. | `{ pass: boolean, rainfallRate: number, riverCapacityPct: number, thresholdExceeded: boolean }` |
| **3** | **CLUSTER** | Spatial-Temporal DB | Deterministic Geospatial Query | Checks if $\ge 2$ citizen submissions exist within a $200\text{m}$ radius and $3\text{-hour}$ window. | `{ pass: boolean, clusterCount: number, radiusMeters: 200, timeWindowHours: 3 }` |
| **4** | **LOCATION** | Vision & Metadata | Multimodal Topography AI | Cross-references visual environmental markers (foliage, buildings, road texture) with ward geographical profile. | `{ pass: boolean, topographyMatch: boolean, rationale: string }` |
| **5** | **RISK** | Spatial Criticality | Criticality Scoring AI | Analyzes road hierarchy (Arterial A-Grade vs. Local Street), proximity to hospitals, schools, and vulnerable populations. | `{ pass: boolean, criticalityScore: number, roadHierarchy: string, priorityRank: string }` |

---

## 4. Role-by-Role Operational Guidelines

### 4.1 Citizen & Community Persona 📱
*Target Users: General public, stranded commuters, neighborhood residents.*

* **Submitting a Hazard**:
  1. Open the **Citizen Portal** and select **Report Hazard**.
  2. Select the hazard category (Flood, Fallen Tree, Mudslide, Blocked Drain).
  3. Upload an on-site photo and allow GPS location tagging (or select ward from the dropdown).
  4. If trapped or requiring evacuation, toggle **"Immediate Evacuation Assistance Required"**, input household size, and flag vulnerable individuals (infants, elderly, wheelchair, medical dependencies).
  5. Click **Submit**. Receive immediate live feedback containing the assigned Case ID, AI verdict, and safety recommendations.
* **Community Verification ("Need More Info" Loop)**:
  * When an alert in your vicinity requires confirmation, an interactive verification card prompts you to tap **"I Confirm This Hazard"** or **"Path is Clear"**. A consensus vote automatically promotes borderline cases to `CONFIRMED`.
* **Public Evacuation Map**:
  * Consult the live interactive map to locate active road closures (red cordons), operational relief shelters (green icons), and live sensor warnings.

---

### 4.2 Municipal Council Officer Persona 🏛️
*Target Users: City Disaster Command Center, Municipal Commissioners, Dispatch Coordinators.*

* **Triage & Command Console**:
  1. Access the **Council Control** dashboard to view incoming cases ranked by urgency (`CRITICAL` $\rightarrow$ `HIGH` $\rightarrow$ `MEDIUM` $\rightarrow$ `LOW`).
  2. Click **Inspect 5 Checks & AI Rationale** on any ticket to view the exact diagnostic breakdown:
     * **Cyan Badges**: Deterministic Sensor & Cluster telemetry.
     * **Purple Badges**: AI Multimodal Vision, Topography, and Risk weights.
* **Squad Dispatching**:
  1. Inspect the right-hand panel for open work tickets.
  2. The system recommends the optimal field crew based on specialization (`Rapid Flood Pump Squad`, `Road Clearance Unit`, `Tree Removal Crew`) and proximity.
  3. Click **Dispatch Emergency Squad** to assign the unit. The ticket status transitions to `DISPATCHED` in real time.
* **Officer Override & Audit Trail**:
  * If local knowledge contradicts the automated recommendation, the officer can select **Override Verdict**, provide mandatory justification notes, and save. This action is committed to the immutable continuous learning feedback log.

---

### 4.3 Field Response Crew Persona 🚛
*Target Users: Municipal work crews, Navy rescue boat squads, emergency tree clearing personnel.*

* **Job Receipt & Navigation**:
  1. Open the **Field Crew Portal** and select your assigned squad ID.
  2. The interface displays the active work order, equipment requirements (e.g., *Industrial Submersible Pump*, *Chainsaw Set*), and contact details.
  3. Review the **Safe Detour Route**: The system calculates a route using A*/Dijkstra algorithms that strictly navigates around all confirmed flood barriers. Click **Open in Google Maps** for turn-by-turn transit.
* **Status Stepper & Photographic Proof**:
  1. Mark status as **ON-SITE** upon arrival.
  2. Execute clearance or pumping operations.
  3. Capture or select a completion photograph showing clear pavement and water drained.
  4. Click **Complete Job & Clear Public Map**.
  5. The system marks the ticket `RESOLVED`, updates the public GIS map, removes road closures, and notifies the command desk.

---

### 4.4 Relief & Shelter Coordinator Persona 🏠
*Target Users: Social welfare officers, Red Cross volunteers, community shelter managers.*

* **Smart Shelter Allocation**:
  1. Access the **Relief & Shelters** desk.
  2. The console displays a live occupancy grid for all city shelters (e.g., *Kelani Maha Vidyalaya*, *St. Peter's Community Center*).
  3. Under **Pending Evacuation Requests**, locate families flagged with high urgency.
  4. Click **Auto-Match Nearest Available Shelter**:
     * The algorithm identifies the closest open facility having sufficient bed capacity, wheelchair accessibility (if required), and active medical personnel.
     * The family is registered, bed count is automatically deducted, and a safe transit route is generated.
* **Resource Inventory & Restocking**:
  * Monitor live supplies of **Food Rations**, **Drinking Water (Liters)**, and **Medical First Aid Kits**.
  * Use the **One-Click Restock** triggers (`+50 Food Packs`, `+500L Clean Water`) when inventory drops below safety thresholds ($< 20\%$).

---

### 4.5 System Administrator Persona ⚙️
*Target Users: IT Administrators, GIS engineers, AI model supervisors.*

* **Storm Stream Simulation**:
  * Use the **Storm Stream Replay Engine** header bar to cycle through simulated meteorological storm phases:
    * `12:00 Clear Pre-Storm` $\rightarrow$ `14:00 Heavy Inflow` $\rightarrow$ `17:00 Flash Flood Peak` $\rightarrow$ `21:00 River Crest Alarm`.
  * Allows end-to-end rehearsal and testing of autonomous sensor alerts before actual monsoon landfalls.
* **AI Confidence & Tuning Sliders**:
  * Dynamically adjust the minimum confidence threshold required for automated road closure (default: $80\%$) and community verification triggers (default: $50\%$).
* **Anti-Spam & User Governance**:
  * Inspect flagged submissions with low reliability scores.
  * Administrators can permanently blacklist malicious IP addresses or repeat hoax numbers, rejecting subsequent inputs at Stage 01.

---

## 5. Standard Operating Procedures (SOPs)

### Phase 1: Pre-Storm Readiness (Rainfall Forecast > 50mm)
1. System Admin verifies telemetry polling intervals ($30\text{ seconds}$) and loads municipal ward geometries.
2. Shelter Coordinator checks initial food/water stocks and marks volunteer shelter locations as `OPEN`.
3. Field crews perform equipment readiness checks and log standby GPS coordinates.

### Phase 2: Active Monsoon & Flash Flood Event
1. **Autonomous Watchdog**: Ultrasonic river sensors reaching $75\%$ trigger pre-emptive alert warnings in Ward 02.
2. **Citizen Inflow**: Citizen reports are ingested, verified by the 5-check engine within $< 2\text{ seconds}$, and categorized.
3. **Command & Control**: Council officers monitor the live GIS feed, authorizing emergency pump dispatches for arterial highways (A1, A2) first.
4. **Humanitarian Route**: Stranded families are assigned to shelters avoiding flooded road segments.

### Phase 3: Post-Disaster Recovery & De-escalation
1. Field response crews upload verified completion photos for all assigned sectors.
2. Council officers verify reopening criteria and restore regular traffic flows on public GIS layers.
3. System Admin exports the operational audit log and AI learning dataset for post-event municipal reporting.

---

## 6. Technical Setup, Execution & Verification

### 6.1 System Requirements
* **Operating System**: Windows 10/11, Ubuntu 20.04+, or macOS.
* **Runtime**: Node.js (v18.0 or higher) and npm (v9.0 or higher).
* **Browsers Supported**: Google Chrome, Mozilla Firefox, Microsoft Edge, Safari.

### 6.2 Quick Start Commands
```bash
# 1. Install root & client dependencies
npm install
npm --prefix client install

# 2. Run both Server & Client concurrently
npm run dev

# 3. Access Portals:
# - Frontend Application: http://localhost:5173
# - REST API / Health:    http://localhost:3001/health
# - Live WebSocket:       ws://localhost:3001/ws
```

### 6.3 Automated Test Suite Execution
ResQCity includes a comprehensive test suite validating all 22 competition evaluation criteria across the full 6-stage architecture:
```bash
npm run test
```
*Verification standard: 22 of 22 tests passing ($100\%$), confirming compliance across all ingestion streams, AI checks, triage logic, routing, and role feedback loops.*

---

## 7. Reliability, Fail-safe Mechanisms & Ethical Governance

* **Zero Single Point of Failure**:
  If the external AI vision API experiences latency or outage, the system seamlessly activates the **Deterministic Heuristic Fallback Engine**, ensuring that weather sensor thresholds and cluster queries continue to protect city residents without disruption.
* **Database Resiliency**:
  If an external MySQL cluster is unreachable, ResQCity switches automatically to the local embedded persistent JSON engine ([persistent_store.json](file:///f:/Code-Arena/server/src/db/persistent_store.json)), preventing any loss of in-flight emergency cases.
* **Explainable AI (XAI)**:
  ResQCity produces an auditable rationale text string for every single verdict. No autonomous action (road closure, alert, ticket) is executed as a "black box".
* **Data Privacy**:
  Citizen personal data (phone numbers, household identities) is strictly restricted to the authorized Relief & Shelter Desk and is never exposed on the public GIS map.
