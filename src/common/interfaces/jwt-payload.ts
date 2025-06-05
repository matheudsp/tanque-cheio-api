export interface JwtPayload {
  user_id: string;
  role_id: string;
  session_id: string; 
  iat: number; // issued at
  exp: number; // expiratiom
  aud: string; // audience
  iss: string; // issue
}