import { HttpClient, HttpEvent, HttpParams, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface CourseSummary {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  instructorName: string;
  instructorAvatar: string;
  lessonCount: number;
  duration: string;
  rating: number;
  reviewCount: number;
  studentCount: number;
  isBestseller: boolean;
  isNew: boolean;
  thumbnailGradient: string;
  isPublished: boolean;
  imageUrl?: string | null;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  type: 'Video' | 'Reading' | 'Quiz';
  orderIndex: number;
  description: string;
  videoUrl?: string | null;
}
export interface CourseSection {
  id: string;
  title: string;
  orderIndex: number;
  lessons: CourseLesson[];
}
export interface CourseDetail {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  instructorName: string;
  instructorTitle: string;
  instructorBio: string;
  instructorAvatar: string;
  duration: string;
  rating: number;
  reviewCount: number;
  studentCount: number;
  isBestseller: boolean;
  isNew: boolean;
  thumbnailGradient: string;
  isPublished: boolean;
  imageUrl?: string | null;
  sections: CourseSection[];
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);

  list(opts: { category?: string; search?: string; page?: number; pageSize?: number } = {}): Observable<CourseSummary[]> {
    let params = new HttpParams();
    if (opts.category) params = params.set('category', opts.category);
    if (opts.search)   params = params.set('search',   opts.search);
    if (opts.page)     params = params.set('page',     String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));
    return this.http.get<CourseSummary[]>(`${API_BASE_URL}/Courses`, { params });
  }

  get(id: string): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(`${API_BASE_URL}/Courses/${id}`);
  }

  enroll(id: string): Observable<unknown> {
    return this.http.post(`${API_BASE_URL}/Courses/${id}/enroll`, {});
  }

  create(payload: CourseFormPayload): Observable<CourseSummary> {
    return this.http.post<CourseSummary>(`${API_BASE_URL}/Courses`, payload);
  }

  update(id: string, payload: CourseFormPayload): Observable<CourseSummary> {
    return this.http.patch<CourseSummary>(`${API_BASE_URL}/Courses/${id}`, payload);
  }

  togglePublish(id: string): Observable<CourseSummary> {
    return this.http.patch<CourseSummary>(`${API_BASE_URL}/Courses/${id}/publish`, {});
  }

  /** Upload a thumbnail image for a course. Image goes to /media/courses/<id>.<ext>. */
  uploadThumbnail(courseId: string, file: File): Observable<CourseSummary> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<CourseSummary>(`${API_BASE_URL}/Courses/${courseId}/thumbnail`, fd);
  }

  // ── Curriculum (sections + lessons) ──────────────────────────────────────
  createSection(courseId: string, title: string): Observable<CourseSection> {
    return this.http.post<CourseSection>(`${API_BASE_URL}/Courses/${courseId}/curriculum/sections`, { title });
  }
  updateSection(courseId: string, sectionId: string, title: string, orderIndex?: number): Observable<CourseSection> {
    return this.http.patch<CourseSection>(
      `${API_BASE_URL}/Courses/${courseId}/curriculum/sections/${sectionId}`,
      { title, orderIndex });
  }
  deleteSection(courseId: string, sectionId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/Courses/${courseId}/curriculum/sections/${sectionId}`);
  }

  createLesson(courseId: string, sectionId: string, payload: LessonFormPayload): Observable<CourseLesson> {
    return this.http.post<CourseLesson>(
      `${API_BASE_URL}/Courses/${courseId}/curriculum/sections/${sectionId}/lessons`, payload);
  }
  updateLesson(courseId: string, sectionId: string, lessonId: string, payload: LessonFormPayload): Observable<CourseLesson> {
    return this.http.patch<CourseLesson>(
      `${API_BASE_URL}/Courses/${courseId}/curriculum/sections/${sectionId}/lessons/${lessonId}`, payload);
  }
  deleteLesson(courseId: string, sectionId: string, lessonId: string): Observable<void> {
    return this.http.delete<void>(
      `${API_BASE_URL}/Courses/${courseId}/curriculum/sections/${sectionId}/lessons/${lessonId}`);
  }
  uploadLessonVideo(courseId: string, sectionId: string, lessonId: string, file: File): Observable<CourseLesson> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<CourseLesson>(
      `${API_BASE_URL}/Courses/${courseId}/curriculum/sections/${sectionId}/lessons/${lessonId}/video`,
      fd);
  }

  /** Upload a lesson video with progress events (HttpEventType.UploadProgress / Response). */
  uploadLessonVideoWithProgress(courseId: string, sectionId: string, lessonId: string, file: File): Observable<HttpEvent<CourseLesson>> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const req = new HttpRequest(
      'POST',
      `${API_BASE_URL}/Courses/${courseId}/curriculum/sections/${sectionId}/lessons/${lessonId}/video`,
      fd,
      { reportProgress: true });
    return this.http.request<CourseLesson>(req);
  }
}

export interface LessonFormPayload {
  title: string;
  duration?: string;
  type: 'Video' | 'Reading' | 'Quiz';
  description?: string;
  videoUrl?: string | null;
}

export interface CourseFormPayload {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  duration?: string;
  thumbnailGradient?: string;
  imageUrl?: string | null;
}
