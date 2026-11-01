export class StoreError extends Error {
  constructor(code, details = {}, status = 422) {
    super(code);
    this.name = 'StoreError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export function fail(code, details, status) {
  throw new StoreError(code, details, status);
}
