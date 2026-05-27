import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  monthRevenue: number;
  newUsersLast30Days: number;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Student' | 'Instructor' | 'Admin';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminCourse {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  instructorName: string;
  enrollments: number;
  isPublished: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  detail: string;
  ipAddress: string | null;
  userName: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/Admin`;

  stats(): Observable<AdminStats> { return this.http.get<AdminStats>(`${this.base}/stats`); }

  listUsers(opts: { search?: string; role?: string } = {}): Observable<AdminUser[]> {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.role)   params = params.set('role',   opts.role);
    return this.http.get<AdminUser[]>(`${this.base}/users`, { params });
  }
  updateUserRole(id: string, role: AdminUser['role']): Observable<unknown> {
    return this.http.patch(`${this.base}/users/${id}/role`, { role });
  }
  updateUserStatus(id: string, isActive: boolean): Observable<unknown> {
    return this.http.patch(`${this.base}/users/${id}/status`, { isActive });
  }
  deleteUser(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/users/${id}`);
  }

  listCourses(opts: { search?: string; published?: boolean } = {}): Observable<AdminCourse[]> {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.published !== undefined) params = params.set('published', String(opts.published));
    return this.http.get<AdminCourse[]>(`${this.base}/courses`, { params });
  }
  setPublished(id: string, isPublished: boolean): Observable<unknown> {
    return this.http.patch(`${this.base}/courses/${id}/publish`, { isPublished });
  }
  deleteCourse(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/courses/${id}`);
  }

  audit(page = 1, pageSize = 50): Observable<AuditEntry[]> {
    let params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return this.http.get<AuditEntry[]>(`${this.base}/audit`, { params });
  }

  clearAudit(): Observable<unknown> {
    return this.http.delete(`${this.base}/audit`);
  }
}
