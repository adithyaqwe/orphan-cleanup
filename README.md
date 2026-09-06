# 🛡️ OrphanCleanup — Ephemeral Resource Lifecycle Leak Detection Platform

Production-grade real-time ephemeral resource lifecycle management and leak prevention platform built for cloud infrastructure engineering, DevOps, and municipal cloud operations environments. Powered by **Node.js**, **Express.js**, **MongoDB**, **Mongoose ORM**, **React 18**, **Vite**, and **Google Gemini AI Advisory Engine**.

> **"WHEN THE SYSTEM IS UNCERTAIN, IT DOES NOT DELETE — IT ASKS A HUMAN."**

---

## 📋 Table of Contents

1. [Architecture Overview & Diagrams](#1-architecture-overview--diagrams)
   - [A. High-Level System Architecture](#a-high-level-system-architecture)
   - [B. Database Data Model & Entity Specifications](#b-database-data-model--entity-specifications)
   - [C. Multi-Factor Detection & Triage Sequence](#c-multi-factor-detection--triage-sequence)
2. [Core Detection & Safety Matrix](#2-core-detection--safety-matrix)
3. [Human-in-the-Loop Safety Fallback System](#3-human-in-the-loop-safety-fallback-system)
4. [Two-Phase Reclamation & Grace Period Engine](#4-two-phase-reclamation--grace-period-engine)
5. [Key Architectural Safeguards](#5-key-architectural-safeguards)
6. [Environment Variables Configuration](#6-environment-variables-configuration)
7. [Local Development Setup Guide](#7-local-development-setup-guide)
8. [Project Directory Structure](#8-project-directory-structure)
9. [REST API Reference](#9-rest-api-reference)
10. [Security, RBAC & Immutable Compliance Audit Trail](#10-security-rbac--immutable-compliance-audit-trail)

---

## 1. Architecture Overview & Diagrams

OrphanCleanup continuously monitors temporary cloud resources (EC2 instances, Kubernetes pods, preview build environments, containers) to identify abandoned infra leaks while enforcing a **Zero False Positive Reclamation Guarantee**.

### A. High-Level System Architecture

```text
  [ Cloud Telemetry / Ingestion ] ──> [ Multi-Factor Detection Engine ]
                                                   │
                ┌──────────────────────────────────┴──────────────────────────────────┐
                ▼                                                                     ▼
      [ High-Confidence Signals ]                                           [ Low / Conflicting Signals ]
                │                                                                     │
                ▼                                                                     ▼
    [ VERIFIED_ORPHAN ]                                                   [ HUMAN_REVIEW_REQUIRED ]
                │                                                                     │
                ▼                                                                     ▼
[ 5-Min Grace Period + Liveness ]                                         [ Operator Human Review UI ]
                │                                                                     │
                ├───────────────────────────────┐                             ┌───────┴───────┐
                ▼                               ▼                             ▼               ▼
      [ Liveness Resumed ]                 [ Expired ]                   [ Protect ]     [ Approve ]
                │                               │                             │               │
                ▼                               ▼                             ▼               ▼
           [ PROTECTED ]                   [ RECLAIMED ]                 [ PROTECTED ]   [ Grace Period ]
```

### B. Database Data Model & Entity Specifications

The platform maintains core entities in MongoDB via Mongoose ORM:

| Collection | Key Indexes | Description |
| :--- | :--- | :--- |
| **`resources`** | `resourceId`, `organizationId`, `state` | Telemetry records, ownership states, agent heartbeats, workload operations, detection evidence, human review states, and cleanup states. |
| **`pipelines`** | `pipelineId`, `organizationId` | CI/CD preview builder pipeline configurations and repository metadata. |
| **`pipelineruns`** | `runId`, `pipelineId`, `organizationId` | Pipeline execution runs (`ACTIVE`, `CRASHED`, `FAILED`), owner assignments, and adopted resource IDs. |
| **`auditevents`** | `organizationId`, `timestamp`, `action` | Immutable audit trail tracking detection evaluations, safety gatekeeper checks, human decisions, and reclamation events. |
| **`users`** | `email`, `organizationId` | Authorized accounts with Role-Based Access Control (`ADMIN`, `OPERATOR`, `VIEWER`). |
| **`policies`** | `organizationId` | Organizational safeguards (protected environments, resource type protections, threshold hours). |

---

## 2. Core Detection & Safety Matrix

The **Multi-Factor Detection Engine** evaluates 5 telemetry dimensions before classifying a resource:

| Incident Signal | Evaluation Criterion | Engine Decision | Safety Standard |
| :--- | :--- | :--- | :--- |
| **Active Pipeline Run** | Associated pipeline run status is `ACTIVE` / `RUNNING` | **PROTECTED** | Never delete resources attached to executing builds |
| **Verified Owner** | Active developer email assigned (`ownershipState: ACTIVE_OWNER`) | **PROTECTED** | Active owner prevents automated reclamation |
| **Active Heartbeat** | Fresh agent pulse received within threshold ($\le 15$ min) | **PROTECTED** | Active process heartbeat keeps resource safe |
| **Active Adoption** | Adopted by running process (`isAdopted: true`) | **PROTECTED** | Adopted child resources protected regardless of parent state |
| **High Workload** | Workload metrics count $> 50$ operations | **PROTECTED** | High active CPU/Network ops enforce protection |
| **Uncertain Signals** | Low non-zero metrics ($0 < \text{ops} \le 50$), unconfirmed owner, AI conflict | **HUMAN_REVIEW_REQUIRED** | Automatic deletion strictly blocked; raised for human operator |
| **Confirmed Orphan** | Crashed run, no owner, unresponsive heartbeat, 0 ops, unadopted | **VERIFIED_ORPHAN** | Eligible for 2-Phase Reclamation |

---

## 3. Human-in-the-Loop Safety Fallback System

> **"WHEN THE SYSTEM IS UNCERTAIN, IT DOES NOT DELETE — IT ASKS A HUMAN."**

If detection evidence is conflicting, AI advice conflicts with deterministic rules, ownership is unconfirmed, or workload metrics are ambiguous:

1. **Automatic Cleanup Blocked**: The detection engine transitions state to `HUMAN_REVIEW_REQUIRED` (or `NEEDS_REVIEW`) and halts automated reclamation.
2. **Operational Human Review UI**: Displays alert cards displaying:
   - Resource ID & Name
   - State Badge (`HUMAN_REVIEW_REQUIRED`)
   - Reason for Review & Uncertainty Details
   - Owner & Workload Status (`sarah.qa@democorp.com` / 18 ops recorded)
   - Heartbeat Status (`Heartbeat: Present, but not responding | Adopted: No`)
   - AI Recommendation vs Deterministic Safety Result
3. **Operator Actions**:
   - **Protect Resource**: Operator decision marks resource `PROTECTED` and blocks reclamation.
   - **Approve Reclaim**: Operator decision moves resource into 5-minute grace period with final liveness monitoring.
4. **Concurrency Lock**: Prevents race conditions between simultaneous operator decisions.

---

## 4. Two-Phase Reclamation & Grace Period Engine

- **Phase 1 (Grace Period)**: Initiates a 5-minute countdown during which liveness monitoring runs continuously.
- **Phase 2 (Final Reclamation)**: Re-verifies process activity before cloud API deletion. If activity resumes during the grace period, reclamation is automatically **caught and reversed**, restoring the resource to `PROTECTED`.

---

## 5. Key Architectural Safeguards

- **"OLD ≠ ORPHAN" Rule**: Resource age alone never triggers reclamation. Activity and ownership are always verified first.
- **Fail-Safe AI Degradation**: If `GEMINI_API_KEY` is absent or WAN connectivity drops, the system seamlessly degrades to deterministic safety rules with 100% zero downtime.
- **Deterministic AI Guardrail**: Advisory AI recommends decisions but **never executes direct cloud deletions**.

---

## 6. Environment Variables Configuration

### Backend Environment Configuration (`backend/.env`)

| Variable | Required | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | Express REST API server listening port | `5000` |
| `MONGO_URI` | Yes | MongoDB database connection URI | `mongodb://localhost:27017/orphan-cleanup-db` |
| `JWT_SECRET` | Yes | Secret key for signing JWT authentication tokens | `your-secret-key` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for natural-language advisory AI | `AIzaSy...` |

### Frontend Environment Configuration (`frontend/.env`)

| Variable | Required | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | Base URL connecting to Express API | `http://localhost:5000` |

---

## 7. Local Development Setup Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB community server running on port 27017

### Step 1: Install Dependencies

```bash
# Clone repository
git clone https://github.com/adithyaqwe/orphan-cleanup.git
cd orphan-cleanup

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### Step 2: Start Development Servers

In Terminal 1 (Backend Server):
```bash
cd backend
npm run dev
# Express API running on http://localhost:5000
```

In Terminal 2 (Frontend App):
```bash
cd frontend
npm run dev
# Vite Web App running on http://localhost:5173
```

---

## 8. Project Directory Structure

```text
orphan-cleanup/
├── README.md                  <-- Platform documentation handbook
├── ARCHITECTURE.md            <-- Architectural specifications & system design
├── backend/                   <-- Node.js / Express.js REST API Server
│   ├── package.json
│   ├── tests/
│   │   └── humanReview.test.js <-- 11 Human-in-the-Loop safety test scenarios
│   └── src/
│       ├── cleanup/           <-- Two-phase reclamation & concurrency locking engine
│       ├── controllers/       <-- Express route controllers
│       ├── detection/         <-- Multi-factor detection engine & AWS ingestion
│       ├── middleware/        <-- Auth, RBAC (ADMIN/OPERATOR/VIEWER), rate limiters
│       ├── models/            <-- Mongoose schemas (Resource, AuditEvent, User, etc.)
│       ├── routes/            <-- API endpoint definitions
│       ├── security/          <-- Deterministic safety engine & gatekeepers
│       ├── services/          <-- Seed service & auto-cleanup background worker
│       └── server.js          <-- Express server entry point
└── frontend/                  <-- Enterprise React 18 + Vite Web Application
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── components/        <-- Status badges, modals, tooltips, buttons, banners
        ├── context/           <-- Authentication context & role providers
        ├── pages/
        │   ├── CleanupCenterPage.jsx  <-- Human Review Section, Grace Period & Audit
        │   ├── DashboardPage.jsx      <-- Analytics hub & countdown scanner
        │   ├── InventoryPage.jsx      <-- 360-degree resource inventory
        │   └── ResourceDetailPage.jsx <-- Single resource telemetry & actions
        └── services/
            └── api.js         <-- Live Axios API client with JWT support
```

---

## 9. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/health` | System health & liveness check |
| **POST** | `/api/auth/login` | User login & HTTP-Only JWT token issuance |
| **GET** | `/api/resources` | List resources with filter params (`state`, `search`) |
| **GET** | `/api/resources/:id` | Fetch 360-degree resource telemetry |
| **POST** | `/api/detection/evaluate/:id` | Run multi-factor detection engine on resource |
| **POST** | `/api/ai/analyze/:id` | Query Advisory AI model for natural language analysis |
| **POST** | `/api/cleanup/human-review/:id/protect` | Protect human review resource (Operator/Admin) |
| **POST** | `/api/cleanup/human-review/:id/approve-reclaim` | Approve human review reclaim & start grace period |
| **POST** | `/api/cleanup/schedule/:id` | Start 5-minute Two-Phase grace period |
| **POST** | `/api/cleanup/finalize/:id` | Finalize reclamation after liveness re-verification |
| **POST** | `/api/cleanup/reverse/:id` | Simulate resumed activity & trigger Caught & Reversed |
| **GET** | `/api/audit` | Fetch immutable compliance operations audit trail |
| **POST** | `/api/demo/seed` | Seed Golden Scenario dataset into MongoDB |

---

## 10. Security, RBAC & Immutable Compliance Audit Trail

### Role-Based Access Control (RBAC) Matrix

| Action | ADMIN | OPERATOR | VIEWER |
| :--- | :---: | :---: | :---: |
| View Inventory & Analytics | ✅ | ✅ | ✅ |
| Run Detection & AI Analysis | ✅ | ✅ | ❌ |
| Protect Human Review Resource | ✅ | ✅ | ❌ (403) |
| Approve Human Review Reclaim | ✅ | ✅ | ❌ (403) |
| Start Grace Period / Finalize Cleanup | ✅ | ✅ | ❌ (403) |
| Direct Reclaim | ✅ | ❌ | ❌ (403) |

---

## 🧪 Test Suite Execution

Run all 9 Jest test suites (52 unit & integration tests):

```bash
cd backend
npm test
```

---

## 📄 License

MIT License.
