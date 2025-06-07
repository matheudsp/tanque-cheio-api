import { JwtPayload } from '@/common/interfaces/jwt-payload';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}