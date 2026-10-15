# Auto-Update Skill Protocol

> **Rule Priority**: Mandatory for all agent sessions in this workspace.

Whenever ANY modification is made to the codebase:
1. Review [.agents/skills/satyam-purchase/SKILL.md](file:///Users/mahatvagarg/Documents/GitHub/satyam%20purchase/.agents/skills/satyam-purchase/SKILL.md).
2. Update the relevant sections (Architecture, Credentials, Database Schema, Pricing Math, API Endpoints).
3. Append a bullet point to the Change Log in `SKILL.md`.
4. Ensure `npm run build` and `node scripts/test-services.js` pass.
5. Commit and push the updated skill alongside the code changes to GitHub.
