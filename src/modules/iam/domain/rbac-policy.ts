import { SOURCE_MODULE, type ActorContext, type SourceModule } from '../../../shared';

export const ROLE_CODE = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  SOCIAL_OPERATOR: 'SOCIAL_OPERATOR',
  EDUCATION_OPERATOR: 'EDUCATION_OPERATOR',
} as const;

export type RoleCode = (typeof ROLE_CODE)[keyof typeof ROLE_CODE];

export const PERMISSION_CODE = {
  REGISTRY_PERSON_READ: 'registry:person:read',
  REGISTRY_PERSON_WRITE: 'registry:person:write',
  REGISTRY_DOCUMENT_READ: 'registry:document:read',
  REGISTRY_DOCUMENT_WRITE: 'registry:document:write',
  ASSISTANCE_HOUSEHOLD_READ: 'assistance:household:read',
  ASSISTANCE_HOUSEHOLD_WRITE: 'assistance:household:write',
  ASSISTANCE_ATTENDANCE_READ: 'assistance:attendance:read',
  ASSISTANCE_ATTENDANCE_WRITE: 'assistance:attendance:write',
  ASSISTANCE_INCOME_READ: 'assistance:income:read',
  ASSISTANCE_INCOME_WRITE: 'assistance:income:write',
  ASSISTANCE_BENEFIT_READ: 'assistance:benefit:read',
  ASSISTANCE_BENEFIT_WRITE: 'assistance:benefit:write',
  ASSISTANCE_REPORT_READ: 'assistance:report:read',
  AUDIT_EVENT_READ: 'audit:event:read',
  IAM_USER_MANAGE: 'iam:user:manage',
} as const;

export type PermissionCode = (typeof PERMISSION_CODE)[keyof typeof PERMISSION_CODE];

export interface RoleDefinition {
  readonly code: RoleCode;
  readonly name: string;
  readonly description: string;
}

export interface PermissionDefinition {
  readonly code: PermissionCode;
  readonly module: SourceModule;
  readonly description: string;
}

export const DEFAULT_ROLES: readonly RoleDefinition[] = [
  {
    code: ROLE_CODE.SYSTEM_ADMIN,
    name: 'System Administrator',
    description:
      'Full administrative access across iam, audit, registry, and assistance modules (DA-012).',
  },
  {
    code: ROLE_CODE.SOCIAL_OPERATOR,
    name: 'Social Assistance Operator',
    description:
      'Operates shared registry and social assistance modules with scoped audit consultation (DA-012).',
  },
  {
    code: ROLE_CODE.EDUCATION_OPERATOR,
    name: 'Education Operator',
    description:
      'Operates shared registry and future education module without access to social assistance data (DA-007, DA-012).',
  },
] as const;

export const DEFAULT_PERMISSIONS: readonly PermissionDefinition[] = [
  {
    code: PERMISSION_CODE.REGISTRY_PERSON_READ,
    module: SOURCE_MODULE.REGISTRY,
    description: 'Read and search canonical Person records and contacts.',
  },
  {
    code: PERMISSION_CODE.REGISTRY_PERSON_WRITE,
    module: SOURCE_MODULE.REGISTRY,
    description: 'Create and update canonical Person records and contacts.',
  },
  {
    code: PERMISSION_CODE.REGISTRY_DOCUMENT_READ,
    module: SOURCE_MODULE.REGISTRY,
    description: 'Read metadata and download general PersonDocument files.',
  },
  {
    code: PERMISSION_CODE.REGISTRY_DOCUMENT_WRITE,
    module: SOURCE_MODULE.REGISTRY,
    description: 'Create, update, and upload general PersonDocument files.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_READ,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Read households, family composition, and active household head.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_WRITE,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Create and update households, member links, and household head.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_ATTENDANCE_READ,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Read social attendance records and history.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_ATTENDANCE_WRITE,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Register and update social attendances, assessments, and referrals.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_INCOME_READ,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Read household income sources and socioeconomic indicators.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_INCOME_WRITE,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Register and update household income sources.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_BENEFIT_READ,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Read social programs, benefits, emergency baskets, and project participations.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_BENEFIT_WRITE,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Register and update benefits, emergency baskets, and project participations.',
  },
  {
    code: PERMISSION_CODE.ASSISTANCE_REPORT_READ,
    module: SOURCE_MODULE.ASSISTANCE,
    description: 'Read social assistance management indicators and reports.',
  },
  {
    code: PERMISSION_CODE.AUDIT_EVENT_READ,
    module: SOURCE_MODULE.AUDIT,
    description: 'Query audit trail events within the actor authorized module scope.',
  },
  {
    code: PERMISSION_CODE.IAM_USER_MANAGE,
    module: SOURCE_MODULE.IAM,
    description: 'Create, activate/deactivate users, reset credentials, and assign RBAC roles.',
  },
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly PermissionCode[]>> = {
  [ROLE_CODE.SYSTEM_ADMIN]: DEFAULT_PERMISSIONS.map((p) => p.code),
  [ROLE_CODE.SOCIAL_OPERATOR]: [
    PERMISSION_CODE.REGISTRY_PERSON_READ,
    PERMISSION_CODE.REGISTRY_PERSON_WRITE,
    PERMISSION_CODE.REGISTRY_DOCUMENT_READ,
    PERMISSION_CODE.REGISTRY_DOCUMENT_WRITE,
    PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_READ,
    PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_WRITE,
    PERMISSION_CODE.ASSISTANCE_ATTENDANCE_READ,
    PERMISSION_CODE.ASSISTANCE_ATTENDANCE_WRITE,
    PERMISSION_CODE.ASSISTANCE_INCOME_READ,
    PERMISSION_CODE.ASSISTANCE_INCOME_WRITE,
    PERMISSION_CODE.ASSISTANCE_BENEFIT_READ,
    PERMISSION_CODE.ASSISTANCE_BENEFIT_WRITE,
    PERMISSION_CODE.ASSISTANCE_REPORT_READ,
    PERMISSION_CODE.AUDIT_EVENT_READ,
  ],
  [ROLE_CODE.EDUCATION_OPERATOR]: [
    PERMISSION_CODE.REGISTRY_PERSON_READ,
    PERMISSION_CODE.REGISTRY_PERSON_WRITE,
    PERMISSION_CODE.REGISTRY_DOCUMENT_READ,
    PERMISSION_CODE.REGISTRY_DOCUMENT_WRITE,
    PERMISSION_CODE.AUDIT_EVENT_READ,
  ],
};

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly isActive: boolean;
  readonly roles: readonly RoleCode[];
  readonly permissions: readonly PermissionCode[];
}

/**
 * Resolves the bounded-context modules whose audit events an actor is allowed to read (DA-012 §3.4).
 */
export function getAuthorizedAuditModules(actor: ActorContext): readonly SourceModule[] {
  if (actor.roles.includes(ROLE_CODE.SYSTEM_ADMIN)) {
    return [
      SOURCE_MODULE.IAM,
      SOURCE_MODULE.AUDIT,
      SOURCE_MODULE.REGISTRY,
      SOURCE_MODULE.ASSISTANCE,
      SOURCE_MODULE.EDUCATION,
    ];
  }

  const allowed = new Set<SourceModule>();
  if (actor.roles.includes(ROLE_CODE.SOCIAL_OPERATOR)) {
    allowed.add(SOURCE_MODULE.REGISTRY);
    allowed.add(SOURCE_MODULE.ASSISTANCE);
  }
  if (actor.roles.includes(ROLE_CODE.EDUCATION_OPERATOR)) {
    allowed.add(SOURCE_MODULE.REGISTRY);
    allowed.add(SOURCE_MODULE.EDUCATION);
  }

  return [...allowed];
}
