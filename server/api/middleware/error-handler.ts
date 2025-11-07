import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log full error details server-side
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).userId,
    timestamp: new Date().toISOString(),
  });
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Don't leak internal error details to clients
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Generic error messages for production
  let userMessage = 'An error occurred';
  if (statusCode === 400) {
    userMessage = 'Invalid request';
  } else if (statusCode === 401) {
    userMessage = 'Authentication required';
  } else if (statusCode === 403) {
    userMessage = 'Access denied';
  } else if (statusCode === 404) {
    userMessage = 'Resource not found';
  } else if (statusCode === 429) {
    userMessage = 'Too many requests';
  } else if (statusCode >= 500) {
    userMessage = 'Internal server error';
  }
  
  res.status(statusCode).json({
    error: {
      message: isDevelopment ? err.message : userMessage,
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};

