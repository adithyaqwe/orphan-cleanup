# 🛡️ RESCUE-AI — Real-Time Emergency Operations & AI CAD Dispatch Engine

Production-grade real-time emergency operations center (EOC) Computer-Aided Dispatch (CAD) & GIS platform built for municipal emergency management, fire service, ambulance dispatch, and law enforcement environments. Powered by Node.js, Express.js, Socket.IO, MongoDB, Mongoose ORM, React 19, Vite, Tailwind CSS, MapLibre GL 3D / Leaflet 2D GIS, and Google Gemini 2.5 Flash AI Triage Engine.

---

## 📋 Table of Contents
1. [Architecture Overview & Diagrams](#1-architecture-overview--diagrams)
   - [A. High-Level System Architecture (Mermaid & Flow)](#a-high-level-system-architecture-mermaid--flow)
   - [B. Database Data Model & Entity-Relationship (ER) Diagram](#b-database-data-model--entity-relationship-er-diagram)
   - [C. Dual Data Stream Pipeline](#c-dual-data-stream-pipeline)
   - [D. 12-Stage Incident Dispatch & Triage Sequence](#d-12-stage-incident-dispatch--triage-sequence)
2. [AI Emergency Triage & Apparatus Recommendation Matrix](#2-ai-emergency-triage--apparatus-recommendation-matrix)
3. [Key Architectural Patterns](#3-key-architectural-patterns)
4. [Environment Variables Configuration](#4-environment-variables-configuration)
5. [Local Development Setup Guide](#5-local-development-setup-guide)
6. [Project Directory Structure](#6-project-directory-structure)
7. [REST API Reference & Socket.IO Events](#7-rest-api-reference--socketio-events)
8. [Security & Operational Guardrails](#8-security--operational-guardrails)
9. [Verifiable Audit Trail & CAD Logs](#9-verifiable-audit-trail--cad-logs)

---

## 1. Architecture Overview & Diagrams

RESCUE-AI translates chaotic emergency distress calls into triaged emergency profiles, recommends nearest available first-responder apparatus, calculates real-time driving routes via OSRM, and streams live telemetry across 2D/3D command cartography views.

### A. High-Level System Architecture (Mermaid & Flow)

### B. Database Data Model & Entity-Relationship (ER) Diagram
The system maintains 3 core entities in MongoDB via Mongoose ORM: `Incident`, `Responder`, and `User`.

#### Database Table / Collection Specifications

| Collection | Primary Key / Indexes | Description |
| :--- | :--- | :--- |
| **Incident** | `_id` (ObjectId), `incidentId` (Unique String), `status` | Ingested emergency 911 call records, AI triage assessments, location coordinates, priority scores, and unit assignments. |
| **Responder** | `_id` (ObjectId), `unitId` (Unique String), `type`, `status` | Fleet telemetry records for EMS Ambulances, Fire Engines, Police Patrols, and Heavy Rescue apparatus. |
| **User** | `_id` (ObjectId), `email` (Unique String), `role` | Authorized dispatch operators, supervisors, and municipal administrative accounts. |

### C. Dual Data Stream Pipeline
- **Call Intake & AI Triage Stream**: Ingests raw incident text narrative (`eventId`, `type`, `location`, `victimsCount`, `description`), executes structured Gemini 2.5 Flash analysis, assigns apparatus, and emits `incident:created` Socket.IO broadcast.
- **AVL Fleet Telemetry Stream**: Simulates high-frequency Automatic Vehicle Location (AVL) GPS telemetry (`unitId`, `lat`, `lng`, `status`, `speed`), recalculates route distances, and emits `responder:locationUpdate` every 5 seconds.

### D. 12-Stage Incident Dispatch & Triage Sequence
```
1. Emergency Call Received ──> 2. Structured Ingestion ──> 3. Gemini 2.5 Flash AI Analysis
                                                                    │
6. OSRM Road Distance Calc <── 5. Spatial Nearest Unit <── 4. Apparatus Match Matrix
        │
        ▼
7. Priority Score Computed ──> 8. MongoDB Persistence ──> 9. Socket.IO Broadcast
                                                                    │
12. Status Closed & Archived <── 11. En Route / On Scene <── 10. Operator Confirmation
```

---

## 2. AI Emergency Triage & Apparatus Recommendation Matrix

RESCUE-AI utilizes a structured JSON prompt schema with Google Gemini 2.5 Flash, paired with a deterministic local rule-based fallback heuristic classifier:

| Incident Type | Default Priority | Recommended Response Time | Required Apparatus Services | Immediate Action Standard |
| :--- | :--- | :--- | :--- | :--- |
| **Fire / Explosion** | CRITICAL / HIGH | < 5 minutes | Fire, Police, Ambulance | Evacuate immediate hazard area and deploy chemical foam tender |
| **Mass Casualty / Cardiac** | CRITICAL | < 5 minutes | Ambulance, Medical | Deploy ALS resuscitation team & dispatch paramedic unit |
| **Traffic Collision** | HIGH | < 8 minutes | Ambulance, Police, Fire | Secure highway perimeter and extricate trapped victims |
| **Armed Crime / Assault** | HIGH / CRITICAL | < 10 minutes | Police | Dispatch armed response squad and set up containment |
| **Hazardous Spill** | HIGH | < 10 minutes | Fire, Medical | Contain toxic run-off and isolate 500m radius |
| **Routine Medical / Other** | MEDIUM / LOW | < 15 minutes | Ambulance | Dispatch nearest available Basic Life Support (BLS) unit |

---

## 3. Key Architectural Patterns

- **Separation of CAD Triage Heuristics and Real-World GIS Routing**: Triage categorization (severity, required units, victim count) is handled by deterministic AI/rule heuristics. Driving ETAs and road routes are calculated using OSRM (Open Source Routing Machine) arterial road geometry rather than straight-line haversine distance.
- **Fail-Safe AI Degradation Pipeline**: If `GEMINI_API_KEY` is absent or network connectivity drops, the system seamlessly degrades to a deterministic local rule-based regex parser with 100% zero downtime guarantee.
- **Pure JavaScript & ESM Module Architecture**: Written in clean ESM JavaScript (`.js` / `.jsx`) for rapid iteration, maximum bundler speed, and zero compilation friction.
- **Interactive Command Cartography**: Integrates MapLibre GL 3D vector maps and Leaflet 2D light raster tile layers with 6 selectable color themes (Carto Light, Dark Vector, Midnight Emerald, Positron Light, Satellite Hybrid, Liberty Topo, OSM Standard) and persistent `localStorage` states.

---

## 4. Environment Variables Configuration

### Backend Environment Configuration (`backend/.env`)

| Variable | Required | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | Express REST API server listening port | `5000` |
| `MONGO_URI` | Yes | MongoDB database connection URI | `mongodb://localhost:27017/rescue-ai` |
| `GEMINI_API_KEY` | Optional | Google Gemini 2.5 Flash AI API key for call classification | `AIzaSy...` |
| `VITE_3D_MAP_STYLE_URL` | Optional | Custom vector map style JSON endpoint | `https://tiles.openfreemap.org/styles/positron` |

### Frontend Environment Configuration (`frontend/.env`)

| Variable | Required | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | Base URL connecting to Express API | `http://localhost:5000` |
| `VITE_MAP_TILE_URL` | Optional | Custom 2D raster tile server URL pattern | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |

---

## 5. Local Development Setup Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB community server running on port 27017 or MongoDB Atlas URI

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/adithyaqwe/RESCUE-AI.git
cd RESCUE-AI

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### Step 2: Start Development Servers

In Terminal 1 (Backend Server & Socket.IO Engine):
```bash
cd backend
npm run dev
# Express API running on http://localhost:5000
# Database connected & initial fleet seeded
```

In Terminal 2 (React + Vite Enterprise Frontend):
```bash
cd frontend
npm run dev
# Vite CAD App running on http://localhost:5173
```

---

## 6. Project Directory Structure

```text
RESCUE-AI/
├── README.md                  <-- Master architectural handbook & system manual
├── backend/                   <-- Node.js / Express.js / Socket.IO REST Engine
│   ├── package.json
│   └── src/
│       ├── config/            <-- MongoDB database connection & seed dataset
│       ├── controllers/       <-- HTTP route handlers (incidents, responders, chat)
│       ├── models/            <-- Mongoose schemas (Incident, Responder, User)
│       ├── routes/            <-- Express route definitions
│       ├── services/          <-- Gemini 2.5 Flash AI triage & AVL simulation
│       └── index.js           <-- Express & Socket.IO server entry point
└── frontend/                  <-- Enterprise React 19 + Vite CAD Single Page App
    ├── index.html             <-- HTML entry with main.jsx module root
    ├── package.json
    ├── vite.config.js         <-- Vite build & proxy configuration
    └── src/
        ├── App.css
        ├── App.jsx            <-- Master EOC Command Center layout container
        ├── api.js             <-- Axios HTTP client definitions
        ├── index.css          <-- Tailwind CSS v4 directives & light design tokens
        ├── main.jsx           <-- React 19 root bootstrap
        └── components/
            ├── AiAssistant.jsx       <-- AI Dispatch copilot chat interface
            ├── CallIntake.jsx        <-- Emergency call intake modal form
            ├── CustomCursor.jsx      <-- Tactical CAD crosshair reticle
            ├── FleetMonitor.jsx      <-- Live AVL fleet roster table
            ├── IncidentControl.jsx   <-- Command dossier & unit dispatch controller
            ├── IncidentList.jsx      <-- Incident queue feed & filter panel
            ├── MouseLight.jsx        <-- Radial ambient light backdrop
            ├── RadarMap.jsx          <-- 2D/3D map container & theme sync
            ├── StatusBar.jsx         <-- Municipal CAD status telemetry footer
            ├── SystemLogs.jsx        <-- Live dispatch event stream feed
            ├── ToastNotification.jsx <-- Alert notification engine
            └── map/
                ├── GisMap2D.jsx      <-- Leaflet 2D light GIS engine
                ├── GisMap3D.jsx      <-- MapLibre GL 3D vector GIS engine
                ├── Map3DControls.jsx <-- Pitch, tilt, zoom, and compass controls
                ├── MapControls.jsx   <-- 2D map controls & layer toggle
                ├── MapLayersMenu.jsx <-- Theme selector popover with live swatches
                └── mapUtils.js       <-- Distance math, OSRM routing, & map themes
```

---

## 7. REST API Reference & Socket.IO Events

### REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/health` | Server liveness & status check |
| **GET** | `/api/incidents` | Fetch all active and cleared emergency incidents |
| **POST** | `/api/incidents` | Submit new emergency intake call (triggers AI triage) |
| **GET** | `/api/incidents/:id` | Retrieve specific incident details & assignment dossier |
| **PUT** | `/api/incidents/:id/dispatch` | Dispatch apparatus units to incident location |
| **PUT** | `/api/incidents/:id/status` | Update incident response status (`EN_ROUTE`, `ARRIVED`, `RESOLVED`) |
| **GET** | `/api/responders` | Retrieve real-time fleet roster & unit locations |
| **POST** | `/api/chat` | Query AI Dispatch Copilot assistant for tactical guidance |

### Socket.IO Real-Time Events

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `incident:created` | Server ➔ Client | `Incident` object | Broadcast when a new incident is triaged & added |
| `incident:updated` | Server ➔ Client | `Incident` object | Broadcast when incident status or dispatch changes |
| `responder:locationUpdate` | Server ➔ Client | `[Responders]` | High-frequency telemetry stream of unit coordinates |

---

## 8. Security & Operational Guardrails

- **Sanitized AI Input**: Raw emergency descriptions are cleaned and validated before submission to Gemini 2.5 Flash to prevent prompt injection.
- **Fail-Safe Response Fallbacks**: Heuristic local regex parsing ensures continuous operations even during complete WAN outages.
- **CORS & Origin Protections**: Express server restricts CORS origins in production environments to authorized municipal dispatch terminals.

---

## 9. Verifiable Audit Trail & CAD Logs

Every dispatch transaction, unit assignment, and status transition is recorded in the operational event log stream containing:
- `timestamp`: ISO 8601 millisecond timestamp.
- `category`: `INTAKE`, `DISPATCH`, `STATUS`, `ALERT`, or `NETWORK`.
- `text`: Human-readable CAD dispatch log event payload.

Dispatch logs can be inspected live via the System Event Stream tab.
