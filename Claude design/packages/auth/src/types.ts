export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  isActive: boolean;
}

export interface SessionInfo {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
