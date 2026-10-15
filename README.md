# Satyam Purchase · Agri-Procurement Management Portal

An enterprise-grade agricultural commodity procurement and pricing management platform built for **Satyam Agrocot**. The application handles field procurement from farmers across local mandi centres, reverse ceiling rate calculations, weighbridge unloading and moisture penalty adjustments, outbound plant dispatches, and accounting reconciliation with strict **Role-Based Access Control (RBAC)**.

Powered by **Neon Lakebase Postgres** and **Neon Auth**, deployed seamlessly to **Vercel**.

---

## 🚀 Key Features

### 1. Multi-Role RBAC (Role-Based Access Control)
The platform delivers tailored, dedicated workspaces and navigation for 4 distinct operational roles:
- **Admin / Purchase Head**: Approvals queue for over-ceiling lots and final unloaded settlements, plant delivered price publisher with version history, multi-centre daily quota matrices, system user management with role & permission assignment, live inventory and freight dashboards, and activity audit trails.
- **Field Officer**: Real-time ceiling rate calculator with Hindi labels ("भाव कैसे बना"), reverse cost breakdown, moisture excess deduction preview, optional commission adjustment (if authorized), deal creation with quota limit checks, material photo capture, and 1-click WhatsApp deal share cards.
- **Warehouse In-charge**: Incoming confirmed sodas queue, live weighbridge gross & tare weight recording, final moisture testing with automated penalty deduction, weighbridge slip photo/PDF attachment, and outbound plant dispatch tracking with real-time stock-in-hand monitoring.
- **Accounts & Finance**: Cross-centre financial dashboard, pending liability tracking, comprehensive procurement audit ledger with multi-parameter filtering, and **1-Click Export as CSV** for Excel accounting integration.

### 2. Reverse Ceiling Pricing & Settlement Formula
- **Reverse Ceiling**:
  $$P = \frac{T \times (1 - \text{Shortage}) - \text{Fixed Expenses}}{1 + \text{Percentage Expenses}}$$
  Where $T = \text{Plant Price} - \text{Target Margin}$.
- **Moisture Penalty**:
  Excess moisture above the base commodity standard (14% for Maize, 12% for Chickpea) triggers automatic deductions. Lots exceeding maximum allowable moisture (18% for Maize, 14% for Chickpea) are strictly blocked from procurement.
- **Weighbridge Final Settlement**:
  $$\text{Final Rate} = \text{Agreed Rate} - \text{Excess Moisture Penalty}$$
  $$\text{Total Lot Payout} = \text{Final Rate} \times (\text{Gross Weight} - \text{Tare Weight})$$

### 3. Neon Cloud Backend
- **Neon Lakebase Postgres**: High-performance, serverless Postgres connected via `@neondatabase/serverless`.
- **Neon Auth**: Managed Better Auth identity provider configured on AWS with EdDSA JWKS endpoints.
- **Vercel Serverless Functions**: Unified `/api` handler supporting zero-config serverless execution on Vercel and local dev middleware.

---

## 🛠️ Quickstart

### Prerequisites
- Node.js `>=20.19.0`
- Neon CLI (`neon@latest`)

### Setup & Run Locally
```bash
# 1. Clone repository
git clone https://github.com/mahatva/satyam-purchase.git
cd satyam-purchase

# 2. Install dependencies
npm install

# 3. Initialize Neon & Environment variables
cp .env.example .env.local
# (or run `neon deploy` to pull live variables automatically)

# 4. Initialize Database Schema & Seed Data
node scripts/db-init.js

# 5. Run Service Verification
node scripts/test-services.js

# 6. Start Vite Dev Server
npm run dev
```

### Production Build & Vercel Deployment
```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 🧪 Demo User Profiles for Fast RBAC Testing

| Role | Name | Mobile | Scope | Special Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Avi Mangal | `9000000001` | All Centres (`ALL`) | Full administrative authorization & master data control |
| **Field Officer** | Rahul | `9000000002` | Diwal (`DWL`) | Authorized to reduce commission for competitive bidding |
| **Warehouse** | Suresh | `9000000003` | Diwal (`DWL`) | Weighbridge intake, slip uploads, plant dispatches |
| **Accounts** | Accounts Sample | `9000000004` | All Centres (`ALL`) | Financial auditing, valuation, and Excel export |
| **Field Officer** | SC2 Officer | `9000000005` | Sample Centre 2 (`SC2`) | Standard commission procurement only |

---

## 📁 Repository Structure
```
├── .agents/skills/satyam-purchase/ # Custom Antigravity agent domain skill & runbook
├── api/index.js                    # Serverless API routes (Vercel & Vite dev)
├── scripts/
│   ├── db-init.js                  # Neon Postgres schema migration & seeder
│   └── test-services.js            # End-to-end verification script
├── server/db.js                    # Database connection & query helper service
├── src/
│   ├── components/
│   │   ├── auth/LoginPage.jsx      # Mobile + OTP and 1-click RBAC profile selector
│   │   ├── layout/Header.jsx       # Top navigation, role pills & fast role switcher
│   │   ├── modals/                 # Lot inspection, User manager, Image viewer
│   │   └── roles/                  # Distinct RBAC portals (Admin, Officer, Warehouse, Accounts)
│   ├── context/AppContext.jsx      # Application state synced with Neon Postgres
│   ├── utils/calculations.js       # Pricing formulas, moisture penalties, quotas
│   ├── index.css                   # Modern CSS design system
│   └── App.jsx                     # Root router & layout
├── neon.ts                         # Neon branch & service definition
├── vercel.json                     # Vercel SPA and serverless function rewrite rules
└── vite.config.js                  # Vite configuration with API dev middleware
```

---

## 🛡️ License
Proprietary · Satyam Agrocot
