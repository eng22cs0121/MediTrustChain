# MediTrustChain - Architecture & Implementation Guide

## Overview

MediTrustChain is a blockchain-based pharmaceutical supply chain tracking system that ensures drug authenticity from manufacturer to patient.

---

## Supply Chain Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WITHIN SAME ORGANIZATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MANUFACTURER ──► REGULATOR ──► DISTRIBUTOR ──► LOGISTICS ──► PHARMACY     │
│       │              │              │              │             │          │
│    Creates       Approves/      Updates        Updates       Records       │
│     Batch        Rejects        Location       Location       Sale         │
│       │              │              │              │             │          │
│  (Blockchain)   (Blockchain)   (Blockchain)   (Off-chain)   (Off-chain)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                                  PATIENT
                                 Scans QR
                              (Blockchain)
```

---

## Blockchain Status Transitions (Smart Contract)

```
CREATED(0) ──► PENDING_APPROVAL(1) ──► APPROVED(2) ──► IN_TRANSIT(4) ──► DELIVERED(5)
                                  └──► REJECTED(3)

Any state can transition to RECALLED(7) by Regulator
DELIVERED(5) can transition to EXPIRED(6) automatically
```

---

## On-Chain vs Off-Chain Operations

### ON-CHAIN (Blockchain Required) - Immutable Record

| Operation | Smart Contract Function | Who Triggers | Gas Required |
|-----------|------------------------|--------------|--------------|
| Create Batch | `createBatch()` | Manufacturer | ✅ Yes |
| Submit for Approval | `submitForApproval()` | Manufacturer | ✅ Yes |
| Approve Batch | `approveBatch()` | Regulator | ✅ Yes |
| Reject Batch | `rejectBatch()` | Regulator | ✅ Yes |
| Recall Batch | `recallBatch()` | Regulator | ✅ Yes |
| **First** transition to IN_TRANSIT | `updateBatchStatus(4)` | Distributor | ✅ Yes |
| Transition to DELIVERED | `updateBatchStatus(5)` | Logistics/Pharmacy | ✅ Yes |
| Verify Authenticity | `verifyBatchWithHash()` | Patient | ❌ No (Read-only) |

### OFF-CHAIN (Database Only) - Mutable Data

| Operation | Storage | Purpose |
|-----------|---------|---------|
| Location updates (while IN_TRANSIT) | Supabase | Track shipment progress |
| Batch history logging | Supabase | Audit trail |
| Anomaly detection | Supabase | AI-based fraud detection |
| User notifications | Supabase | Alerts |

### Why This Separation?

1. **Blockchain is immutable** - Critical status changes that affect authenticity MUST be on-chain
2. **Blockchain is expensive** - Location updates during transit are frequent, no need to pay gas for each
3. **The hash is computed ONCE at creation** - Contains core batch data
4. **Intermediate changes don't affect authenticity** - Location updates are informational

---

## Hash Verification Explained

### What's INCLUDED in the Hash (Computed at Creation)

```javascript
const hashInput = {
  batchCode: "B-1",           // Batch ID (immutable)
  drugName: "Dolo",           // Drug name (immutable)
  quantity: 100,              // Quantity (immutable)
  mfgDate: 1737504000,        // Manufacturing date Unix timestamp
  expDate: 1740268800         // Expiry date Unix timestamp
};
// Hash = keccak256(JSON.stringify(hashInput))
```

### What's NOT in the Hash

- ❌ Location (changes during transit)
- ❌ Current holder (changes during handoffs)
- ❌ Status (changes through supply chain)
- ❌ Timestamps of updates

### Verification Flow (Patient Scanning QR)

```
1. Patient scans QR Code containing batchCode
2. App fetches batch from blockchain using batchCode
3. App recomputes hash using ON-CHAIN DATA (not QR data!)
4. Smart contract's verifyBatchWithHash() checks:
   a. Does computed hash match stored hash? → If not, TAMPERED
   b. Is status APPROVED or later? → If not, NOT_APPROVED
   c. Is expiry date in future? → If not, EXPIRED
   d. Is batch recalled? → If yes, RECALLED
5. If all checks pass → GENUINE
```

---

## Organization-Based Data Isolation

### Organization Structure

```
ORGANIZATION (e.g., "ANEKAL Pharma")
├── Manufacturer Stakeholder (manu@anekal.com)
├── Regulator Stakeholder (reg@anekal.com)
├── Distributor Stakeholder (dist@anekal.com)
├── Logistics Stakeholder (log@anekal.com)
└── Pharmacy Stakeholder (pharm@anekal.com)

All 5 stakeholders share the SAME organization_id
All can see batches belonging to their organization
```

### Visibility Rules

| Role | Can See |
|------|---------|
| Admin | ALL batches from ALL organizations |
| Regulator | ALL batches (regulatory oversight) |
| Manufacturer | Only their organization's batches |
| Distributor | Only their organization's batches |
| Logistics | Only their organization's batches |
| Pharmacy | Only their organization's batches |

---

## Blockchain Integration by Dashboard

| Dashboard | Blockchain Operations | Off-chain Operations |
|-----------|----------------------|---------------------|
| **Manufacturer** | createBatch(), submitForApproval() | Save to DB |
| **Regulator** | approveBatch(), rejectBatch(), recallBatch() | Update DB status |
| **Distributor** | updateBatchStatus(IN_TRANSIT) - once | Location updates to DB |
| **Logistics** | updateBatchStatus(DELIVERED) - once | Location updates to DB |
| **Pharmacy** | updateBatchStatus(DELIVERED) - if needed | Record sale to DB |
| **Patient** | verifyBatchWithHash() - read only | None |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `organizations` | Company entities (manufacturer, pharmacy, etc.) |
| `stakeholders` | Users within organizations with wallet addresses |
| `admin_users` | System administrators |
| `batches` | Medicine batch records with organization_id |
| `batch_history` | Status/location changes history |
| `anomalies` | AI-detected suspicious patterns |
| `notifications` | User alerts |
| `audit_logs` | Security audit trail |

---

## What Can Be Improved

### 1. Multi-Organization Supply Chain
- **Current:** All stakeholders must be in same organization
- **Improved:** Manufacturer Org A → Distributor Org B → Pharmacy Org C
- **Requires:** On-chain "transfer" mechanism to hand off batches

### 2. Location Tracking on Blockchain
- **Current:** Location stored only in database
- **Improved:** Store key waypoints on-chain for immutable trail

### 3. IoT Integration
- Temperature sensors reporting to blockchain
- GPS tracking with cryptographic proofs

### 4. QR Code Security
- **Current:** QR contains plain JSON data
- **Improved:** Sign QR with manufacturer's private key

### 5. Batch Splitting/Merging
- Support splitting a batch (e.g., 1000 units → 10 × 100)
- Track parent-child relationships on-chain
