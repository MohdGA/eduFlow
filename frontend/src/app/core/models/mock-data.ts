import { Course, Section, Instructor, Review } from './lms.models';

export const COURSES: Course[] = [
  { id:'1', title:'Complete Web Dev Bootcamp', subtitle:'HTML, CSS, JS, React, Node — zero to hero', instructor:'Sarah Chen', instructorAvatar:'S', thumbnail:'grad-blue', imageUrl:'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80', category:'Development', level:'Beginner', rating:4.8, reviewCount:12400, studentCount:84300, duration:'52h', lessonCount:312, price:89, isBestseller:true, tags:['HTML','CSS','JavaScript','React'] },
  { id:'2', title:'UI/UX Design Masterclass', subtitle:'Figma, design systems, user research & prototyping', instructor:'Alex Kim', instructorAvatar:'A', thumbnail:'grad-pink', imageUrl:'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=80', category:'Design', level:'Intermediate', rating:4.9, reviewCount:8700, studentCount:42100, duration:'38h', lessonCount:224, price:99, isBestseller:true, tags:['Figma','UX','Design Systems'] },
  { id:'3', title:'Python for Data Science', subtitle:'NumPy, Pandas, Matplotlib, Scikit-learn & ML', instructor:'Dr. James Liu', instructorAvatar:'J', thumbnail:'grad-purple', imageUrl:'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', category:'Data Science', level:'Intermediate', rating:4.7, reviewCount:19800, studentCount:131000, duration:'44h', lessonCount:278, price:79, tags:['Python','Pandas','ML'] },
  { id:'4', title:'AWS Cloud Practitioner', subtitle:'Core AWS services, architecture & certification prep', instructor:'Maria Santos', instructorAvatar:'M', thumbnail:'grad-amber', imageUrl:'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', category:'Cloud', level:'Beginner', rating:4.6, reviewCount:5400, studentCount:29700, duration:'28h', lessonCount:165, price:69, isNew:true, tags:['AWS','Cloud','DevOps'] },
  { id:'5', title:'React & TypeScript Advanced', subtitle:'Hooks, state management, testing & performance', instructor:'Tom Walsh', instructorAvatar:'T', thumbnail:'grad-cyan', imageUrl:'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80', category:'Development', level:'Advanced', rating:4.8, reviewCount:6200, studentCount:21500, duration:'31h', lessonCount:198, price:94, tags:['React','TypeScript','Testing'] },
  { id:'6', title:'Digital Marketing Strategy', subtitle:'SEO, paid ads, social media & analytics', instructor:'Lisa Park', instructorAvatar:'L', thumbnail:'grad-green', imageUrl:'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', category:'Marketing', level:'Beginner', rating:4.5, reviewCount:9100, studentCount:67000, duration:'22h', lessonCount:143, price:59, isBestseller:true, tags:['SEO','Google Ads','Social Media'] },
  { id:'7', title:'Machine Learning A-Z', subtitle:'Supervised, unsupervised & deep learning models', instructor:'Dr. James Liu', instructorAvatar:'J', thumbnail:'grad-purple', imageUrl:'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80', category:'Data Science', level:'Advanced', rating:4.9, reviewCount:24500, studentCount:178000, duration:'64h', lessonCount:412, price:109, isBestseller:true, tags:['Python','TensorFlow','Deep Learning'] },
  { id:'8', title:'iOS Development with Swift', subtitle:'UIKit, SwiftUI, CoreData & App Store deployment', instructor:'Ryan Cooper', instructorAvatar:'R', thumbnail:'grad-blue', imageUrl:'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80', category:'Mobile', level:'Intermediate', rating:4.7, reviewCount:4300, studentCount:18900, duration:'35h', lessonCount:211, price:84, isNew:true, tags:['Swift','SwiftUI','iOS'] },
];

export const MY_COURSES: Course[] = [
  { ...COURSES[0], progress: 72, lastAccessed: '2 hours ago' },
  { ...COURSES[2], progress: 34, lastAccessed: 'Yesterday' },
  { ...COURSES[4], progress: 91, lastAccessed: '3 days ago' },
  { ...COURSES[1], progress: 15, lastAccessed: '1 week ago' },
];

export const COURSE_SECTIONS: Section[] = [
  { id:'s1', title:'Getting Started', lessons: [
    { id:'l1', title:'Welcome & Course Overview', duration:'5:20', type:'video', completed:true, locked:false, videoUrl:'https://media.w3.org/2010/05/sintel/trailer.mp4' },
    { id:'l2', title:'Setting Up Your Environment', duration:'12:45', type:'video', completed:true, locked:false, videoUrl:'https://media.w3.org/2010/05/bunny/trailer.mp4' },
    { id:'l3', title:'Understanding the Basics', duration:'8:30', type:'reading', completed:true, locked:false, videoUrl:'https://media.w3.org/2010/05/bunny/movie.mp4' },
  ]},
  { id:'s2', title:'Core Concepts', lessons: [
    { id:'l4', title:'Variables & Data Types', duration:'18:10', type:'video', completed:true, locked:false, videoUrl:'https://media.w3.org/2010/05/video/movie_300.mp4' },
    { id:'l5', title:'Control Flow & Loops', duration:'22:33', type:'video', completed:false, locked:false, videoUrl:'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id:'l6', title:'Functions Deep Dive', duration:'31:05', type:'video', completed:false, locked:false, videoUrl:'https://www.w3schools.com/html/movie.mp4' },
    { id:'l7', title:'Section Quiz', duration:'15 min', type:'quiz', completed:false, locked:false },
  ]},
  { id:'s3', title:'Advanced Patterns', lessons: [
    { id:'l8', title:'Design Patterns', duration:'28:44', type:'video', completed:false, locked:false, videoUrl:'https://media.w3.org/2010/05/sintel/trailer.mp4' },
    { id:'l9', title:'Performance Optimization', duration:'24:18', type:'video', completed:false, locked:false, videoUrl:'https://media.w3.org/2010/05/bunny/trailer.mp4' },
    { id:'l10', title:'Final Project', duration:'45 min', type:'quiz', completed:false, locked:false },
  ]},
];

export const INSTRUCTOR: Instructor = {
  id:'i1', name:'Sarah Chen', avatar:'S', title:'Senior Software Engineer & Educator',
  rating:4.8, students:84300, courses:12,
  bio:'Former Google engineer with 12+ years of experience. I\'ve helped over 84,000 students launch their careers in tech. My teaching style is practical, project-based, and fun.'
};

export const REVIEWS: Review[] = [
  { id:'r1', user:'Marcus T.', avatar:'M', rating:5, comment:'Absolutely the best course I\'ve taken. The projects are real-world and the explanations are crystal clear.', date:'2 days ago' },
  { id:'r2', user:'Priya S.', avatar:'P', rating:5, comment:'Got my first dev job 3 months after finishing this course. Worth every penny!', date:'1 week ago' },
  { id:'r3', user:'David K.', avatar:'D', rating:4, comment:'Great content overall. Some sections could be more concise but the depth is impressive.', date:'2 weeks ago' },
  { id:'r4', user:'Anna L.', avatar:'A', rating:5, comment:'Sarah explains complex topics so simply. I went from zero coding knowledge to building full apps.', date:'3 weeks ago' },
];
