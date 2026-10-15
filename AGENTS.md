# Satyam Purchase — Agent Workspace Guidelines & Rules

## 1. Mandatory Skill Auto-Update Rule
**Whenever you make ANY change to this project**, you MUST automatically update the project skill file before finishing your response:
- **Skill File**: [.agents/skills/satyam-purchase/SKILL.md](file:///Users/mahatvagarg/Documents/GitHub/satyam%20purchase/.agents/skills/satyam-purchase/SKILL.md)
- **Checklist**:
  1. If any **database table or schema** changes: Update Section 4 (Database & Backend).
  2. If any **authentication, credential, or RBAC permission** changes: Update Section 3 (RBAC & Credentials Matrix).
  3. If any **pricing formula or business calculation** changes: Update Section 2 (Pricing Formulas).
  4. If any **API endpoint or serverless function** changes: Update Section 4 (Unified API Handlers).
  5. Always append a new entry to Section 6 (Recent Changes & Evolution Log).
  6. If user-facing instructions or workflows change: Synchronize [README.md](file:///Users/mahatvagarg/Documents/GitHub/satyam%20purchase/README.md).

## 2. Authentication & Security Policy
- **No Mobile Login / OTP**: Authentication is strictly **User ID (Username) + Password**.
- **Role Switching**:
  - Admin (`role === 'Admin'`) can switch to any role instantly without password verification.
  - All non-admin roles (Officer, Warehouse, Accounts) are blocked from switching unless they verify the target role's password or the master admin credentials.

## 3. Build & Test Verification
Before completing any task:
1. Run `npm run build` (must pass with 0 errors).
2. Run `node scripts/test-services.js` (must pass all Neon database and auth tests).
3. Commit and push the changes to GitHub (`origin main`).
