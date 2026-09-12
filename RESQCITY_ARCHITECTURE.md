# ResQCity — Overall Application Process & System Architecture

**ResQCity** is an AI-driven, multi-persona **Urban Disaster Response & GIS Municipal Command System**. It automates the end-to-end lifecycle of disaster incidents—from citizen reporting and automated 5-signal AI verification to emergency squad dispatch, victim shelter matching, safe detour routing, and field resolution.

---

## 🏗️ System Architecture Diagram

```
                                  ┌────────────────────────┐
                                  │   CITIZEN REPORTING    │
                                  │  (Photo & GPS Ingest)  │
                                  └───────────┬────────────┘
                                              │
                                              ▼
                                  ┌────────────────────────┐
                                  │   GIS CASE BUILDER     │
                                  │ (Ward & Road Resolver) │
                                  └───────────┬────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                           STAGE 03: 5-SIGNAL PARALLEL AI ENGINE                            │
├───────────────┬────────────────┬─────────────────┬───────────────────┬────────────────────┤
│ 1. Computer   │ 2. Weather     │ 3. Spatial      │ 4. GIS Location   │ 5. Historical Risk │
│    Vision     │    Telemetry   │    Cluster Check│    Risk Check     │    Check           │
└───────┬───────┴───────┬────────┴────────┬────────┴─────────┬─────────┴──────────┬─────────┘
        │               │                 │                  │                    │
        └───────────────┴────────┐        │        ┌─────────┴────────────────────┘
                                 ▼        ▼        ▼
                      ┌────────────────────────────────────────┐
                      │    STAGE 04: HAZARD AGGREGATOR ENGINE  │
                      │  Confidence Score (%) & Verdict Decision│
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                           STAGE 05: QUAD-PATH OUTCOME DISPATCH                            │
├─────────────────────┬──────────────────────┬──────────────────────┬───────────────────────┤
│ 1. Public GIS Map   │ 2. Safe Detour       │ 3. Council Work      │ 4. Shelter Rescue     │
│    Road Closures    │    Routing Engine    │    Order Dispatch    │    & Matching         │
└─────────────────────┴──────────────────────┴──────────┬───────────┴───────────────────────┘
                                                         │
                                                         ▼
                                              ┌────────────────────┐
                                              │ STAGE 06: FIELD    │
                                              │ RESOLUTION & RE-OPEN│
                                              └────────────────────┘
```

---

## 👥 Persona System & Access Control

ResQCity features **5 distinct user personas**, each tailored with specific operational interfaces and identity control:

| Persona | Role | Key Responsibilities & Capabilities | Verification Requirement |
| :--- | :--- | :--- | :--- |
| **Citizen** | `CITIZEN` | Submit hazard reports, request emergency rescue, view live GIS map & detour routes. | **Instant Activation** (No NIC required) |
| **Council Officer** | `COUNCIL_OFFICER` | Manage municipal command, review reported cases feed, remove unneeded cases, dispatch field response squads. | **Official NIC Verification** (`PENDING` admin approval) |
| **Field Response Squad** | `FIELD_CREW` | Accept dispatched tickets, view safe navigation routes, clear hazards, upload completion proof photos. | **Official NIC Verification** (`PENDING` admin approval) |
| **Relief Desk** | `RELIEF_DESK` | Manage victim evacuation queue, monitor shelter capacities, allocate emergency supplies. | **Official NIC Verification** (`PENDING` admin approval) |
| **System Admin** | `SYSTEM_ADMIN` | Tune AI confidence sliders, approve official NIC accounts, ban false report spammers, export audit trails, create new admin accounts. | **Restricted / Admin-Only Creation** |

### 🔐 Official Personnel Identity Verification Flow
1. **Registration**: Official roles (`COUNCIL_OFFICER`, `FIELD_CREW`, `RELIEF_DESK`) register with their National Identity Card (NIC) number, uploaded NIC document proof photo, and department credentials.
2. **Pending Lock Screen**: Unverified accounts logging in encounter an **Account Verification Pending** lock banner, blocking access to municipal command functions.
3. **Admin Queue Review**: System Administrators inspect pending registrations inside the **Official Personnel Verification Queue** and approve (`APPROVED`) or reject (`REJECTED`) access.

---

## 🔄 The 6-Stage Disaster Incident Response Process

### **Stage 1: Ingestion & Telemetry Pipeline**
- Citizens capture photos directly via file or camera upload (no text URL required) and submit hazard category, severity, GPS location, household count, and rescue needs.
- Environmental sensors (weather telemetry stations and river crest gauges) continuously stream real-time telemetry to the system via WebSocket connections.

### **Stage 2: GIS Case Building & Spatial Resolution**
- The **Case Builder Service** maps raw latitude/longitude coordinates to municipal wards, primary/secondary road networks, and street hierarchies.
- Computes baseline threat indicators before passing payload to the AI inspection pipeline.

### **Stage 3: 5-Signal Parallel AI Inspection**
When a report is ingested, 5 independent diagnostic checks run concurrently:
1. **Computer Vision Check**: Inspects report images for hazard indicators (water accumulation, downed trees, structural debris).
2. **Weather Telemetry Check**: Compares location coordinates against live rainfall intensity ($\text{mm/h}$) and wind speed sensor readings.
3. **Spatial Cluster Check**: Scans for surrounding citizen reports submitted within a $500\text{m}$ radius and 30-minute window.
4. **GIS Location Risk Check**: Evaluates proximity to river basins, floodplains, or known landslide-prone slopes.
5. **Historical Risk Check**: Queries historic incident records for the specific road segment.

### **Stage 4: Hazard Aggregator & AI Verdict Engine**
- Synthesizes weighted outputs from all 5 signals into a unified **Confidence Score ($0\% - 100\%$)** and **Urgency Rating** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Auto-Publishing Cutoff**: Reports exceeding the System Administrator's confidence threshold (e.g. $\ge 70\%$) are automatically confirmed (`CONFIRMED`).
- Borderline reports prompt community verification or manual municipal review.

### **Stage 5: Quad-Path Outcome Dispatch**
Confirmed verdicts trigger four simultaneous automated outcomes:
1. **Public GIS Map Update**: Places confirmed hazard cordons and marks affected roads as **CLOSED** on the interactive map.
2. **Dynamic Safe Detour Routing**: Calculates alternative detour paths avoiding closed road segments for commuters and emergency vehicles.
3. **Council Work Order Generation**: Automatically generates open work orders for Council Officers, featuring specialized squad auto-assignment (e.g., Water Pumping, Chainsaw Clearance, Rescue Boat, Road Repair).
4. **Relief & Shelter Matching**: Converts rescue requests into victim queue entries, automatically matching households to open shelters with adequate bed capacity and required medical supplies.

### **Stage 6: Field Resolution, Removal & Continuous AI Learning**
- **Field Resolution**: Dispatched field squads navigate to the site via safe detour routes, resolve the hazard, and upload resolution proof photos. Upon completion, the road segment is re-opened (`OPEN`) on the public map.
- **Case Removal**: Council Officers can delete unneeded or false citizen reports directly using the **`Remove Case`** option in the Council Dashboard.
- **Continuous AI Learning Loop**: Human decision logs (`AGREED`, `OVERRIDDEN_VERIFIED`, `OVERRIDDEN_REJECTED`) are recorded in the AI tuning log to continuously refine prompt parameters and confidence thresholds.

---

## 🛠️ Technology Stack & System Components

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Leaflet GIS Maps.
- **Backend API**: Node.js, Express, TypeScript, Multer (file upload processing), WebSockets (`ws`).
- **Persistence Layer**: Dual-mode storage engine supporting **XAMPP MySQL** with a fallback persistent memory state store.
- **Routing Engine**: Dijkstra-based safe route pathfinder incorporating road closure penalties.
