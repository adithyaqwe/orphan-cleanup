/**
 * UI Terminology & Status Formatter Utility
 * Translates backend enums into simple, non-technical UI labels.
 */

// Simple Status Mapping
export const STATUS_LABELS = {
  ACTIVE: 'Active',
  ORPHAN_CANDIDATE: 'Checking',
  VERIFIED_ORPHAN: 'Orphaned',
  PROTECTED: 'Protected',
  CLEANING: 'Cleaning',
  RECLAIMED: 'Cleaned',
  NEEDS_REVIEW: 'Needs Review',
};

export function formatStatus(status) {
  if (!status) return 'Unknown';
  return STATUS_LABELS[status.toUpperCase()] || status;
}

// Simple Resource Type Mapping
export const RESOURCE_TYPE_LABELS = {
  EC2_INSTANCE: 'Temporary Server',
  SERVER: 'Temporary Server',
  INSTANCE: 'Temporary Server',
  K8S_POD: 'Temporary App',
  POD: 'Temporary App',
  CONTAINER: 'Temporary App',
  EBS_VOLUME: 'Temporary Disk',
  VOLUME: 'Temporary Disk',
  S3_BUCKET: 'Temporary Storage',
  BUCKET: 'Temporary Storage',
};

export function formatResourceType(type) {
  if (!type) return 'Temporary Resource';
  const uppercaseType = type.toUpperCase();
  return RESOURCE_TYPE_LABELS[uppercaseType] || 'Temporary Resource';
}

// Technical terminology replacement map
export function formatTerm(term) {
  if (!term) return '';
  return term
    .replace(/\bEC2 Instance\b/gi, 'Temporary Server')
    .replace(/\bK8s Pod\b/gi, 'Temporary App')
    .replace(/\bPipeline Run\b/gi, 'Work Run')
    .replace(/\bCI\/CD Pipeline\b/gi, 'Automation Process')
    .replace(/\bSpawned\b/gi, 'Created')
    .replace(/\bAdopted By\b/gi, 'Now Used By')
    .replace(/\bTelemetry\b/gi, 'Activity')
    .replace(/\bResource ID\b/gi, 'Resource')
    .replace(/\bLifecycle\b/gi, 'History')
    .replace(/\bInfrastructure\b/gi, 'Cloud Resources');
}
