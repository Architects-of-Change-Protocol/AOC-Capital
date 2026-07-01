export class AocError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public requestId?: string | null,
    public recoverable = false,
    public suggestedAction?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AocError";
  }
}

export class AocAuthError extends AocError { constructor(message: string, status = 401, code?: string, requestId?: string | null, recoverable = false, suggestedAction?: string, details?: unknown) { super(message, status, code, requestId, recoverable, suggestedAction, details); this.name = "AocAuthError"; } }
export class AocForbiddenError extends AocError { constructor(message: string, status = 403, code?: string, requestId?: string | null, recoverable = false, suggestedAction?: string, details?: unknown) { super(message, status, code, requestId, recoverable, suggestedAction, details); this.name = "AocForbiddenError"; } }
export class AocNotFoundError extends AocError { constructor(message: string, status = 404, code?: string, requestId?: string | null, recoverable = false, suggestedAction?: string, details?: unknown) { super(message, status, code, requestId, recoverable, suggestedAction, details); this.name = "AocNotFoundError"; } }
export class AocValidationError extends AocError { constructor(message: string, status = 400, code?: string, requestId?: string | null, recoverable = true, suggestedAction?: string, details?: unknown) { super(message, status, code, requestId, recoverable, suggestedAction, details); this.name = "AocValidationError"; } }
export class AocRateLimitError extends AocError { constructor(message: string, status = 429, code?: string, requestId?: string | null, recoverable = true, suggestedAction?: string, details?: unknown) { super(message, status, code, requestId, recoverable, suggestedAction, details); this.name = "AocRateLimitError"; } }
export class AocServerError extends AocError { constructor(message: string, status = 500, code?: string, requestId?: string | null, recoverable = true, suggestedAction?: string, details?: unknown) { super(message, status, code, requestId, recoverable, suggestedAction, details); this.name = "AocServerError"; } }
