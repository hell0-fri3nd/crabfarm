import { farmUserSchema } from '../types/users';

// Preview data shaped like GET /users until the BFF is wired up
export const PREVIEW_USERS = farmUserSchema.array().parse([
  { id: 'u-art', name: 'Art Lisboa', email: 'art@farm.ph', role: 'admin', status: 'active', last_active_label: 'Now', is_self: true },
  { id: 'u-maria', name: 'Maria Santos', email: 'maria.santos@farm.ph', role: 'operator', status: 'active', last_active_label: 'Today, 4:12 PM', is_self: false },
  { id: 'u-jun', name: 'Jun Reyes', email: 'jun.reyes@farm.ph', role: 'operator', status: 'active', last_active_label: 'Today, 7:55 AM', is_self: false },
  { id: 'u-leah', name: 'Leah Cruz', email: 'leah.cruz@farm.ph', role: 'viewer', status: 'invited', last_active_label: 'Invite expires in 18 h', is_self: false },
  { id: 'u-test2', name: 'Test account 2', email: 'test2@farm.ph', role: 'viewer', status: 'deactivated', last_active_label: 'Mon 26 Oct', is_self: false },
]);
