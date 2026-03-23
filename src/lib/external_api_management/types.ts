export type ExternalSuccessResponse<T> = {
  data: T;
  error: null;
  message: string;
};

export type ExternalErrorResponse = {
  data: null;
  error: {
    code: string;
    message: string;
  };
  message: null;
};

export type ExternalApiResponse<T> =
  | ExternalSuccessResponse<T>
  | ExternalErrorResponse;

export function externalSuccess<T>(
  data: T,
  message: string,
): ExternalSuccessResponse<T> {
  return { data, error: null, message };
}

export function externalError(
  code: string,
  message: string,
): ExternalErrorResponse {
  return { data: null, error: { code, message }, message: null };
}
