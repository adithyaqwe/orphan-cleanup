# 🎬 Hackathon Presentation & Judging Script

**Project**: OrphanCleanup  
**Tagline**: Ephemeral Resource Lifecycle Leak Detection & Safe Reclamation Platform  
**The Core Message**: *"Cloud cleanup has a hidden problem: OLD DOES NOT MEAN ORPHAN."*

---

## 🕒 Demo Timeline (3-Minute Presentation)

### Step 1: The Opening Problem Statement (0:00 - 0:45)
**Presenter**:
> *"Automated CI/CD pipelines create temporary servers, databases, and test containers. When a pipeline crashes, cleanup scripts never execute, leaving orphaned cloud resources running indefinitely — burning thousands of dollars in cloud costs.*
>
> *Naïve cleanup tools look at an old resource and instantly delete it. But age is only evidence — age is NOT proof. Deleting an old resource that is still legitimately active or adopted by another run causes catastrophic production outages.*
>
> *That is why our core principle is: **OLD ≠ ORPHAN**."*

---

### Step 2: The Golden Scenario Demo (0:45 - 1:45)
**Action**:
1. Click **"⚡ Seed Golden Demo"** in the top navbar.
2. Open the **Detection Center**.

**Presenter**:
> *"Notice these two resources in our Detection Center. Both resources are **equally old — 18 hours old**.*
>
> *- **Resource A (`res-orphan-server-a`)**: Its pipeline crashed 18 hours ago. It has no owner, no recent heartbeats, and no adoption. Our Deterministic Detection Engine correctly classifies it as a **VERIFIED ORPHAN**.*
>
> *- **Resource B (`res-active-server-b`)**: It is **the exact same age (18 hours old)**. But its pipeline is active, its owner is verified, and heartbeats are received every 2 minutes. Our engine correctly classifies it as **PROTECTED**.*
>
> *A naïve script would have deleted both. OrphanCleanup protects Resource B while preparing Resource A for safe reclamation."*

---

### Step 3: Adopted Child & Dependency Graph (1:45 - 2:15)
**Action**:
1. Navigate to **Dependency Graph**.

**Presenter**:
> *"Here in our interactive React Flow Dependency Graph, we demonstrate **Adopted Child Protection**.*
>
> *When parent pipeline `run-crashed-parent-303` crashed, child resource `res-adopted-child-c1` was adopted by active run `run-adopting-active-404`.*
>
> *Even though its parent pipeline crashed, OrphanCleanup detects active adoption and marks the child **PROTECTED** with a green adoption edge."*

---

### Step 4: AI Advisory & Safety Engine Override (2:15 - 2:45)
**Action**:
1. Open **Resource Detail** for Resource B.
2. Click **"Run Safety Analysis"**.

**Presenter**:
> *"OrphanCleanup includes a backend-controlled AI Advisory Service defended against prompt injection attacks. But AI is advisory only. Before any deletion attempt, our **Deterministic Safety Engine** verifies real-time DB state, owner activity, and adoption state.*
>
> *If AI ever recommends deletion on an active or adopted resource, our Deterministic Safety Engine **overrides AI and blocks deletion**."*

---

### Step 5: Safe Reclamation & Immutable Audit (2:45 - 3:00)
**Action**:
1. Open **Cleanup Center**.
2. Click **"🛡️ Reclaim"** on Resource A.
3. Open **Audit Log**.

**Presenter**:
> *"With an authorized Operator or Admin role, we execute safe reclamation on Resource A. State transitions to **RECLAIMED**, and an immutable event is logged to the Audit Trail with actor identity, timestamp, and cloud adapter telemetry.*
>
> *OrphanCleanup eliminates cloud waste safely — without breaking production."*
