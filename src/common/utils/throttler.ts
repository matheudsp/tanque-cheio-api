import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { HTTP_STATUS_MESSAGE, responseBadRequest } from './response-api';
import { ThrottlerOptions, seconds } from '@nestjs/throttler';

import { Request } from 'express';

export const throttler: ThrottlerOptions[] = [
  {
    name: 'short',
    ttl: seconds(1), 
    limit: 3, 
  },
  {
    name: 'medium',
    ttl: seconds(10), 
    limit: 20, 
  },       
];

export const trackerThrottler = (
  req: Request,
  context: ExecutionContext,
): string => {
  const ip = req.ip;
  const [bearer, token] = req.headers['authorization']?.split(' ') || [];
  if (!ip)
    throw new HttpException(
      responseBadRequest({
        message: HTTP_STATUS_MESSAGE[HttpStatus.BAD_REQUEST],
      }),
      HttpStatus.BAD_REQUEST,
    );
  if (bearer !== 'Bearer' || !token) return `${ip}`;
  return `${ip}-${token}`;
};
