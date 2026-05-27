import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, NgApexchartsModule],
  template: `
  <div class="ad-wrap">

    <!-- ── Header ── -->
    <div class="ad-header afd">
      <div>
        <h1 class="ad-h1">Admin Panel</h1>
        <p class="ad-sub">Platform-wide analytics and management</p>
      </div>
      <div class="ad-period">
        @for (p of periods; track p) {
          <button class="ap-btn" [class.active]="period === p" (click)="period = p">{{ p }}</button>
        }
      </div>
    </div>

    <!-- ── Top KPIs ── -->
    <div class="kpi-grid afu d2">
      @for (k of kpis; track k.label; let i = $index) {
        <div class="kpi-3d asi" [style.animation-delay.s]="i * 0.06">
          <div class="k3-bg" [style.background]="k.gradient"></div>
          <div class="k3-content">
            <mat-icon class="k3-icon">{{ k.icon }}</mat-icon>
            <div class="k3-val">{{ k.value }}</div>
            <div class="k3-label">{{ k.label }}</div>
            <div class="k3-change" [class.pos]="k.positive" [class.neg]="!k.positive">
              <mat-icon>{{ k.positive ? 'trending_up' : 'trending_down' }}</mat-icon>{{ k.change }}
            </div>
          </div>
        </div>
      }
    </div>

    <!-- ── Charts ── -->
    <div class="ad-charts afu d4">
      <div class="chart-card glass-card large">
        <div class="ch-head">
          <h3>Platform Growth</h3>
          <div class="ch-legend">
            <span><i style="background:#7C3AED"></i>Users</span>
            <span><i style="background:#3B82F6"></i>Enrollments</span>
            <span><i style="background:#10B981"></i>Revenue</span>
          </div>
        </div>
        <apx-chart
          [series]="growthSeries"
          [chart]="{ type:'area', height:280, toolbar:{show:false}, background:'transparent' }"
          [colors]="['#7C3AED','#3B82F6','#10B981']"
          [fill]="{ type:'gradient', gradient:{ shadeIntensity:1, opacityFrom:.35, opacityTo:.02, stops:[0,100] } }"
          [stroke]="{ curve:'smooth', width:2.5 }"
          [xaxis]="{ categories:growthMonths, labels:{style:{colors:'#555'}}, axisBorder:{show:false}, axisTicks:{show:false} }"
          [yaxis]="{ labels:{style:{colors:'#555'}} }"
          [grid]="{ borderColor:'rgba(255,255,255,0.04)', strokeDashArray:4 }"
          [dataLabels]="{ enabled:false }"
          [legend]="{ show:false }"
          [theme]="{ mode:'dark' }"
          [tooltip]="{ theme:'dark' }">
        </apx-chart>
      </div>

      <div class="chart-card glass-card">
        <div class="ch-head"><h3>Top Categories</h3></div>
        <apx-chart
          [series]="categoryShares"
          [chart]="{ type:'donut', height:280, background:'transparent' }"
          [labels]="categoryLabels"
          [colors]="['#7C3AED','#3B82F6','#EC4899','#F59E0B','#10B981','#06B6D4']"
          [stroke]="{ width:0 }"
          [legend]="{ position:'bottom', labels:{colors:'#9090B0'}, fontSize:'12px' }"
          [dataLabels]="{ enabled:false }"
          [plotOptions]="{ pie:{ donut:{ size:'72%', labels:{ show:true, total:{ show:true, label:'Total Courses', color:'#A0A0C0', fontSize:'12px', formatter:formatTotal } } } } }"
          [theme]="{ mode:'dark' }">
        </apx-chart>
      </div>
    </div>

    <!-- ── Users + Activity ── -->
    <div class="ad-section afu d6">
      <div class="users-card glass-card">
        <div class="uc-head">
          <h3>Recent Users</h3>
          <button class="uc-action"><mat-icon>filter_list</mat-icon> Filter</button>
        </div>
        <div class="users-table">
          <div class="ut-head">
            <span style="flex:2">User</span>
            <span style="flex:1.5">Email</span>
            <span style="flex:1">Role</span>
            <span style="flex:1">Joined</span>
            <span style="flex:1">Status</span>
            <span style="flex:0.5"></span>
          </div>
          @for (u of users; track u.id; let i = $index) {
            <div class="ut-row afu" [style.animation-delay.s]="i * 0.04">
              <div class="ut-user" style="flex:2">
                <div class="ut-av">{{ u.avatar }}</div>
                <div>
                  <p class="ut-name">{{ u.name }}</p>
                  <p class="ut-id">#{{ u.id }}</p>
                </div>
              </div>
              <div class="ut-cell" style="flex:1.5">{{ u.email }}</div>
              <div style="flex:1">
                <span class="lms-badge" [class]="u.role === 'Admin' ? 'red' : u.role === 'Instructor' ? 'amber' : 'blue'">{{ u.role }}</span>
              </div>
              <div class="ut-cell" style="flex:1">{{ u.joined }}</div>
              <div style="flex:1">
                <span class="status-pill" [class]="u.status">
                  <span class="dot"></span>{{ u.status }}
                </span>
              </div>
              <div style="flex:0.5; display:flex; gap:4px; justify-content:flex-end;">
                <button class="row-btn" matTooltip="View"><mat-icon>visibility</mat-icon></button>
                <button class="row-btn" matTooltip="More"><mat-icon>more_horiz</mat-icon></button>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="activity-card glass-card">
        <div class="ac-head">
          <h3>System Activity</h3>
          <span class="live-pill"><span class="live-dot"></span>Live</span>
        </div>
        <div class="activity-feed">
          @for (a of activities; track a.id) {
            <div class="af-item">
              <div class="af-icon" [class]="a.type">
                <mat-icon>{{ a.icon }}</mat-icon>
              </div>
              <div class="af-body">
                <p class="af-msg"><strong>{{ a.user }}</strong> {{ a.action }}</p>
                <p class="af-time">{{ a.time }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

  </div>
  `,
  styles: [`
    .ad-wrap { max-width:1300px; margin:0 auto; padding:32px 40px 60px; }

    /* ── Header ── */
    .ad-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:28px; flex-wrap:wrap; gap:16px; }
    .ad-h1   { font-size:30px; font-weight:900; margin:0 0 6px; letter-spacing:-.6px; }
    .ad-sub  { font-size:14px; color:var(--lms-text-2); margin:0; }
    .ad-period {
      display:flex; gap:2px; background:var(--lms-surface); border:1px solid var(--lms-border);
      border-radius:var(--lms-radius-sm); padding:4px;
    }
    .ap-btn {
      padding:7px 16px; background:none; border:none; cursor:pointer;
      font-size:12.5px; font-weight:600; color:var(--lms-text-2);
      border-radius:var(--lms-radius-xs); transition:all .15s;
      &:hover { color:var(--lms-text); }
      &.active { background:var(--lms-gradient); color:#fff; box-shadow:var(--lms-shadow-purple); }
    }

    /* ── 3D KPI cards ── */
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
    .kpi-3d {
      position:relative; border-radius:var(--lms-radius);
      overflow:hidden; padding:24px; min-height:160px;
      border:1px solid var(--lms-border); background:var(--lms-surface);
      transform-style:preserve-3d;
      transition: transform .4s cubic-bezier(.16,1,.3,1), box-shadow .25s, border-color .2s;
      &:hover {
        transform: perspective(1000px) rotateX(4deg) rotateY(-3deg) translateY(-6px);
        box-shadow: 0 30px 60px rgba(0,0,0,0.4);
        border-color: var(--lms-border-hover);
      }
    }
    .k3-bg {
      position:absolute; inset:0; opacity:.12;
      transition:opacity .3s;
    }
    .kpi-3d:hover .k3-bg { opacity:.22; }
    .k3-content { position:relative; z-index:1; }
    .k3-icon { font-size:28px; width:28px; height:28px; color:#fff; margin-bottom:14px;
      filter: drop-shadow(0 4px 12px rgba(255,255,255,0.3));
    }
    .k3-val   { font-size:34px; font-weight:900; letter-spacing:-1.2px; line-height:1; color:#fff;
                text-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .k3-label { font-size:12px; color:rgba(255,255,255,0.75); margin-top:6px; }
    .k3-change {
      display:inline-flex; align-items:center; gap:2px; margin-top:14px;
      font-size:12px; font-weight:700; padding:3px 9px; border-radius:6px;
      background:rgba(0,0,0,0.3); backdrop-filter:blur(8px);
      mat-icon { font-size:13px; width:13px; height:13px; }
      &.pos { color:#6EE7B7; }
      &.neg { color:#FCA5A5; }
    }

    /* ── Charts ── */
    .ad-charts { display:grid; grid-template-columns:1.7fr 1fr; gap:16px; margin-bottom:28px; }
    .chart-card { padding:20px; }
    .ch-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;
      h3 { font-size:16px; font-weight:800; margin:0; }
    }
    .ch-legend { display:flex; gap:14px; font-size:12px; color:var(--lms-text-2);
      span { display:inline-flex; align-items:center; gap:5px; }
      i { width:8px; height:8px; border-radius:99px; }
    }

    /* ── Section ── */
    .ad-section { display:grid; grid-template-columns:1.6fr 1fr; gap:16px; }
    .users-card, .activity-card { padding:20px; }
    .uc-head, .ac-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;
      h3 { font-size:16px; font-weight:800; margin:0; }
    }
    .uc-action {
      display:inline-flex; align-items:center; gap:6px;
      padding:7px 14px; border-radius:var(--lms-radius-sm); border:1px solid var(--lms-border);
      background:var(--lms-surface-2); color:var(--lms-text-2);
      font-size:12.5px; font-weight:600; cursor:pointer;
      transition:all .15s;
      mat-icon { font-size:15px; width:15px; height:15px; }
      &:hover { border-color:var(--lms-border-hover); color:var(--lms-text); }
    }
    .live-pill {
      display:inline-flex; align-items:center; gap:5px;
      padding:3px 10px; border-radius:99px;
      background:var(--lms-red-dim); color:var(--lms-red);
      font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px;
      .live-dot { width:6px; height:6px; border-radius:99px; background:var(--lms-red); animation: pulse 1.5s ease-in-out infinite; }
    }

    /* Users table */
    .users-table { background:var(--lms-bg); border:1px solid var(--lms-border); border-radius:var(--lms-radius-sm); overflow:hidden; }
    .ut-head, .ut-row { display:flex; align-items:center; gap:14px; padding:12px 16px; }
    .ut-head {
      background:var(--lms-surface-2); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px;
      color:var(--lms-text-muted); border-bottom:1px solid var(--lms-border);
    }
    .ut-row {
      border-bottom:1px solid var(--lms-border); font-size:13px; transition:background .15s;
      &:hover { background:var(--lms-surface-2); }
      &:last-child { border-bottom:none; }
    }
    .ut-user { display:flex; align-items:center; gap:10px; }
    .ut-av {
      width:34px; height:34px; border-radius:99px;
      background:var(--lms-gradient); color:#fff;
      font-size:12px; font-weight:700;
      display:flex; align-items:center; justify-content:center;
    }
    .ut-name { font-size:13px; font-weight:700; margin:0; color:var(--lms-text); }
    .ut-id   { font-size:11px; color:var(--lms-text-muted); margin:1px 0 0; }
    .ut-cell { color:var(--lms-text-2); }
    .status-pill {
      display:inline-flex; align-items:center; gap:5px;
      font-size:12px; font-weight:600;
      .dot { width:6px; height:6px; border-radius:99px; background:currentColor; }
      &.Active   { color:var(--lms-green); }
      &.Inactive { color:var(--lms-text-muted); }
    }
    .row-btn {
      width:30px; height:30px; border-radius:8px; border:none; cursor:pointer;
      background:transparent; color:var(--lms-text-2);
      display:flex; align-items:center; justify-content:center;
      transition:all .15s;
      mat-icon { font-size:16px; width:16px; height:16px; }
      &:hover { background:var(--lms-surface-3); color:var(--lms-purple-2); }
    }

    /* Activity feed */
    .activity-feed { display:flex; flex-direction:column; gap:14px; max-height:480px; overflow-y:auto; }
    .af-item { display:flex; gap:12px; padding-bottom:14px; border-bottom:1px solid var(--lms-border);
      &:last-child { border-bottom:none; padding-bottom:0; }
    }
    .af-icon {
      width:36px; height:36px; border-radius:10px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &.enroll { background:var(--lms-purple-dim); mat-icon { color:var(--lms-purple-2); } }
      &.review { background:var(--lms-amber-dim); mat-icon { color:var(--lms-amber); } }
      &.signup { background:var(--lms-blue-dim);  mat-icon { color:var(--lms-blue); } }
      &.payment { background:var(--lms-green-dim); mat-icon { color:var(--lms-green); } }
      &.alert  { background:var(--lms-red-dim);   mat-icon { color:var(--lms-red); } }
    }
    .af-body { flex:1; min-width:0; }
    .af-msg  { font-size:13px; margin:0; color:var(--lms-text-2); line-height:1.5;
      strong { color:var(--lms-text); }
    }
    .af-time { font-size:11px; color:var(--lms-text-muted); margin:3px 0 0; }
  `]
})
export class AdminComponent {
  periods = ['7d', '30d', '90d', '1y'];
  period = '30d';

  kpis = [
    { label:'Total Users',   value:'142,853', change:'+8.4%', positive:true,  icon:'group',     gradient:'linear-gradient(135deg,#7C3AED,#3B82F6)' },
    { label:'Active Courses',value:'1,284',   change:'+12',   positive:true,  icon:'menu_book', gradient:'linear-gradient(135deg,#EC4899,#F87171)' },
    { label:'Revenue (MTD)', value:'$284k',   change:'+18.2%',positive:true,  icon:'paid',      gradient:'linear-gradient(135deg,#10B981,#06B6D4)' },
    { label:'Churn Rate',    value:'2.3%',    change:'-0.4%', positive:true,  icon:'trending_down', gradient:'linear-gradient(135deg,#F59E0B,#EF4444)' },
  ];

  growthMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
  growthSeries = [
    { name:'Users',       data:[12000, 15800, 19200, 24800, 31000, 38500, 47200, 56000] },
    { name:'Enrollments', data:[8400, 12100, 15600, 21300, 27800, 34200, 41800, 50100] },
    { name:'Revenue ($k)',data:[42, 68, 91, 124, 165, 218, 252, 284] },
  ];

  categoryLabels = ['Development','Design','Data Science','Cloud','Marketing','Mobile'];
  categoryShares = [482, 311, 285, 148, 142, 96];

  users = [
    { id:'8421', avatar:'M', name:'Marcus T.',  email:'marcus@example.com',  role:'Student',    joined:'2 days ago',   status:'Active' },
    { id:'8420', avatar:'S', name:'Sarah Chen', email:'sarah@eduflow.com',   role:'Instructor', joined:'1 week ago',   status:'Active' },
    { id:'8419', avatar:'D', name:'David K.',   email:'david.k@gmail.com',   role:'Student',    joined:'2 weeks ago',  status:'Active' },
    { id:'8418', avatar:'A', name:'Alex Kim',   email:'alex.kim@eduflow.com',role:'Instructor', joined:'3 weeks ago',  status:'Active' },
    { id:'8417', avatar:'J', name:'Jamie R.',   email:'jamie@example.com',   role:'Student',    joined:'1 month ago',  status:'Inactive' },
    { id:'8416', avatar:'P', name:'Priya S.',   email:'priya@example.com',   role:'Student',    joined:'1 month ago',  status:'Active' },
    { id:'8415', avatar:'R', name:'Ryan Cooper',email:'ryan@eduflow.com',    role:'Admin',      joined:'2 months ago', status:'Active' },
  ];

  activities = [
    { id:'1', type:'enroll',  icon:'school',       user:'Marcus T.',  action:'enrolled in Complete Web Dev Bootcamp', time:'2 min ago' },
    { id:'2', type:'review',  icon:'star',         user:'Priya S.',   action:'left a 5-star review',                   time:'14 min ago' },
    { id:'3', type:'signup',  icon:'person_add',   user:'New user',   action:'signed up from US',                      time:'27 min ago' },
    { id:'4', type:'payment', icon:'paid',         user:'David K.',   action:'completed payment of $89',               time:'42 min ago' },
    { id:'5', type:'enroll',  icon:'school',       user:'Anna L.',    action:'enrolled in React & TypeScript',         time:'1 hour ago' },
    { id:'6', type:'alert',   icon:'warning',      user:'System',     action:'detected high load on server-3',         time:'2 hours ago' },
    { id:'7', type:'review',  icon:'star',         user:'Jamal R.',   action:'left a 4-star review',                   time:'3 hours ago' },
    { id:'8', type:'payment', icon:'paid',         user:'Anna L.',    action:'completed payment of $94',               time:'4 hours ago' },
  ];

  formatTotal = (): string => '1,284';
}
