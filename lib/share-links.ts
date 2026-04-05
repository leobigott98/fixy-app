export function buildPublicQuotePath(token: string) {
  return `/presupuestos/${token}` as const;
}

export function buildPublicQuoteDocumentPath(token: string) {
  return `/presupuestos/${token}/documento` as const;
}

export function buildPublicWorkOrderPath(token: string) {
  return `/ordenes/${token}` as const;
}

export function buildPublicWorkOrderDocumentPath(token: string) {
  return `/ordenes/${token}/documento` as const;
}
