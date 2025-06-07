export interface JwtPayload {
  user_id: string;
  role_id: string | null;
  session_id: string;
  iat: number; // issued at
  exp: number; // expiration
  aud: string; // audience
  iss: string; // issuer
  type?: 'access' | 'refresh'; // tipo do token
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
}