<div align="center">

<img src="public/favicon.svg" alt="MediTrustChain Logo" width="80" height="80"/>

# 🔗 MediTrustChain

### *Trust Every Pill. Track Every Step.*

**A blockchain-powered pharmaceutical supply chain platform ensuring drug authenticity from manufacturer to patient.**

[![Next.js](https://img.shields.io/badge/Next.js%2015-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)](https://ethereum.org)
[![Google AI](https://img.shields.io/badge/Google%20Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![Sentry](https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white)](https://sentry.io)

</div>

---

## 🌐 What is MediTrustChain?

Counterfeit drugs kill hundreds of thousands of people every year. **MediTrustChain** fixes the broken trust in the pharmaceutical supply chain using:

- 🔗 **Blockchain** — Immutable, tamper-proof records of every critical drug lifecycle event
- 🤖 **Generative AI** — Real-time anomaly detection, drug info lookup, and an intelligent chatbot
- 🗺️ **GPS Tracking** — Live shipment maps powered by MapTiler
- 📱 **QR Verification** — Any patient can scan a code and instantly verify drug authenticity
- 🏢 **Multi-Tenant RBAC** — Isolated organization data with strict role-based access control

---

## 🏗️ Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────────┐
│                       SUPPLY CHAIN FLOW                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  MANUFACTURER ──► REGULATOR ──► DISTRIBUTOR ──► LOGISTICS ──► PHARMACY │
│       │               │              │               │             │  │
│  Creates Batch   Approves /     Updates          Updates        Records│
│   (On-Chain)     Rejects        Location         Location        Sale  │
│                 (On-Chain)    (On-Chain)        (Off-Chain)   (Off-Chain)│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                                PATIENT
                              Scans QR Code
                           (Blockchain Verify)
```

### Blockchain Status Lifecycle

```
CREATED → PENDING_APPROVAL → APPROVED → IN_TRANSIT → DELIVERED
                          └──► REJECTED         └──► EXPIRED
               Any state ──────────────────────► RECALLED (Regulator)
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏭 **Manufacturer Dashboard** | Create batches, submit for approval, print QR labels |
| ⚖️ **Regulator Dashboard** | Approve/reject/recall batches, drug master approval |
| 🚚 **Distributor & Logistics** | Update location and in-transit status |
| 💊 **Pharmacy Dashboard** | Record final sale, confirm delivery |
| 🔍 **Patient Verification** | Scan QR → verify blockchain hash in seconds |
| 🤖 **AI Chatbot** | Ask anything about drugs, batches, or the platform |
| 📊 **Analytics Hub** | Real-time charts, demand forecasting, performance metrics |
| 🚨 **Recall Management** | Instant multi-stakeholder recall broadcast |
| 🔔 **Smart Notifications** | Configurable email alerts on status changes |
| 🛡️ **Anomaly Detection** | AI flags suspicious batches before they cause harm |
| 🗺️ **Live Shipment Map** | GPS coordinates plotted on an interactive MapTiler map |
| 🧾 **Audit Trail** | Blockchain-anchored immutable audit logs |
| 🌙 **Dark / Light Mode** | System-aware theme with one-click toggle |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend / DB** | Supabase (PostgreSQL + Row-Level Security + Realtime) |
| **Blockchain** | Solidity smart contract, Hardhat, ethers.js, MetaMask |
| **AI / GenAI** | Google Gemini via Firebase Genkit |
| **Mapping** | MapTiler SDK |
| **Monitoring** | Sentry (client + server + edge) |
| **Email** | Resend |
| **Storage** | IPFS (for document anchoring) |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js 20+](https://nodejs.org)
- [npm 10+](https://npmjs.com)
- [Git](https://git-scm.com)
- [MetaMask browser extension](https://metamask.io) (for blockchain features)
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

---

### 1. Clone the Repository

```bash
git clone https://github.com/eng22cs0121/MediTrustChain.git
cd MediTrustChain
```

---

### 2. Install Dependencies

```bash
# Install main app dependencies
npm install

# Install blockchain (Hardhat) dependencies
cd blockchain
npm install
cd ..
```

---

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Supabase ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# ── Google Gemini AI (via Genkit) ─────────────────────────
GOOGLE_GENAI_API_KEY=<your-gemini-api-key>

# ── Blockchain ────────────────────────────────────────────
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract-address>
NEXT_PUBLIC_BLOCKCHAIN_NETWORK=sepolia   # or localhost

# ── MapTiler (Live GPS Maps) ──────────────────────────────
NEXT_PUBLIC_MAPTILER_API_KEY=<your-maptiler-key>

# ── Email Notifications ───────────────────────────────────
RESEND_API_KEY=<your-resend-key>

# ── Sentry (Error Monitoring) ─────────────────────────────
SENTRY_ORG=<your-sentry-org>
SENTRY_PROJECT=<your-sentry-project>
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>

# ── Script credentials (never hardcode — use env vars) ────
SUPABASE_ACCESS_TOKEN=<your-supabase-pat>   # only needed for admin scripts
```

> **Security note:** Never commit `.env.local` to Git. It is already in `.gitignore`.

---

### 4. Set Up the Database

#### Option A — Supabase Cloud (recommended)

```bash
# Link your local project to your Supabase cloud project
npm run supabase:link

# Push all migrations
npm run supabase:push
```

#### Option B — Local Supabase

```bash
# Start local Supabase stack (requires Docker)
npm run supabase:start

# Apply migrations locally
npm run supabase:reset
```

---

### 5. Deploy the Smart Contract

```bash
cd blockchain

# Compile the contract
npx hardhat compile

# Deploy to Sepolia testnet (requires PRIVATE_KEY + ALCHEMY_URL in blockchain/.env)
npx hardhat run scripts/deploy.ts --network sepolia

# Copy the printed contract address into your .env.local as NEXT_PUBLIC_CONTRACT_ADDRESS
cd ..
```

---

### 6. Run the App

```bash
# Start the Next.js development server (port 9002)
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

---

### 7. (Optional) Start the AI Dev Server

```bash
# In a separate terminal — required for Genkit AI flows in development
npm run genkit:dev
```

---

## 🗂️ Project Structure

```
MediTrustChain/
├── blockchain/                  # Hardhat project
│   ├── contracts/               # Solidity smart contract
│   │   └── MediTrustChainV2.sol
│   └── scripts/                 # Deploy & verify scripts
│
├── src/
│   ├── ai/                      # Genkit AI flows (chatbot, anomaly, drug info…)
│   ├── app/                     # Next.js App Router pages & API routes
│   │   ├── dashboard/           # Role-based dashboards
│   │   └── api/                 # Server-side API endpoints
│   ├── components/              # Reusable UI components
│   │   ├── dashboard/           # Feature-specific components
│   │   └── ui/                  # shadcn/ui primitives
│   ├── contexts/                # React context providers
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Core libraries
│   │   ├── blockchain/          # Contract interaction & wallet utilities
│   │   ├── supabase/            # DB clients and query helpers
│   │   ├── cbac/                # Credential-Based Access Control
│   │   └── email/               # Notification service
│   └── types/                   # Shared TypeScript types
│
├── supabase/
│   ├── migrations/              # Ordered SQL migrations (22 migrations)
│   └── functions/               # Edge functions (stale-batch-monitor)
│
└── scripts/                     # Utility & migration scripts
```

---

## 🔐 Roles & Permissions

| Role | Key Permissions |
|---|---|
| **Manufacturer** | Create batches, submit for approval, print QR |
| **Regulator** | Approve / reject / recall batches, approve drug master |
| **Distributor** | Accept approved batches, update location |
| **Logistics** | Update in-transit location & GPS |
| **Pharmacy** | Record final dispensing |
| **Patient** | Scan QR to verify authenticity (public, no login) |
| **Admin** | Manage organizations, stakeholders, view all audit logs |
| **System Admin** | Full platform access |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: your feature description"`
4. Push to your fork: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the terms of the [LICENSE](LICENSE) file.

---

<div align="center">

**Built with ❤️ to make medicine safer for everyone.**

*MediTrustChain — Because every patient deserves to trust their medication.*

</div>
