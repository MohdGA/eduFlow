export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Student' | 'Instructor' | 'Admin';
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: UserDto;
}

export interface LoginRequest    { email: string; password: string; }
export interface RegisterRequest {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
}

export interface ApiError { code: string; message: string; }
