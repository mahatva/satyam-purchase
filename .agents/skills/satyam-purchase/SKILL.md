---
name: satyam-purchase
description: >-
  Domain knowledge, architectural patterns, mathematical pricing formulas,
  and role-based access control (RBAC) procedures for the Satyam Agrocot Purchase web application.
---

# Satyam Purchase — Domain Knowledge & System Architecture

## 1. Domain & Business Overview
**Satyam Purchase** is a mission-critical agricultural commodity procurement platform operated by Satyam Agrocot. It manages end-to-end grain procurement workflows—from field negotiations with farmers across mandi procurement centres, through weighbridge unloading and moisture analysis at local warehouses, to freight dispatch and plant delivery.

### Key Commodities & Standards
- **Maize (मक्का)**: Base moisture standard 14.0%, deduction type `wt` (1% weight reduction per 1% excess moisture), maximum moisture limit 18.0% (purchases above 18% are strictly blocked).
- **Chickpea (चना)**: Base moisture standard 12.0%, deduction type `rs` (₹30/qtl price deduction per 1% excess moisture), maximum moisture limit 14.0% (purchases above 14% are strictly blocked).
- **Grades**: Grade A, Grade B, Grade C (differ by quality, plant price, and freight slabs).

### Procurement Centres
- Primary centres include Diwal (`DWL`), Sample Centre 2 (`SC2`), Sample Centre 3 (`SC3`), Sample Centre 4 (`SC4`), Sample Centre 5 (`SC5`).
- Each centre has configurable shortage factors (e.g. 0.5% = 0.005), local expense schedules, and optional profit margin overrides.

---

## 2. Core Pricing & Settlement Formulas

### A. Reverse Ceiling Price Formula
Ceiling price is calculated from plant delivered price backward to determine the maximum viable price a field officer can offer a farmer at the local centre:

```
T = PlantPrice(Commodity, Grade) - ProfitMargin(Centre)
PctExpenses = Sum(Percentage Expenses) / 100   [e.g. Mandi Fee 1.7% + Commission 3.0%]
FixExpenses = Sum(Fixed ₹/qtl Expenses)        [e.g. Hammali + Transit + Loading + Bags + Freight]
Shortage = Centre Shortage Factor             [e.g. 0.005 for 0.5%]

BaseCeiling P = (T * (1 - Shortage) - FixExpenses) / (1 + PctExpenses)
```

### B. Moisture Penalty Deduction
- For moisture `m` up to base: Deduction = 0.
- For excess moisture `excess = m - base` up to maximum:
  - If `dedType == 'wt'`: `mDed = P * (dedRate * excess / 100)`
  - If `dedType == 'rs'`: `mDed = dedRate * excess`
- Final Ceiling Rate = `P - mDed`.
- If `m > max`: Purchase is strictly **Blocked**.

### C. Field Officer Commission Flexibility
- Authorised field officers (`canCutComm: true`) can reduce commission below the default (e.g., from 3.0% down to 2.0% or 1.0%).
- Reducing commission lowers `PctExpenses`, which directly increases the base ceiling price, allowing officers to offer more competitive rates to farmers when needed.

### D. Unloading & Final Rate Adjustment
When the grain arrives at the warehouse:
- `NetWeight = GrossWeight - TareWeight`
- Final moisture `fm` is measured.
- Extra moisture vs soda moisture: `extra = max(0, fm - max(base, sodaMoisture))`
- Rate adjustment:
  - Weight deduction: `finalRate = agreedRate * (1 - dedRate * extra / 100)`
  - Price deduction: `finalRate = agreedRate - dedRate * extra`
- Total lot payable amount: `Amount = finalRate * NetWeight`

---

## 3. Role-Based Access Control (RBAC) Specification

The system implements 4 distinct roles, each rendering dedicated layouts, navigation, and operation views:

| Role | Role Name | Centre Access | Permitted Views & Operations |
| :--- | :--- | :--- | :--- |
| **Admin** | Purchase Head | All Centres (`ALL`) | - **Approvals**: Review & approve/cancel over-ceiling & over-quota sodas; approve final rates for unloaded lots.<br>- **Price Masters**: Edit & publish live plant prices, update centre expense structures, profit margins, moisture rules.<br>- **Daily Quotas**: Set daily purchase quantity limits (qtl) per centre, commodity, and date.<br>- **User Management**: Add/edit users, assign roles, toggle commission reduction permissions, deactivate users.<br>- **Procurement Ledger**: Full multi-centre search, filtering, and inspection.<br>- **Live Analytics**: Cross-centre KPIs, inventory, freight variance.<br>- **Activity Log**: Full audit trail. |
| **Officer** | Field Officer | Assigned Centre (e.g. `DWL`, `SC2`) | - **Ceiling Calculator**: Real-time rate check with Hindi labels, moisture deduction preview, commission tuning.<br>- **New Soda**: Create purchase agreements with farmer details, qty, price, limit checks, photo capture, and WhatsApp confirmation dispatch.<br>- **My Sodas**: Filter and inspect sodas booked for their centre. |
| **Warehouse** | Warehouse In-charge | Assigned Centre (e.g. `DWL`) | - **Unload & Weigh**: Search pending confirmed sodas, enter gross/tare weighbridge readings, measure final moisture, upload weighbridge slips and unloading photos, submit for final approval.<br>- **Dispatch**: Record outbound dispatches to processing plant, track vehicle number, grade, estimated vs actual freight, maintain real-time physical stock-in-hand.<br>- **Centre Sodas**: Monitor lot status at the warehouse. |
| **Accounts** | Accounts & Finance | All Centres (`ALL`) | - **Financial Dashboard**: Procurement spend, pending liability, freight variances, volume summaries.<br>- **Procurement Ledger**: Multi-parameter search, date filters, lot inspection, weighbridge slip review.<br>- **Export**: One-click Copy as CSV / Excel export for accounting reconciliation. |

### Authentication & Role Switching Security
- **Authentication**: Strict **User ID (Username) and Password** authentication; mobile number-based SMS/OTP logins are completely disabled.
- **Role Switching**:
  - The **Admin** (`role === 'Admin'`) retains master access and can switch to any role workspace immediately without re-entering credentials.
  - All non-admin roles (Field Officer, Warehouse In-charge, Accounts) are blocked from switching roles unless they confirm either the target role's password or the master admin credentials via a secure modal.

---

## 4. Architectural Patterns & Engineering Guidelines

1. **Vite + React SPA**:
   - Clean, lightweight component architecture.
   - Built with pure Vanilla CSS for rich styling, responsiveness, dark mode, and micro-animations without external framework bloat.
2. **State Management & Persistence**:
   - Master data, users, sodas, dispatches, daily limits, and audit logs are initialized with realistic default data and persisted in `localStorage`.
   - State updates trigger atomic audit log entries recording `who`, `what`, and `timestamp`.
3. **Vercel Deployment**:
   - Project root configured with `vercel.json` rewrite rule to support client-side routing:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```
4. **Photo Handling**:
   - Supports camera input (`capture="environment"`), image upload, and high-fidelity canvas mock previews for offline/testing scenarios.
   - Built-in photo viewer with captioning and carousel navigation.
