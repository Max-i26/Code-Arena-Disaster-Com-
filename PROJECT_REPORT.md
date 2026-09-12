# 🌊 ResQCity — Full Project Documentation & System Report
> **Topic 04: Coordinating City Response to Floods and Road Hazards**  
> *CodeArena'26 Ideathon Final Solution Report*

---

## 1. Project Overview & Problem Statement

### 1.1 The Real-World Problem
During heavy monsoon storms and severe flooding events, cities face chaos:
1. **Noisy & Unverified Information**: Citizens report flooded roads or fallen trees on social media or phone calls with duplicate entries, vague locations, and fake or unverified photos.
2. **Disconnected Data**: Live weather gauges and river level sensors sit in isolated dashboards, separate from citizen reports. This leads to delayed road closures and stranded drivers.
3. **Slow Response & Relief**: City councils struggle to know which hazard to fix first, emergency crews get stuck on flooded roads while trying to respond, and displaced families cannot easily find shelters with open beds and food.

### 1.2 Our Solution: ResQCity
**ResQCity** is an AI-powered urban disaster coordination platform. It combines live weather/river telemetry with citizen reports, runs a **5-check hybrid verification engine**, synthesizes a clear **AI verdict**, triggers **4 automated outcomes**, and connects **4 human operational roles** in a closed feedback loop.

---

## 2. System Architecture: The 6-Stage Flow

ResQCity strictly follows the **6-Stage Architecture Pipeline**:

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ STAGE 01: TWO WAYS IN (Dual Ingestion)                                  │
 │  • Inbound Inlet 1: Citizen App (Photo, GPS, Description, Rescue Request)│
 │  • Inbound Inlet 2: Weather & River Sensor Stream (Storm Replay Engine)  │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ STAGE 02: CASE BUILDER (Deterministic System Context Engine)             │
 │  • Maps GPS coords -> City Ward & Road Segment (Arterial vs Local)      │
 │  • Fetches live sensor data & 200m/3h nearby report history             │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ STAGE 03: FIVE PARALLEL CHECKS (2 Deterministic SYSTEM + 3 AI Checks)   │
 │  1. Image Vision AI     -> Detects flood/tree/landslide; rejects memes  │
 │  2. Weather SYSTEM Check -> Checks rainfall (mm/h) & river level (%)    │
 │  3. Cluster SYSTEM Check -> Queries nearby reports (>=2 in 200m/3h)     │
 │  4. Location AI Check   -> Matches visual terrain to Ward topography    │
 │  5. Risk AI Check       -> Calculates urgency by road type & safety     │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ STAGE 04: HAZARD AGGREGATOR (AI Multi-Signal Decision Engine)           │
 │  • Synthesizes 5 checks into: CONFIRMED | NEEDS_VERIFICATION | REJECTED │
 │  • Assigns Confidence Score (0-100%) & Explainable Reasoning Chain      │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ STAGE 05: FOUR AUTOMATED OUTCOMES                                       │
 │  1. Need More Info  -> Sends verification prompt to nearby citizens    │
 │  2. Published       -> Pins hazard on live public map & closes road    │
 │  3. Area Alert      -> Broadcasts ward warning & safe detour path      │
 │  4. Council Ticket  -> Generates work order with full diagnostic bundle│
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ STAGE 06: FOUR-ROLE HUMAN RESPONSE & AI FEEDBACK CHAIN                  │
 │  • Role 1: Municipal Council Officer (Control Dashboard & Dispatch)    │
 │  • Role 2: Field Response Crew (Mobile Portal, Detour, Photo Proof)    │
 │  • Role 3: Relief & Shelter Coordinator (Shelter Match & Restock)      │
 │  • Role 4: System Admin (AI Retuning, Sliders & Spam User Banning)     │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Data Flow: Step-by-Step

Here is how data moves through the system in real time:

### Scenario A: A Citizen Reports a Flooded Road
1. **Submission (Stage 01)**: A citizen opens the app, uploads a photo, enters description *"Water 3ft deep across road"*, and submits GPS coordinates.
2. **Spatial Join (Stage 02)**: The backend `CaseBuilder` maps the coordinates to **Ward 02 (Kelani River Basin)** and **Baseline Road (Arterial A1)**. It attaches current river sensor readings and checks for nearby reports.
3. **Verification (Stage 03)**:
   - **Image AI**: Confirms water inundation signature (92% visual confidence).
   - **Weather Check**: Confirms rainfall rate exceeds the 30 mm/h threshold.
   - **Cluster Check**: Finds 1 existing nearby report within 200m.
   - **Location AI**: Validates scene matches road environment.
   - **Risk AI**: Rates urgency as **CRITICAL** because Baseline Road is a major arterial corridor.
4. **AI Verdict (Stage 04)**: The `HazardAggregator` synthesizes the signals and outputs **CONFIRMED** with 88% confidence.
5. **Outcomes Triggered (Stage 05)**:
   - The road segment is marked **CLOSED** on the public map.
   - An **Area Alert** is sent to ward residents.
   - A **Council Ticket** (`ticket-101`) is generated for dispatch.
6. **Human Action & Feedback (Stage 06)**:
   - **Council Officer** inspects the ticket and dispatches *Rapid Flood Pump Unit 01*.
   - **Field Crew** receives a safe detour route bypassing flooded zones, pumps out the floodwater, uploads a resolution photo, and marks the job **RESOLVED**.
   - The public map automatically updates, reopening the road to traffic.
   - The officer's confirmation logs into the **AI Continuous Learning Feedback Loop**.

---

### Scenario B: A Stranded Family Requests Evacuation & Shelter
1. **Rescue Request**: A family of 4 (with an elderly member needing wheelchair access) submits a rescue request.
2. **Relief Desk Processing**: The **Relief Coordinator** sees the request automatically float to the top of the queue with priority badges (🔴 Medical / 🟡 Elderly).
3. **Smart Shelter Match**: The system calculates available bed capacities and safe, non-flooded routes to assign the family to **Kelani Maha Vidyalaya Relief Center** (which has open capacity, wheelchair access, and food packs).
4. **Resource Restock**: If supplies run low, the shelter coordinator clicks `+50 Food Packs` or `+500L Water` to immediately dispatch restock orders.

---

## 4. The 4 Operational Roles Explained

ResQCity provides tailored portals for every emergency stakeholder:

| Role | Primary Purpose | Key Features & Actions |
|---|---|---|
| 🟡 **Council Officer** | City-wide Control & Command | Live GIS map view, case triage sorted by urgency (`CRITICAL` → `HIGH`), officer decision panel (Agree with AI or Override with notes), crew dispatch, and resolved job archives. |
| 🟢 **Field Response Crew** | On-Ground Clearance & Navigation | 4-step job progress stepper (`OPEN` → `DISPATCHED` → `ON-SITE` → `RESOLVED`), safe detour routing, hazard-specific equipment checklist (chainsaws, pumps, sandbags), 1-click Google Maps link, and photographic completion proof upload. |
| 🟣 **Relief & Shelter Desk** | Humanitarian Relief & Evacuation | Manual rescue request entry form, intelligent shelter capacity matching, special needs priority badges, supply restock UI (`+50 Food`, `+500L Water`), and route ETA calculation. |
| ⚙️ **System Admin** | AI Tuning & System Governance | Live system health metrics, performance KPI strip, manual case override search, AI feedback log filtering, AI confidence sliders, and false reporter IP/user banning. |

---

## 5. Technology Stack & Key Libraries

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Leaflet (OpenStreetMap / Esri Satellite raster tiles).
- **Backend**: Node.js, Express.js, TypeScript, WebSocket server (`ws`), Multer (photo upload handling).
- **AI Engine**: NVIDIA NIM Multimodal Vision & Text Models (`deepseek-ai/deepseek-v4-flash-0731`) with heuristic fallback engines.
- **Geospatial & Routing Engine**: Haversine distance spatial joins, A* Dijkstra graph pathfinding algorithm for safe detour routing.

---

## 6. How to Run & Validate the System

### 6.1 Prerequisites
- Node.js v18+ installed on Windows / Linux / macOS.

### 6.2 Setup & Start
```bash
# 1. Install dependencies
npm install
npm --prefix client install

# 2. Start Backend Server (runs on http://127.0.0.1:3001)
npm run dev:server

# 3. Start Frontend Client (runs on http://localhost:5173)
npm run dev:client
```

### 6.3 Verification Suite
Run the automated end-to-end test suite to validate all 22 competition criteria:
```bash
npm run test
```
*Expected Output*: `Passed: 22 / 22 (100%) 🏆 ALL COMPETITION CRITERIA & ARCHITECTURAL STAGES FULLY VALIDATED!`

### 6.4 Production Build
```bash
npm run build
```

---

## 7. Summary & Repository Links

- **GitHub Repository**: [Max-i26 / Code-Arena-Disaster-Com-](https://github.com/Max-i26/Code-Arena-Disaster-Com-.git)
- **Master Branch**: Synchronized & clean.
- **Architectural Spec**: `SOLUTION.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **Postman API Collection**: `ResQCity_Postman_Collection.json`
