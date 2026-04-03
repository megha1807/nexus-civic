/**
 * Standard success response payload.
 */
export const successResponse = <T>(data: T, message = 'Success') => ({
  success: true as const,
  message,
  data,
});

/**
 * Standard paginated success response payload.
 */
export const paginatedResponse = <T>(data: T[], pagination: object, message = 'Success') => ({
  success: true as const,
  message,
  data,
  pagination,
});

/**
 * Standard error payload helper.
 */
export const errorResponse = (message: string, code = 400) => ({
  success: false as const,
  error: message,
  code,
});
