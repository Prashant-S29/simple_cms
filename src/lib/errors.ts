export interface ErrorInfo {
  code: string;
  message: string;
}

/**
 * Discriminated union — TypeScript (and tRPC) can narrow the exact data type
 * from the success branch without losing type information.
 *
 * Use `response.error` as the discriminant:
 *   - truthy  → ErrorResponse  (data is null)
 *   - null    → SuccessResponse<T> (data is T, never null)
 */
export type SuccessResponse<T> = {
  data: T;
  error: null;
  message: string;
};

export type ErrorResponse = {
  data: null;
  error: ErrorInfo;
  message: null;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export const ERRORS = {
  general: {
    INTERNAL_SERVER_ERROR: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    },
    NOT_FOUND: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
    },
    UNAUTHORIZED: {
      code: "UNAUTHORIZED",
      message: "You are not authorized to perform this action.",
    },
    FORBIDDEN: {
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource.",
    },
    VALIDATION_ERROR: {
      code: "VALIDATION_ERROR",
      message: "The provided data is invalid.",
    },
    BAD_REQUEST: {
      code: "BAD_REQUEST",
      message:
        "The request could not be understood or was missing required parameters.",
    },
    DUPLICATE_RECORD: {
      code: "DUPLICATE_RECORD",
      message: "A record with this identifier already exists.",
    },
  },

  org: {
    DUPLICATE_RECORD: {
      code: "ORG_DUPLICATE_RECORD",
      message: "An organization with this name already exists.",
    },
    NOT_FOUND: {
      code: "ORG_NOT_FOUND",
      message: "Organization not found.",
    },
    UPDATE_FAILED: {
      code: "ORG_UPDATE_FAILED",
      message: "Failed to update the organization.",
    },
    DELETE_FAILED: {
      code: "ORG_DELETE_FAILED",
      message: "Failed to delete the organization.",
    },
  },

  project: {
    DUPLICATE_RECORD: {
      code: "PROJECT_DUPLICATE_RECORD",
      message: "A project with this name already exists in this organization.",
    },
    NOT_FOUND: {
      code: "PROJECT_NOT_FOUND",
      message: "Project not found.",
    },
    UPDATE_FAILED: {
      code: "PROJECT_UPDATE_FAILED",
      message: "Failed to update the project.",
    },
    DELETE_FAILED: {
      code: "PROJECT_DELETE_FAILED",
      message: "Failed to delete the project.",
    },
    ACCESS_DENIED: {
      code: "PROJECT_ACCESS_DENIED",
      message: "You do not have access to this project.",
    },
  },

  /** Org membership errors */
  orgMember: {
    NOT_FOUND: {
      code: "ORG_MEMBER_NOT_FOUND",
      message: "Member not found in this organization.",
    },
    ALREADY_MEMBER: {
      code: "ORG_MEMBER_ALREADY_MEMBER",
      message: "This user is already a member of the organization.",
    },
    REMOVED: {
      code: "ORG_MEMBER_REMOVED",
      message: "Your access to this organization has been revoked.",
    },
    CANNOT_REMOVE_OWNER: {
      code: "ORG_MEMBER_CANNOT_REMOVE_OWNER",
      message: "The organization owner cannot be removed.",
    },
    CANNOT_CHANGE_OWNER_ROLE: {
      code: "ORG_MEMBER_CANNOT_CHANGE_OWNER_ROLE",
      message: "The organization owner's role cannot be changed.",
    },
    INSUFFICIENT_PERMISSIONS: {
      code: "ORG_MEMBER_INSUFFICIENT_PERMISSIONS",
      message: "You do not have sufficient permissions to perform this action.",
    },
  },

  /** Invitation-specific errors */
  invitation: {
    NOT_FOUND: {
      code: "INVITATION_NOT_FOUND",
      message: "Invitation not found.",
    },
    EXPIRED: {
      code: "INVITATION_EXPIRED",
      message: "This invitation has expired. Please request a new one.",
    },
    ALREADY_USED: {
      code: "INVITATION_ALREADY_USED",
      message: "This invitation has already been used.",
    },
    EMAIL_MISMATCH: {
      code: "INVITATION_EMAIL_MISMATCH",
      message: "This invitation was sent to a different email address.",
    },
    NOT_INVITED: {
      code: "INVITATION_NOT_INVITED",
      message:
        "You have not been invited to this organization. Please ask an owner or admin for an invitation.",
    },
    INVALID_INVITE_CODE: {
      code: "INVITATION_INVALID_INVITE_CODE",
      message: "Invalid invite code. Please check the code and try again.",
    },
    SEND_FAILED: {
      code: "INVITATION_SEND_FAILED",
      message: "Failed to send the invitation email. Please try again.",
    },
    ALREADY_PENDING: {
      code: "INVITATION_ALREADY_PENDING",
      message:
        "An active invitation has already been sent to this email address.",
    },
  },
} as const;

type ErrorCategory = keyof typeof ERRORS;
type ErrorCode<C extends ErrorCategory> = keyof (typeof ERRORS)[C];

export function getErrorInfo<C extends ErrorCategory>(
  category: C,
  code: ErrorCode<C>,
  overrides?: Partial<ErrorInfo>,
): ErrorInfo {
  const base = ERRORS[category][code] as ErrorInfo;
  return { ...base, ...overrides };
}

export function successResponse<T>(
  data: T,
  message: string,
): SuccessResponse<T> {
  return { data, error: null, message };
}

/**
 * Returns an ErrorResponse — no generic needed.
 * At the call-site the return type participates in a union with
 * SuccessResponse<T>, giving tRPC the exact discriminated union it needs.
 */
export function errorResponse(error: ErrorInfo): ErrorResponse {
  return { data: null, error, message: null };
}
