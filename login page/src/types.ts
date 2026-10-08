export type UserRole = 'admin' | 'superadmin' | 'employee' | 'vendor';

export interface AuthState {
  role: UserRole;
  step: 'credentials' | 'otp' | 'authenticator' | 'success';
  identifier?: string; // email or vendor code
}

export interface User {
  email: string;
  name: string;
  role: UserRole;
}
