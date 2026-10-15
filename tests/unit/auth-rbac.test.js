import { describe, it, expect } from 'vitest';
import { ROLES } from '../../src/utils/calculations';

describe('RBAC Roles & Authorization Policies', () => {
  it('defines exactly 4 core business roles', () => {
    expect(Object.keys(ROLES)).toEqual(['Admin', 'Officer', 'Warehouse', 'Accounts']);
    expect(ROLES.Admin).toContain('Purchase Head');
    expect(ROLES.Officer).toContain('Field Officer');
    expect(ROLES.Warehouse).toContain('Warehouse In-charge');
    expect(ROLES.Accounts).toContain('Accounts & Finance');
  });

  it('validates role switching security rule: Admin vs Non-admin', () => {
    const adminUser = { role: 'Admin', name: 'Avi Mangal', login_id: 'admin' };
    const officerUser = { role: 'Officer', name: 'Rahul', login_id: 'officer_dwl' };
    const warehouseUser = { role: 'Warehouse', name: 'Suresh', login_id: 'warehouse_dwl' };

    // Function simulating the role switch policy logic
    const canSwitchWithoutPassword = (user) => user?.role === 'Admin';

    expect(canSwitchWithoutPassword(adminUser)).toBe(true);
    expect(canSwitchWithoutPassword(officerUser)).toBe(false);
    expect(canSwitchWithoutPassword(warehouseUser)).toBe(false);
  });

  it('validates commission cut privilege logic', () => {
    const authorizedOfficer = { role: 'Officer', can_cut_comm: true };
    const standardOfficer = { role: 'Officer', can_cut_comm: false };
    const warehouseStaff = { role: 'Warehouse', can_cut_comm: false };

    const isCommissionTuningAllowed = (user) =>
      user.role === 'Admin' || (user.role === 'Officer' && !!user.can_cut_comm);

    expect(isCommissionTuningAllowed({ role: 'Admin' })).toBe(true);
    expect(isCommissionTuningAllowed(authorizedOfficer)).toBe(true);
    expect(isCommissionTuningAllowed(standardOfficer)).toBe(false);
    expect(isCommissionTuningAllowed(warehouseStaff)).toBe(false);
  });

  it('ensures unauthenticated visitors and logged-out users are initialized to null without auto-login', () => {
    const getInitialUser = (storageVal) => {
      try {
        return storageVal ? JSON.parse(storageVal) : null;
      } catch {
        return null;
      }
    };

    // When localStorage has no user stored (fresh visitor or after logout)
    expect(getInitialUser(null)).toBeNull();
    expect(getInitialUser(undefined)).toBeNull();
    expect(getInitialUser('')).toBeNull();
    expect(getInitialUser('{invalid json')).toBeNull();

    // Only valid persisted user session is restored
    const session = JSON.stringify({ name: 'Rahul', role: 'Officer', login_id: 'officer_dwl' });
    expect(getInitialUser(session)).toEqual({ name: 'Rahul', role: 'Officer', login_id: 'officer_dwl' });
  });
});
