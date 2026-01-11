# Today's Command Center 🚀

A high-performance Task Tracking System optimized for ADHD. Built with Next.js, TypeScript, and Supabase.

![ADHD Task Tracker](https://img.shields.io/badge/ADHD-Optimized-10b981)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green)

## ✨ Features

### Task Organization
- **Must Do Now (Critical)** - Top priority tasks that need immediate attention
- **Quick Wins** - Tasks under 15 minutes to build momentum
- **Project Lists** - Tasks grouped by category (Sinjab, Ajdel, Personal, Haseeb, Raqeeb)

### Multi-Timer System
- Start/stop timer on any task with play/pause buttons
- Multiple simultaneous timers supported
- Time tracked in Supabase `time_logs` table
- Visual timer display next to each task

### Timeline View
- **Daily view** - Hour-by-hour breakdown
- **Weekly view** - Day-by-day breakdown
- **Monthly view** - Full month overview
- Horizontal bars showing when work occurred

### Voice Capture 🎤
- Floating voice button for quick task capture
- Speak naturally to add tasks
- Auto-categorizes as "Voice Input" with "Quick Win" priority

### Celebration Effects 🎉
- Confetti on task completion
- Special animation for Quick Wins

### Real-time Sync
- Supabase real-time subscriptions
- Auto-seeds 36 initial tasks on first load
- Works offline in local mode

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Set up database**
   
   Run the SQL schema in Supabase SQL Editor:
   ```bash
   # Schema located at: supabase/schema.sql
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   
   Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
HsnSZ/
├── app/
│   ├── globals.css      # Light mode styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main dashboard
├── components/
│   ├── ActiveTimers.tsx # Timer panel
│   ├── AddTaskForm.tsx  # Task creation
│   ├── CategoryBadge.tsx # Category labels
│   ├── ProgressBar.tsx  # Progress indicator
│   ├── TaskItem.tsx     # Task with timer
│   └── TimelineView.tsx # Gantt timeline
├── lib/
│   ├── hooks/
│   │   ├── useTaskStore.ts   # State & Supabase
│   │   └── useVoiceInput.ts  # Voice recognition
│   ├── supabase/
│   │   ├── client.ts    # Supabase client
│   │   └── types.ts     # Types & seed data
│   └── utils/
│       └── confetti.ts  # Celebrations
└── supabase/
    └── schema.sql       # Database schema
```

## 🎨 Category Colors

| Category | Color |
|----------|-------|
| Sinjab | Purple |
| Ajdel | Blue |
| Personal | Green |
| Haseeb | Orange |
| Raqeeb | Pink |
| Voice Input | Indigo |

## 🔧 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Celebrations**: Canvas Confetti
- **Backend**: Supabase
- **Dates**: date-fns

## 📋 Initial Tasks (36 Seeded)

On first load, the app seeds 36 tasks organized by:
- **Critical** (2 tasks) - Must do immediately
- **Quick Win** (10 tasks) - Under 15 minutes
- **Deep Work** - Ajdel, Haseeb, Raqeeb projects
- **Personal Growth** - Health, learning, research

---

Built with 💚 for focused minds
