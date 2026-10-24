export const SOURCE_MODULE = {
  IAM: 'iam',
  AUDIT: 'audit',
  REGISTRY: 'registry',
  ASSISTANCE: 'assistance',
  EDUCATION: 'education',
} as const;

export type SourceModule = (typeof SOURCE_MODULE)[keyof typeof SOURCE_MODULE];

export interface ActorContext {
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly sourceModule: SourceModule;
}
