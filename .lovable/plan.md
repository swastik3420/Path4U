Rebuild Path4U's landing/app shell to match the uploaded `App.tsx` visual language. Backend (Supabase, edge functions, RLS) and existing feature logic stay as-is — this is a frontend/presentation rebuild.

## What changes visually

### 1. Two-phase splash screen (new)
On first load of `/`, show a full-screen intro before the app renders:
- **Phase 0 (0–2.5s):** giant bouncing `Rocket` icon with indigo glow + "Path4U" wordmark
- **Phase 1 (2.5–5s):** bouncing `Target` icon with emerald glow + tagline "Your Pitstop for **Jobs** and **your Destiny**"
- Spinner under each, fade/zoom transitions
- Skippable on click; uses sessionStorage so it shows once per session, not per route

### 2. New Header with progress stepper (replaces `src/components/Header.tsx`)
Match the old nav exactly:
- Indigo rocket logo + "Path4U" + offline badge (when navigator.offline)
- Center stepper: **Scan → Syllabus → Evaluate → Dashboard/Results** with `ChevronRight` separators and dot indicators that light up as the user progresses
- Steps are clickable when prerequisites are met (disabled state with reduced opacity otherwise)
- Right side: Market Intelligence bell (restyled `NotificationBell`), divider, profile chip with avatar + "Standard Tier" subtitle, hover dropdown for Profile Settings / Sign Out
- Stepper state derived from `appState` in `Index.tsx` — needs to be lifted into context or passed via a small `AppStateContext`

### 3. AI loading overlay (new component)
Replace any inline loading spinners during resume parse / question gen / assessment evaluation with a full-screen overlay:
- Concentric counter-rotating border spinners (indigo outer, emerald middle)
- Pulsing `BrainCircuit` icon centered
- SVG circular progress ring tracking a simulated 0→98% progress (slows near end)
- Dynamic rotating loading text per stage ("Scanning Resume for Keywords...", "Locking Syllabus...", etc.)
- Gradient progress bar with shimmer + 5 step pills + "Neural Pipeline • Phase X of 5" footer
- "Powered by Path4U Career Intelligence Engine" bottom note

### 4. NotificationBell restyle
Re-skin existing bell to match old "Market Intelligence" dropdown:
- Indigo trending-up header, "Live" pulse pill, refresh button
- News cards with type badge ("Job Market" emerald / "Tech News" indigo), date, source + ExternalLink
- "Powered by Google Search Grounding" footer
- Keep existing `fetch-notifications` edge function call — only styling changes

### 5. Theming
Add a light/dark slate-based palette layer over the existing design tokens:
- Old app uses `bg-slate-50`/`bg-slate-950`, `indigo-600` primary, `emerald-500` secondary
- Map these to our semantic tokens by adjusting `index.css` HSL values for `--primary` (indigo), `--secondary` (emerald), and surface neutrals to the slate scale
- Keep existing dark-mode toggle (already in `ProfileSettings`)

## Out of scope (kept as-is)
- Backend, Supabase tables, RLS policies, edge functions
- Auth flow (`/auth`, `/company/auth`)
- Existing pages: `Dashboard`, `ProfileSettings`, `CompanyDashboard`, `Results`, etc. — only the header/shell and loading UX they sit inside change
- The Hero/HowItWorks/Features marketing sections — they stay; the new header just sits on top
- No Firebase migration, no jsPDF export, no service worker, no offline sync (those were in the old app but you said rebuild UI only)

## Technical notes
- New files: `src/components/SplashScreen.tsx`, `src/components/StepperNav.tsx`, `src/components/AILoadingOverlay.tsx`, `src/contexts/AppFlowContext.tsx`
- Edited files: `src/components/Header.tsx`, `src/components/NotificationBell.tsx`, `src/pages/Index.tsx`, `src/index.css` (token tweaks), `src/components/ResumeUpload.tsx` + `src/components/SkillAssessment.tsx` (wire AILoadingOverlay)
- Uses existing `framer-motion`? Not currently installed — will add `framer-motion` via bun
- All colors stay in HSL semantic tokens; no raw `text-indigo-600` in component code — I'll add `--accent-indigo` / `--accent-emerald` tokens and Tailwind utility aliases
