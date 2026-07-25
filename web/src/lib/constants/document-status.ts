export const DocumentStatus = {
  Draft: 'Draft',
  UnderReview: 'Under Review',
  Verified: 'Verified',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Archived: 'Archived',
} as const;

export type DocumentStatusType = typeof DocumentStatus[keyof typeof DocumentStatus];

export const ALLOWED_STATUSES = Object.values(DocumentStatus);

export function getStatusColor(status: string | null | undefined) {
  const safeStatus = status ?? DocumentStatus.Draft;
  switch (safeStatus) {
    case DocumentStatus.Draft:
      return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' }; // Slate light
    case DocumentStatus.UnderReview:
      return { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' }; // Blue
    case DocumentStatus.Verified:
      return { bg: '#fdf4ff', text: '#c026d3', border: '#f5d0fe' }; // Fuchsia
    case DocumentStatus.Approved:
      return { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' }; // Emerald
    case DocumentStatus.Rejected:
      return { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' }; // Red
    case DocumentStatus.Archived:
      return { bg: '#f3f4f6', text: '#9ca3af', border: '#e5e7eb' }; // Gray
    default:
      return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' }; // Default (Draft)
  }
}
