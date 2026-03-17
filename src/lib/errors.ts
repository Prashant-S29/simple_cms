export interface ErrorInfo {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ErrorInfo | null;
  message: string | null;
}

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

export function successResponse<T>(data: T, message: string): ApiResponse<T> {
  return { data, error: null, message };
}

export function errorResponse<T = null>(error: ErrorInfo): ApiResponse<T> {
  return { data: null, error, message: null };
}
