interface ApiResponse {
  status: 'success' | 'error';
  message: string;
  code?: string;
  timestamp?: string;
  data?: any;
}

export function createApiResponse(
  status: 'success' | 'error',
  message: string,
  code?: string,
  data?: any
): ApiResponse {
  return {
    status,
    message,
    code,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  };
}

export function respondWithStatus(event: any, response: ApiResponse, statusCode = 200) {
  setHeader(event, 'Content-Type', 'application/json');
  setResponseStatus(event, statusCode);
  return response;
}