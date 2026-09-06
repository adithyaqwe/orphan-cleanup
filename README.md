# OrphanCleanup 🛡️

> **"WHEN THE SYSTEM IS UNCERTAIN, IT DOES NOT DELETE — IT ASKS A HUMAN."**

**OrphanCleanup** is an enterprise-grade Ephemeral Resource Safety & Leak Prevention Platform. It continuously monitors cloud infrastructure (EC2 instances, Kubernetes pods, preview environments, build workers) to detect abandoned or orphaned resources while strictly guaranteeing **Zero False Positives**.

---

## 🌟 Key Features

### 1. 🤖 Multi-Factor Detection Engine
Combines 5 independent signals before evaluating resource lifecycle status:
- **Workload Activity**: Monitors CPU operations, network bandwidth, and database connection metrics.
- **Ownership State**: Verifies active developer ownership vs. unconfirmed/abandoned resources.
- **Automation Pipeline Status**: Checks CI/CD pipeline run states (`ACTIVE` vs. `CRASHED`/`FAILED`).
- **Agent Heartbeat**: Monitors heartbeats from resource agents. Distinguishes between active heartbeats and registered heartbeat mechanisms that have become unresponsive.
- **Topology Adoption Safeguards**: Protects resources adopted by active pipeline runs even if the original parent pipeline crashed.

### 2. 🤝 Human-in-the-Loop Safety Fallback System
If detection signals are ambiguous ($0 < \text{operations} \le 50$), evidence conflicts, AI advisory recommendations conflict with deterministic rules, or ownership is unconfirmed:
- **Automatic reclamation is strictly blocked.**
- A **Human Review Alert** is raised for operator intervention.
- Operators can either **Protect Resource** (block cleanup) or **Approve Reclaim** (schedule grace period after re-verifying liveness).

### 3. ⏱️ Two-Phase Delete with Liveness Monitoring
- **Phase 1 (Grace Period)**: Initiates a 5-minute countdown during which liveness monitoring runs continuously.
- **Phase 2 (Final Reclamation)**: Re-verifies process activity before cloud API deletion. If activity resumes during the grace period, reclamation is automatically **caught and reversed**, restoring the resource to `PROTECTED`.

### 4. 📜 Immutable Operations Audit Trail
Records an immutable log of every detection evaluation, safety gatekeeper check, and operator action (`HUMAN_REVIEW_PROTECTED`, `HUMAN_REVIEW_RECLAIM_APPROVED`, `RECLAIM_REVERSED_LIVENESS_DETECTED`) for SOC2 and compliance audits.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 18, Vite, Lucide Icons, Glassmorphism UI Theme, Axios with HTTP-Only Cookie JWT Authentication.
- **Backend**: Node.js, Express.js, Mongoose ODM, MongoDB.
- **AI Integration**: Gemini Advisory Model integration for natural-language safety reasoning.
- **Testing**: Jest, Supertest (100% test coverage across 9 test suites / 52 unit & integration tests).

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://localhost:27017`

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend server will start on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend application will start on `http://localhost:5173`.

### 3. Seed Demo Data
To populate the database with the Golden Demo scenario (including the Human Review Alert item):
```bash
# Seed via API
curl -X POST http://localhost:5000/api/demo/seed
```
Or click **Reset Demo Dataset** directly in the UI.

---

## 🧪 Running Tests

To run the complete backend test suite (including `humanReview.test.js` covering all 11 Human-in-the-Loop scenarios):

```bash
cd backend
npm test
```

---

## 🔒 User Roles & RBAC Matrix

| Action | Admin | Operator | Viewer |
| :--- | :---: | :---: | :---: |
| View Dashboard & Inventory | ✅ | ✅ | ✅ |
| Run Detection & AI Analysis | ✅ | ✅ | ❌ |
| Protect Human Review Item | ✅ | ✅ | ❌ (403) |
| Approve Human Review Reclaim | ✅ | ✅ | ❌ (403) |
| Schedule 2-Phase Delete | ✅ | ✅ | ❌ (403) |
| Direct Cloud Reclaim | ✅ | ❌ | ❌ (403) |

---

## 📄 License

MIT License.
