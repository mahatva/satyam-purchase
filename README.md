# Satyam Purchase · Agri-Procurement Management Portal

An enterprise-grade agricultural commodity procurement and pricing management platform built for **Satyam Agrocot**. The application handles field procurement from farmers across local mandi centres, reverse ceiling rate calculations, weighbridge unloading and moisture penalty adjustments, outbound plant dispatches, and accounting reconciliation with strict **Role-Based Access Control (RBAC)**.

Powered by **Neon Lakebase Postgres** and **Neon Auth**, deployed seamlessly to **Vercel**.

---

## 🚀 Key Features

### 1. Multi-Role RBAC (Role-Based Access Control)
The platform delivers tailored, dedicated workspaces and navigation for 4 distinct operational roles:
- **Admin / Purchase Head**: Master control for plant delivered prices (with immediate versioning), Expense & Freight Masters (configurable Mandi fee, commission, hammali, transit, labour, bags, and Grade A/B/C freights per centre or globally), field deal approvals queue, exclusive rights to edit or delete any deal/entry, user management, and ledger audit trails.
- **Field Officer**: Real-time ceiling rate calculator with Hindi labels ("भाव कैसे बना"), dynamic reverse cost breakdown from live expense masters, moisture excess deduction preview, deal creation with quota limit checks, material photo capture, and 1-click WhatsApp deal share cards.
- **Warehouse In-charge**: Incoming confirmed sodas queue, simplified weighbridge intake (**direct Net Weight**, gross/tare not required), quality moisture logging (notes only, non-deducting), optional final rate override (defaults to agreed rate), and direct deal completion (**saved and closed directly** without requiring subsequent admin approval).
- **Accounts & Finance**: Cross-centre financial dashboard, real-time closed liability tracking, comprehensive procurement audit ledger with multi-parameter filtering, and **1-Click Export as CSV** for Excel accounting integration.

### 2. Reverse Ceiling Pricing & Settlement Formula
- **Reverse Ceiling**:
  $$P = \frac{T \times (1 - \text{Shortage}) - \text{Fixed Expenses}}{1 + \text{Percentage Expenses}}$$
  Where $T = \text{Plant Price} - \text{Target Margin}$, with dynamic expenses and grade-specific freight ($F_A, F_B, F_C$) loaded per centre.
- **Quality Moisture Logging**:
  Moisture recorded at unloading is logged for grain inventory and warehouse records without auto-deducting price.
- **Weighbridge Final Settlement**:
  $$\text{Final Rate} = \text{Agreed Rate (or Manual Override)}$$
  $$\text{Total Lot Payout} = \text{Final Rate} \times \text{Net Weight (qtl)}$$

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

## 🧪 System Credentials & RBAC Access

Authentication uses **User ID (Username) and Password**. Role switching is protected: Admins can switch directly without credentials, while other roles require target role authorization.

| Role | Name | User ID | Default Password | Centre Scope | Special Privileges |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | Avi Mangal | `admin` | `admin123` | All Centres (`ALL`) | Full administrative authorization & master data control |
| **Field Officer** | Rahul | `officer_dwl` | `officer123` | Diwal (`DWL`) | Authorized to reduce commission for competitive bidding |
| **Warehouse** | Suresh | `warehouse_dwl` | `warehouse123` | Diwal (`DWL`) | Weighbridge intake, slip uploads, plant dispatches |
| **Accounts** | Accounts Sample | `accounts` | `accounts123` | All Centres (`ALL`) | Financial auditing, valuation, and Excel export |
| **Field Officer** | SC2 Officer | `officer_sc2` | `officer123` | Sample Centre 2 (`SC2`) | Standard commission procurement only |

---

## 📁 Repository Structure
```
├── .agents/skills/satyam-purchase/ # Custom Antigravity agent domain skill & runbook
├── ARCHITECTURE.md                 # System Architecture & Technical Specifications
├── AGENTS.md                       # Workspace agent execution guidelines & rules
├── api/index.js                    # Serverless API routes (Vercel & Vite dev)
├── scripts/
│   ├── db-init.js                  # Neon Postgres schema migration & seeder
│   ├── add-passwords.js            # User ID & password migration script
│   └── test-services.js            # End-to-end verification script
├── server/db.js                    # Database connection & query helper service
├── src/
│   ├── components/
│   │   ├── auth/LoginPage.jsx      # User ID & Password sign-in & 1-click role switcher
│   │   ├── layout/Header.jsx       # Top navigation, role pills & secure role switcher
│   │   ├── modals/                 # Role switch modal, Lot inspection, User manager
│   │   └── roles/                  # Distinct RBAC portals (Admin, Officer, Warehouse, Accounts)
│   ├── context/AppContext.jsx      # Application state synced with Neon Postgres
│   ├── utils/calculations.js       # Pricing formulas, moisture penalties, quotas
│   ├── index.css                   # Modern CSS design system
│   └── App.jsx                     # Root router & layout
├── neon.ts                         # Neon branch & service definition
├── vercel.json                     # Vercel SPA and serverless function rewrite rules
└── vite.config.js                  # Vite configuration with API dev middleware
```

> For deep architectural details, ER diagrams, and sequence flows, refer to [ARCHITECTURE.md](file:///Users/mahatvagarg/Documents/GitHub/satyam%20purchase/ARCHITECTURE.md).

---

## 🛡️ License
Proprietary · Satyam Agrocot
