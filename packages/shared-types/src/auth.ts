import { SystemRole } from './enums';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  employee: AuthEmployee;
}

export interface AuthEmployee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: SystemRole;
  tenantId: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface SetPasswordRequest {
  token: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  systemRole: SystemRole;
  tenantId: string;
}
