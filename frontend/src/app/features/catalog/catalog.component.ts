import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Course } from '../../core/models/lms.models';
import { CourseService, CourseSummary } from '../../core/services/course.service';
import { resolveMediaUrl } from '../../core/config/api.config';

/** Maps category name → CSS gradient class for the card thumbnail. */
const THUMB_BY_CATEGORY: Record<string, string> = {
  Development: 'grad-blue', Design: 'grad-pink', 'Data Science': 'grad-purple',
  Cloud: 'grad-cyan', Marketing: 'grad-green', Mobile: 'grad-amber',
};
const initialFor = (name: string) => (name?.trim()?.[0]?.toUpperCase() ?? '?');

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule, MatButtonModule],
  template: `
  <div class="catalog-wrap">

    <!-- ── Header ── -->
    <div class="cat-hero afd">
      <div class="blob b1"></div>
      <div class="blob b2"></div>
      <div class="ch-content">
        <span class="lms-badge purple">✦ {{ courses().length }} courses available</span>
        <h1 class="ch-title">Discover your <span class="gradient-text">next skill</span></h1>
        <p class="ch-sub">Browse expert-led courses across development, design, data and more.</p>

        <div class="search-bar">
          <mat-icon>search</mat-icon>
          <input
            type="text"
            placeholder="Search courses, topics, instructors..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch($event)"
            maxlength="100"
            autocomplete="off"
          >
          <button class="search-btn" (click)="onSearch(searchTerm())">
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Filters ── -->
    <div class="filters afu d2">
      <div class="filter-tabs">
        @for (cat of categories; track cat) {
          <button
            class="ftab"
            [class.active]="activeCategory() === cat"
            (click)="setCategory(cat)">
            {{ cat }}
          </button>
        }
      </div>
      <div class="filter-actions">
        <select class="filter-select" [(ngModel)]="sortBy" (ngModelChange)="onSort($event)">
          <option value="popular">Most popular</option>
          <option value="newest">Newest</option>
          <option value="rating">Top rated</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
        </select>
      </div>
    </div>

    <!-- ── Loading / error / results count ── -->
    @if (loading()) {
      <p class="results-count afi d3">Loading courses…</p>
    } @else if (error()) {
      <p class="results-count afi d3" style="color:var(--lms-red)">{{ error() }}</p>
    } @else {
      <p class="results-count afi d3">
        Showing <strong>{{ filteredCourses().length }}</strong> course{{ filteredCourses().length !== 1 ? 's' : '' }}
        @if (activeCategory() !== 'All') { <span>in <strong>{{ activeCategory() }}</strong></span> }
      </p>
    }

    <!-- ── Course grid ── -->
    <div class="course-grid">
      @for (c of filteredCourses(); track c.id; let i = $index) {
        <a class="course-card card-hover" [routerLink]="['/course', c.id]" [style.animation-delay.s]="i * 0.04">
          <div class="course-thumb" [class]="c.thumbnail">
            @if (c.imageUrl) {
              <img [src]="c.imageUrl" [alt]="c.title" loading="lazy" class="thumb-img">
            }
            <div class="thumb-overlay">
              <div class="play-btn"><mat-icon>play_arrow</mat-icon></div>
            </div>
            @if (c.isBestseller) { <span class="thumb-badge amber">⭐ Bestseller</span> }
            @if (c.isNew) { <span class="thumb-badge green">✨ New</span> }
          </div>
          <div class="course-body">
            <div class="course-top">
              <span class="lms-badge" [class]="catColor(c.category)">{{ c.category }}</span>
              <span class="lms-badge" [class]="levelBadge(c.level)">{{ c.level }}</span>
            </div>
            <h3 class="course-title">{{ c.title }}</h3>
            <p class="course-sub">{{ c.subtitle }}</p>

            <div class="course-meta">
              <span class="stars">{{ starStr(c.rating) }}</span>
              <span class="meta-val">{{ c.rating }}</span>
              <span class="meta-muted">({{ c.reviewCount | number }})</span>
            </div>

            <div class="course-stats">
              <span><mat-icon>schedule</mat-icon>{{ c.duration }}</span>
              <span><mat-icon>play_lesson</mat-icon>{{ c.lessonCount }} lessons</span>
              <span><mat-icon>group</mat-icon>{{ formatNum(c.studentCount) }}</span>
            </div>

            <div class="course-footer">
              <div class="instructor-row">
                <div class="instr-av">{{ c.instructorAvatar }}</div>
                <span class="instr-name">{{ c.instructor }}</span>
              </div>
              <span class="course-price">\${{ c.price }}</span>
            </div>
          </div>
        </a>
      } @empty {
        <div class="empty-state">
          <mat-icon>search_off</mat-icon>
          <p>No courses match your search.</p>
        </div>
      }
    </div>

  </div>
  `,
  styles: [`
    .catalog-wrap { padding: 0 40px 60px; max-width:1300px; margin:0 auto; }

    /* ── Hero ── */
    .cat-hero {
      position:relative; border-radius:var(--lms-radius);
      background: var(--lms-surface);
      border: 1px solid var(--lms-border);
      padding: 56px 56px; margin: 32px 0 32px;
      overflow: hidden; text-align:center;
    }
    .blob {
      &.b1 { width:380px; height:380px; background:rgba(124,58,237,0.18); top:-80px; left:-80px; animation: floatBlob 14s ease-in-out infinite; }
      &.b2 { width:300px; height:300px; background:rgba(59,130,246,0.16); bottom:-80px; right:-60px; animation: floatBlob 16s ease-in-out infinite reverse; }
    }
    .ch-content { position:relative; z-index:1; max-width:680px; margin:0 auto; }
    .ch-title { font-size:40px; font-weight:900; margin:18px 0 10px; letter-spacing:-.8px; }
    .ch-sub   { font-size:15px; color:var(--lms-text-2); margin:0 0 32px; }

    /* Search bar */
    .search-bar {
      display:flex; align-items:center;
      background:var(--lms-surface-2); border:1px solid var(--lms-border);
      border-radius:99px; padding:6px 6px 6px 20px;
      transition: border-color .2s, box-shadow .2s;
      &:focus-within {
        border-color:var(--lms-purple);
        box-shadow: 0 0 0 4px rgba(124,58,237,0.15);
      }
      mat-icon { color:var(--lms-text-2); margin-right:8px; }
      input {
        flex:1; background:transparent; border:none; outline:none;
        font-size:14px; color:var(--lms-text); padding:10px 0;
        &::placeholder { color:var(--lms-text-muted); }
      }
    }
    .search-btn {
      width:42px; height:42px; border-radius:99px;
      background:var(--lms-gradient); border:none; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      transition:transform .15s;
      mat-icon { color:#fff; font-size:20px; width:20px; height:20px; }
      &:hover { transform:scale(1.05); }
    }

    /* ── Filters ── */
    .filters {
      display:flex; justify-content:space-between; align-items:center;
      margin-bottom:18px; gap:16px; flex-wrap:wrap;
    }
    .filter-tabs { display:flex; gap:6px; flex-wrap:wrap; }
    .ftab {
      padding:8px 18px; border-radius:99px; border:none;
      background:transparent; color:var(--lms-text-2);
      font-size:13px; font-weight:600; cursor:pointer;
      transition:all .2s;
      &:hover { color:var(--lms-text); background:var(--lms-surface-2); }
      &.active { background:var(--lms-gradient); color:#fff; box-shadow:var(--lms-shadow-purple); }
    }
    .filter-select {
      padding:9px 14px; border-radius:var(--lms-radius-sm);
      background:var(--lms-surface); border:1px solid var(--lms-border);
      color:var(--lms-text); font-size:13px; cursor:pointer;
      &:focus { outline:none; border-color:var(--lms-purple); }
    }

    .results-count {
      font-size:13px; color:var(--lms-text-2); margin:0 0 20px;
      strong { color:var(--lms-text); }
    }

    /* ── Course grid ── */
    .course-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
    .course-card {
      display:flex; flex-direction:column; border-radius:var(--lms-radius);
      background:var(--lms-surface); border:1px solid var(--lms-border);
      text-decoration:none; overflow:hidden; position:relative;
      animation: fadeInUp .45s cubic-bezier(.16,1,.3,1) both;
    }
    .course-thumb {
      height:170px; position:relative;
      display:flex; align-items:flex-start; justify-content:flex-end; padding:12px;
      overflow:hidden;
    }
    .thumb-overlay {
      position:absolute; inset:0;
      background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6));
      display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .25s;
    }
    .course-card:hover .thumb-overlay { opacity:1; }
    .play-btn {
      width:56px; height:56px; border-radius:99px;
      background:rgba(255,255,255,0.95); backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      transform:scale(.8); transition: transform .3s;
      mat-icon { color:#0A0A14; font-size:28px; width:28px; height:28px; }
    }
    .course-card:hover .play-btn { transform:scale(1); }
    .thumb-badge {
      position:relative; z-index:1;
      padding:4px 11px; border-radius:6px; font-size:11px; font-weight:700; letter-spacing:.3px;
      &.amber { background:#92400E; color:#FDE68A; }
      &.green { background:#065F46; color:#6EE7B7; }
    }
    .course-body { padding:18px; flex:1; display:flex; flex-direction:column; gap:9px; }
    .course-top  { display:flex; gap:6px; flex-wrap:wrap; }
    .course-title { font-size:15px; font-weight:700; margin:0; line-height:1.35; }
    .course-sub   { font-size:12.5px; color:var(--lms-text-2); margin:0; line-height:1.45;
                    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .course-meta  { display:flex; align-items:center; gap:5px; }
    .meta-val     { font-size:13px; font-weight:700; color:var(--lms-amber); }
    .meta-muted   { font-size:12px; color:var(--lms-text-muted); }
    .course-stats {
      display:flex; gap:14px; color:var(--lms-text-muted); font-size:12px;
      padding:8px 0; border-top:1px solid var(--lms-border); border-bottom:1px solid var(--lms-border);
      span { display:flex; align-items:center; gap:4px; }
      mat-icon { font-size:14px; width:14px; height:14px; }
    }
    .course-footer { display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
    .instructor-row { display:flex; align-items:center; gap:7px; }
    .instr-av   { width:24px; height:24px; border-radius:99px; background:var(--lms-gradient);
                  color:#fff; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
    .instr-name { font-size:12px; color:var(--lms-text-2); }
    .course-price { font-size:18px; font-weight:900; color:var(--lms-text); }

    /* ── Thumbnails ── */
    .grad-blue   { background: linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%); }
    .grad-pink   { background: linear-gradient(135deg,#831843 0%,#ec4899 100%); }
    .grad-purple { background: linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%); }
    .grad-amber  { background: linear-gradient(135deg,#78350f 0%,#f59e0b 100%); }
    .grad-cyan   { background: linear-gradient(135deg,#164e63 0%,#06b6d4 100%); }
    .grad-green  { background: linear-gradient(135deg,#064e3b 0%,#10b981 100%); }

    @media (max-width: 900px) {
      .course-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class CatalogComponent implements OnInit {
  private readonly api = inject(CourseService);
  private readonly route = inject(ActivatedRoute);

  readonly categories = ['All', 'Development', 'Design', 'Data Science', 'Cloud', 'Marketing', 'Mobile'];

  loading = signal(true);
  error   = signal<string | null>(null);
  apiCourses = signal<CourseSummary[]>([]);

  searchTerm = signal('');
  activeCategory = signal('All');
  sortBy = 'popular';

  /** Convert API summaries to the shape the existing template expects. */
  courses = computed<Course[]>(() => this.apiCourses().map(c => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    instructor: c.instructorName,
    instructorAvatar: c.instructorAvatar || initialFor(c.instructorName),
    thumbnail: c.thumbnailGradient || THUMB_BY_CATEGORY[c.category] || 'grad-purple',
    imageUrl: resolveMediaUrl(c.imageUrl),
    category: c.category,
    level: c.level,
    rating: c.rating,
    reviewCount: c.reviewCount,
    studentCount: c.studentCount,
    duration: c.duration,
    lessonCount: c.lessonCount,
    price: c.price,
    isBestseller: c.isBestseller,
    isNew: c.isNew,
    tags: [],
  })));

  filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const cat = this.activeCategory();
    const filtered = this.courses().filter(c => {
      const matchesCat = cat === 'All' || c.category === cat;
      const matchesTerm = !term ||
        c.title.toLowerCase().includes(term) ||
        c.instructor.toLowerCase().includes(term) ||
        c.subtitle.toLowerCase().includes(term);
      return matchesCat && matchesTerm;
    });

    const list = [...filtered];
    switch (this.sortBy) {
      case 'newest':     return list.reverse();                                                    // backend returns newest-last for variety
      case 'rating':     return list.sort((a, b) => b.rating - a.rating);
      case 'price-low':  return list.sort((a, b) => a.price - b.price);
      case 'price-high': return list.sort((a, b) => b.price - a.price);
      case 'popular':
      default:           return list.sort((a, b) => b.studentCount - a.studentCount);
    }
  });

  ngOnInit(): void {
    // Pick up search from query params (?q=foo)
    this.route.queryParamMap.subscribe(p => {
      const q = p.get('q');
      if (q) this.searchTerm.set(q);
    });
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ pageSize: 50 }).subscribe({
      next: items => { this.apiCourses.set(items); this.loading.set(false); },
      error: (err: Error) => { this.error.set(err.message ?? 'Failed to load courses'); this.loading.set(false); },
    });
  }

  onSearch(value: string) { this.searchTerm.set(value); }
  setCategory(cat: string) { this.activeCategory.set(cat); }
  onSort(value: string) { this.sortBy = value; }

  starStr(r: number): string { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
  levelBadge(l: string): string { return l === 'Beginner' ? 'green' : l === 'Intermediate' ? 'amber' : 'red'; }
  catColor(c: string): string {
    const m: Record<string, string> = { Development:'blue', Design:'pink', 'Data Science':'purple', Cloud:'cyan', Marketing:'green', Mobile:'amber' };
    return m[c] ?? 'purple';
  }
  formatNum(n: number): string { return n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'') + 'k' : String(n); }
}
