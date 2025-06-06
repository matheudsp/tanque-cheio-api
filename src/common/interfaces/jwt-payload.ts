export interface JwtPayload {
  user_id: string;
  role_id: string | null;
  iat: number; // issued at
  exp: number; // expiration
  aud: string; // audience
  iss: string; // issuer
}