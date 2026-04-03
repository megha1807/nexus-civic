/**
 * ArmorIQ Zero Trust Policy Engine
 * DENY ALL by default. Only explicitly listed actions are allowed.
 * Every decision (allowed AND blocked) is logged to AIAuditLog in MongoDB.
 * This is the centerpiece of the ArmorIQ track demonstration (Rs 10,000 prize).
 */
import { AIAuditLog } from '@nexus-civic/db';

export enum BlockReason {
  ROLE_NOT_AUTHORIZED = 'ROLE_NOT_AUTHORIZED',
  MODULE_NOT_ACCESSIBLE = 'MODULE_NOT_ACCESSIBLE',
  DATA_ACCESS_VIOLATION = 'DATA_ACCESS_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
}

export interface PolicyDecision {
  allowed: boolean;
  action: string;
  module: string;
  role: string;
  reason?: string;
  blockReason?: BlockReason;
}

interface RolePolicy {
  allowedActions: string[];
  allowedModules: string[];
}

export const POLICIES: Record<string, RolePolicy> = {
  citizen: {
    allowedActions: [
      'get_own_grievances',
      'submit_grievance',
      'track_grievance_status',
      'ask_budget_question',
      'check_safety_score',
      'check_safety_heatmap',
      'find_nearby_ngos',
      'submit_donation',
      'track_donation',
      'join_townhall',
      'submit_townhall_issue',
      'cast_townhall_vote',
      'find_gig_listings',
      'apply_to_gig',
      'update_worker_profile',
    ],
    allowedModules: [
      'pulse-report',
      'guardian-net',
      'near-give',
      'voice-assembly',
      'gig-forge',
      'ledger-civic',
    ],
  },
  officer: {
    allowedActions: [
      'view_assigned_grievances',
      'update_grievance_status',
      'view_sos_events',
      'resolve_sos_event',
      'view_crime_predictions',
      'acknowledge_dispatch',
      'view_townhall_sessions',
      'view_volunteer_list',
    ],
    allowedModules: ['guardian-net', 'pulse-report', 'sentinel-ai', 'voice-assembly'],
  },
  admin: {
    allowedActions: ['*'],
    allowedModules: ['*'],
  },
  ngo: {
    allowedActions: ['view_assigned_donations', 'update_donation_status', 'view_own_ngo_profile'],
    allowedModules: ['near-give'],
  },
};

export const ALL_KNOWN_ACTIONS = [
  'get_own_grievances',
  'submit_grievance',
  'track_grievance_status',
  'ask_budget_question',
  'check_safety_score',
  'check_safety_heatmap',
  'find_nearby_ngos',
  'submit_donation',
  'track_donation',
  'join_townhall',
  'submit_townhall_issue',
  'cast_townhall_vote',
  'find_gig_listings',
  'apply_to_gig',
  'update_worker_profile',
  'view_assigned_grievances',
  'update_grievance_status',
  'view_sos_events',
  'resolve_sos_event',
  'view_crime_predictions',
  'acknowledge_dispatch',
  'view_townhall_sessions',
  'view_volunteer_list',
  'view_assigned_donations',
  'update_donation_status',
  'view_own_ngo_profile',
  'view_all_grievances',
  'view_all_users',
  'manage_departments',
  'trigger_patrol_dispatch',
  'view_budget_anomalies',
  'manage_ngos',
];

export const ALL_KNOWN_MODULES = [
  'pulse-report',
  'guardian-net',
  'near-give',
  'voice-assembly',
  'gig-forge',
  'ledger-civic',
  'sentinel-ai',
  'terra-scan',
  'civic-pulse',
  'mesh-alert',
  'aura-assist',
];

/**
 * Evaluate whether an action is allowed for a given role.
 * Returns a PolicyDecision with allowed: true or false + reason if blocked.
 */
export function evaluatePolicy(
  userId: string,
  role: string,
  intendedAction: string,
  targetModule: string
): PolicyDecision {
  void userId;

  const policy = POLICIES[role];
  if (!policy) {
    return {
      allowed: false,
      action: intendedAction,
      module: targetModule,
      role,
      reason: `Unknown role '${role}'. Access denied.`,
      blockReason: BlockReason.ROLE_NOT_AUTHORIZED,
    };
  }

  const modulesOk = policy.allowedModules[0] === '*' || policy.allowedModules.includes(targetModule);
  if (!modulesOk) {
    return {
      allowed: false,
      action: intendedAction,
      module: targetModule,
      role,
      reason: `Your role '${role}' cannot access the '${targetModule}' module.`,
      blockReason: BlockReason.MODULE_NOT_ACCESSIBLE,
    };
  }

  const actionOk = policy.allowedActions[0] === '*' || policy.allowedActions.includes(intendedAction);
  if (!actionOk) {
    return {
      allowed: false,
      action: intendedAction,
      module: targetModule,
      role,
      reason: `Action '${intendedAction}' is not permitted for role '${role}'.`,
      blockReason: BlockReason.ROLE_NOT_AUTHORIZED,
    };
  }

  return { allowed: true, action: intendedAction, module: targetModule, role };
}

/**
 * Log every policy decision to MongoDB AIAuditLog.
 * Both ALLOWED and BLOCKED decisions are logged — this is the audit trail.
 * Called after every evaluatePolicy call in the query controller.
 */
export async function logDecision(
  decision: PolicyDecision,
  query: string,
  userId: string
): Promise<void> {
  try {
    await AIAuditLog.create({
      userId,
      query: query.substring(0, 200),
      action: decision.action,
      module: decision.module,
      role: decision.role,
      allowed: decision.allowed,
      blockReason: decision.blockReason,
      reason: decision.reason,
    });
  } catch (err) {
    console.error('[AuraAssist] Failed to write audit log:', err);
    // Never throw here — audit log failure must not break the main request
  }
}
