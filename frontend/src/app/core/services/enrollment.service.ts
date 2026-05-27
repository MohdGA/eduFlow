import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Enrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  enrolledAt: string;
  completedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);

  myEnrollments(): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${API_BASE_URL}/Enrollments/my`);
  }

  updateProgress(enrollmentId: string, percent: number): Observable<unknown> {
    return this.http.patch(`${API_BASE_URL}/Enrollments/${enrollmentId}/progress`, percent, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
