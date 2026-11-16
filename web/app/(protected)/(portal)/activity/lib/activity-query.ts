import { toFarmDateTime, toFarmDayKey, toFarmDayLabel, toFarmDayStart, toFarmTime, toInitials } from '@/lib/format';

import type { Crab } from '@/types/crab-management';

import { activityTypeSchema, logChangesSchema, stickerChangesSchema } from '../types/activity';

import type {
  ActivityDetails,
  ActivityEntry,
  ActivityRange,
  ActivityResult,
  ActivitySearchParams,
  ActivityType,
  AuditEvent,
  DayGroup,
  Outcome,
} from '../types/activity';

// Only actions people take; reads (log.list, audit.list, …) are audited too but would drown the trail
export const ACTIONS_BY_TYPE = {
  account: [
    'auth.sign_in',
    'auth.sign_in.pin',
    'auth.sign_out',
    'auth.onboarding',
    'auth.change_password',
    'auth.change_pin',
    'auth.update_me',
  ],
  logs: ['log.create'],
  batches: ['batch.create'],
  stickers: ['crab.sticker_download'],
  users: ['user.create', 'user.update', 'user.deactivate', 'user.reactivate', 'user.reset_credentials'],
  security: ['auth.role_denied', 'auth.access_token_rejected', 'auth.refresh_token_rejected'],
} as const satisfies Record<ActivityType, readonly string[]>;

const ACTIVITY_TYPES = activityTypeSchema.options;

const RANGE_DAYS = { today: 0, '7d': 6, '30d': 29, '12m': 364 } as const satisfies Record<ActivityRange, number>;

const RESULT_OUTCOMES = {
  all: [],
  success: ['SUCCESS'],
  failed: ['FAILURE', 'ERROR'],
  denied: ['DENIED'],
} as const satisfies Record<ActivityResult, readonly Outcome[]>;

const DAY_MS = 24 * 60 * 60 * 1000;

export const toAuditQuery = (params: ActivitySearchParams, now: Date, canSeeEveryone: boolean) => {
  const query = new URLSearchParams({
    from: toFarmDayStart(new Date(now.getTime() - RANGE_DAYS[params.range] * DAY_MS)),
    size: String(params.shown),
    sort: '-occurred_at',
  });

  const types = params.type === 'all' ? ACTIVITY_TYPES : [params.type];
  types.flatMap((type) => ACTIONS_BY_TYPE[type]).forEach((action) => query.append('action', action));
  RESULT_OUTCOMES[params.result].forEach((outcome) => query.append('outcome', outcome));
  if (params.q) query.set('q', params.q);

  if (canSeeEveryone && params.person === 'me') query.set('mine', 'true');
  if (canSeeEveryone && params.person !== 'me' && params.person !== 'everyone') query.set('actor_id', params.person);
  return query;
};

const typeOf = (action: string): ActivityType =>
  ACTIVITY_TYPES.find((type) => (ACTIONS_BY_TYPE[type] as readonly string[]).includes(action)) ?? 'security';

const SIMPLE_EVENTS: Record<string, string> = {
  'auth.sign_in': 'Signed in with password',
  'auth.sign_in.pin': 'Unlocked with PIN',
  'auth.sign_out': 'Signed out',
  'auth.onboarding': 'Finished first sign-in setup',
  'auth.change_password': 'Changed their password',
  'auth.change_pin': 'Changed their PIN',
  'auth.update_me': 'Updated their name',
  'auth.access_token_rejected': 'Session expired or invalid',
  'auth.refresh_token_rejected': 'Saved sign-in expired or invalid',
};

const TARGET_EVENTS: Record<string, string> = {
  'user.create': 'Added user',
  'user.update': 'Updated user',
  'user.deactivate': 'Deactivated',
  'user.reactivate': 'Reactivated',
  'user.reset_credentials': 'Reset password and PIN for',
};

const MEASUREMENT_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

const describeLog = (event: AuditEvent, crabs: Crab[]) => {
  const parsed = logChangesSchema.safeParse(event.changes);
  if (!parsed.success) return 'Logged a crab';

  const { batch_id, crab_id, width_mm, weight_g } = parsed.data.after;
  const name = crabs.find(({ id }) => id === crab_id)?.name ?? `#${crab_id}`;
  const code = batch_id === null ? name : `B${batch_id}-${name}`;
  const measurements = [
    weight_g === null ? null : `${MEASUREMENT_FORMAT.format(weight_g)} g`,
    width_mm === null ? null : `${MEASUREMENT_FORMAT.format(width_mm)} mm`,
  ].filter(Boolean);
  return `Logged crab ${code} · ${measurements.join(', ')}`;
};

const describeStickers = (event: AuditEvent) => {
  const parsed = stickerChangesSchema.safeParse(event.changes);
  if (!parsed.success) return 'Downloaded QR stickers';

  const { batch_id, crab_names, file_type } = parsed.data;
  const count = crab_names.length;
  return `Downloaded ${count} QR ${count === 1 ? 'sticker' : 'stickers'} for Batch ${batch_id} · ${file_type.toUpperCase()}`;
};

const describeSuccess = (event: AuditEvent, crabs: Crab[]) => {
  const { action, target_label } = event;
  if (action === 'log.create') return describeLog(event, crabs);
  if (action === 'crab.sticker_download') return describeStickers(event);
  if (action === 'batch.create') return target_label ? `Started Batch ${target_label}` : 'Started a batch';
  if (action === 'auth.role_denied') return `Tried a page their role can't use${event.http_path ? ` · ${event.http_path}` : ''}`;

  const targetEvent = TARGET_EVENTS[action];
  if (targetEvent) return target_label ? `${targetEvent} ${target_label}` : targetEvent;
  return SIMPLE_EVENTS[action] ?? action;
};

const FAILED_PREFIX: Record<string, string> = { 'auth.sign_in': 'Sign-in failed', 'auth.sign_in.pin': 'PIN unlock failed' };

// audit_events.reason holds the service's result code; people read the cause, not the code
const REASON_LABELS: Record<string, string> = {
  INVALID_PIN: 'wrong PIN',
  INCORRECT_PASSWORD: 'wrong password',
  INCORRECT_CURRENT_PASSWORD: 'current password was wrong',
  INCORRECT_CURRENT_PIN: 'current PIN was wrong',
  EMAIL_NOT_FOUND: 'no account with that email',
  USER_INACTIVE: 'account is deactivated',
  SAME_PASSWORD: 'new password matched the old one',
  SAME_PIN: 'new PIN matched the old one',
  DEFAULT_PASSWORD: 'kept the default password',
  DEFAULT_PIN: 'kept the default PIN',
  ALREADY_ONBOARDED: 'setup was already done',
  EMAIL_ALREADY_EXISTS: 'that email is already used',
  USER_NOT_FOUND: 'user not found',
  CANNOT_DEACTIVATE_SELF: "can't deactivate your own account",
  CANNOT_RESET_OWN_CREDENTIALS: "can't reset your own password and PIN here",
  DEVELOPER_ROLE_REQUIRED: 'only a Developer can change Developer accounts',
  OTHERS_ACTIVITY_FORBIDDEN: "Staff can't see other people's activity",
  CRAB_NOT_FOUND: 'crab not found',
  BATCH_NOT_FOUND: 'batch not found',
  STICKER_BATCH_NOT_FOUND: 'batch not found',
  STICKER_CRABS_NOT_FOUND: 'crabs not found',
};

const toReasonLabel = (reason: string) =>
  REASON_LABELS[reason] ?? (/^[A-Z_]+$/.test(reason) ? reason.toLowerCase().replaceAll('_', ' ') : reason);

const isTokenRejection = (action: string) => action.endsWith('_token_rejected');

export const describeEvent = (event: AuditEvent, crabs: Crab[]) => {
  if (event.outcome === 'SUCCESS' || isTokenRejection(event.action) || event.action === 'auth.role_denied') {
    return describeSuccess(event, crabs);
  }

  const failed = FAILED_PREFIX[event.action] ?? `${describeSuccess(event, crabs)}, not done`;
  return event.reason ? `${failed} · ${toReasonLabel(event.reason)}` : failed;
};

const toOutcomeLabel = ({ outcome, action }: AuditEvent) => {
  if (outcome === 'SUCCESS') return null;
  if (isTokenRejection(action)) return 'Rejected';
  return outcome === 'DENIED' ? 'Denied' : 'Failed';
};

export type ActorContext = {
  selfId: string;
  selfName: string;
  names: Map<string, string>;
};

const toActor = ({ actor_id, actor_type, actor_email }: AuditEvent, { selfId, selfName, names }: ActorContext) => {
  if (actor_type === 'SYSTEM') return { actor_name: 'System', actor_initials: 'SY', actor_kind: 'system' as const };
  if (actor_id === selfId) return { actor_name: 'You', actor_initials: toInitials(selfName), actor_kind: 'person' as const };

  const name = (actor_id ? names.get(actor_id) : undefined) ?? actor_email;
  if (!name) return { actor_name: 'No signed-in user', actor_initials: '?', actor_kind: 'unknown' as const };
  return { actor_name: name, actor_initials: toInitials(name.replace(/@.*/, '')), actor_kind: 'person' as const };
};

const ROLE_LABELS: Record<string, string> = { DEVELOPER: 'Developer', ADMIN: 'Admin', STAFF: 'Staff' };

const toTarget = ({ target_type, target_label }: AuditEvent) => {
  if (!target_label) return null;
  return target_type ? `${target_type[0]?.toUpperCase() ?? ''}${target_type.slice(1)} ${target_label}` : target_label;
};

const toDetails = (event: AuditEvent): ActivityDetails => ({
  occurred_at_label: toFarmDateTime(event.occurred_at),
  action: event.action,
  actor_email: event.actor_email,
  actor_role: event.actor_role ? (ROLE_LABELS[event.actor_role] ?? event.actor_role) : null,
  target: toTarget(event),
  reason_label: event.reason ? toReasonLabel(event.reason) : null,
  reason_code: event.reason,
  http_status: event.http_status,
  request: event.http_method && event.http_path ? `${event.http_method} ${event.http_path}` : event.http_path,
  source_ip: event.source_ip,
  user_agent: event.user_agent,
  changes: event.changes ? JSON.stringify(event.changes, null, 2) : null,
});

export const toEntry = (event: AuditEvent, crabs: Crab[], actors: ActorContext): ActivityEntry => ({
  id: event.id,
  type: typeOf(event.action),
  event: describeEvent(event, crabs),
  outcome: event.outcome,
  outcome_label: toOutcomeLabel(event),
  time_label: toFarmTime(event.occurred_at),
  count: 1,
  details: toDetails(event),
  ...toActor(event, actors),
});

const isRepeat = (previous: ActivityEntry, entry: ActivityEntry) =>
  previous.event === entry.event &&
  previous.actor_name === entry.actor_name &&
  previous.outcome === entry.outcome &&
  previous.time_label === entry.time_label;

// Back-to-back identical events (a page retrying an expired session) read as one row with a count
const collapseRepeats = (entries: ActivityEntry[]) =>
  entries.reduce<ActivityEntry[]>((rows, entry) => {
    const previous = rows.at(-1);
    if (previous && isRepeat(previous, entry)) return [...rows.slice(0, -1), { ...previous, count: previous.count + 1 }];
    return [...rows, entry];
  }, []);

export const groupByDay = (events: AuditEvent[], toRow: (event: AuditEvent) => ActivityEntry, now: Date): DayGroup[] =>
  Object.entries(Object.groupBy(events, ({ occurred_at }) => toFarmDayKey(occurred_at))).map(([key, dayEvents = []]) => ({
    key,
    label: dayEvents[0] ? toFarmDayLabel(dayEvents[0].occurred_at, now) : key,
    entries: collapseRepeats(dayEvents.map(toRow)),
  }));
