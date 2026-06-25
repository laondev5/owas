# UI System Skill — HARPAZO-OWAS Platform
# Use this for consistent UI across all pages

---

## Design System Foundation

### Stack
- **shadcn/ui** (component primitives — do NOT reinvent these)
- **Tailwind CSS** (utility classes only — no custom CSS files unless unavoidable)
- **Lucide React** (icons — consistent icon library)
- **Recharts** (all data visualizations)
- **@react-pdf/renderer** (PDF export only)

### Color Palette (Tailwind + CSS Variables)
```css
/* Brand colors — defined in globals.css as CSS variables */
--brand-primary: #1B4F72;    /* Deep Navy — OWAS primary */
--brand-secondary: #E67E22;  /* Harvest Gold — accents, CTAs */
--brand-success: #27AE60;    /* Kingdom Green — active/success */
--brand-danger: #C0392B;     /* Alert Red — overdue/inactive */
--brand-warning: #F39C12;    /* Amber — pending/warning */
--brand-muted: #7F8C8D;      /* Slate — secondary text */
```

Tailwind usage:
```
Primary: bg-[#1B4F72] text-[#1B4F72]
Gold:    bg-[#E67E22] text-[#E67E22]
Green:   bg-green-600 text-green-600
Red:     bg-red-600 text-red-600
Amber:   bg-amber-500 text-amber-500
```

### Typography
- **Font:** Inter (Google Fonts) — loaded via next/font
- Heading 1: `text-2xl font-bold tracking-tight`
- Heading 2: `text-xl font-semibold`
- Heading 3: `text-lg font-medium`
- Body: `text-sm text-muted-foreground`
- Labels: `text-xs font-medium uppercase tracking-wide text-muted-foreground`

---

## Layout Patterns

### Dashboard Shell
```tsx
// Every authenticated page uses this layout
<div className="flex h-screen overflow-hidden">
  <Sidebar />                    {/* left nav — collapsed on mobile */}
  <div className="flex-1 flex flex-col overflow-hidden">
    <Header />                   {/* top bar with breadcrumb + notification bell */}
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      {children}
    </main>
  </div>
</div>
```

### Page Header Pattern
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
  <div className="flex gap-2">
    {/* action buttons */}
  </div>
</div>
```

### Stats Card Grid
```tsx
// Always 4 columns on desktop, 2 on tablet, 1 on mobile
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <StatsCard
    title="Souls Won"
    value={142}
    change="+12% from last week"
    trend="up"
    icon={<Users className="h-4 w-4" />}
  />
</div>
```

### StatsCard Component
```tsx
// src/components/ui/stats-card.tsx
interface StatsCardProps {
  title: string
  value: number | string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  className?: string
}
```

---

## Component Patterns

### Report Status Badge
```tsx
// Shows report submission status
const statusConfig = {
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-800' },
  draft:     { label: 'Draft',     className: 'bg-yellow-100 text-yellow-800' },
  overdue:   { label: 'Overdue',   className: 'bg-red-100 text-red-800' },
  pending:   { label: 'Pending',   className: 'bg-blue-100 text-blue-800' },
}
<Badge className={statusConfig[status].className}>{statusConfig[status].label}</Badge>
```

### Soul Integration Stage Stepper
```tsx
// Shows a soul's journey through FIA pipeline
const stages = [
  'Won', 'Shepherd Assigned', 'Family Class', 
  'Responsibility Class', 'SIP 101', 'SIP 102', 'SIP 103', 'SML'
]
// Use a horizontal stepper on desktop, vertical on mobile
// Current stage: brand primary color
// Completed: green
// Upcoming: muted gray
```

### Report Form Pattern
```tsx
// All report forms follow this structure:
<form onSubmit={handleSubmit}>
  {/* Section Header */}
  <div className="bg-[#1B4F72] text-white px-4 py-2 rounded-t-md">
    <h3 className="font-semibold text-sm uppercase tracking-wide">
      {sectionNumber}. {sectionTitle}
    </h3>
  </div>
  
  {/* Section Content */}
  <div className="border border-t-0 rounded-b-md p-4 mb-4">
    <div className="grid grid-cols-2 gap-4">
      {/* form fields */}
    </div>
  </div>
</form>
```

### Data Table Pattern
```tsx
// Use shadcn/ui DataTable pattern with TanStack Table
// Always include: search, pagination, column visibility toggle
// Export button in top right
// Empty state with illustration when no data
```

### Flight Shepherd Tag Badge
```tsx
// Color-coded by category
const tagColors = {
  YM: 'bg-blue-100 text-blue-800 border-blue-300',
  YF: 'bg-pink-100 text-pink-800 border-pink-300',
  M:  'bg-indigo-100 text-indigo-800 border-indigo-300',
  W:  'bg-purple-100 text-purple-800 border-purple-300',
}
<span className={`px-2 py-1 text-xs font-mono border rounded ${tagColors[category]}`}>
  {tag}  {/* e.g., YM-Tag3 */}
</span>
```

### 7 Million Progress Ring
```tsx
// National dashboard: circular progress toward 7M target
// Use Recharts RadialBarChart or a custom SVG ring
// Show: current total, target (7,000,000), percentage
// Color: gradient from #E67E22 (early) to #27AE60 (milestone)
```

---

## Chart Patterns

### Souls Won Trend (Line Chart)
```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={weeklyData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
    <YAxis tick={{ fontSize: 12 }} />
    <Tooltip />
    <Legend />
    <Line 
      type="monotone" 
      dataKey="soulsWon" 
      stroke="#1B4F72" 
      strokeWidth={2}
      dot={{ r: 4 }}
    />
    <Line 
      type="monotone" 
      dataKey="firstTimers" 
      stroke="#E67E22" 
      strokeWidth={2}
      strokeDasharray="5 5"
    />
  </LineChart>
</ResponsiveContainer>
```

### KPI Scorecard Bar Chart
```tsx
// Horizontal bar chart, one bar per KPI metric
// Color: green if score ≥ 80%, amber if 50-79%, red if <50%
```

### Convert Pipeline Funnel
```tsx
// Custom funnel: Won → Shepherd → Family Class → Resp. Class → SIP → SML
// Use Recharts FunnelChart
// Each stage shows count and % conversion from previous
```

### Compliance Heatmap (Branch Grid)
```tsx
// Grid of branches per district
// Green = submitted on time
// Amber = submitted late
// Red = not submitted
// Gray = no data
```

---

## Form Validation Display

```tsx
// All forms use react-hook-form + Zod resolver
// Error display: inline below each field, never toast-only
<FormField
  control={form.control}
  name="soulsWon"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Souls Won</FormLabel>
      <FormControl>
        <Input type="number" placeholder="0" {...field} />
      </FormControl>
      <FormDescription>Must be ≤ Souls Reached</FormDescription>
      <FormMessage />  {/* shows Zod error */}
    </FormItem>
  )}
/>
```

---

## Navigation Structure

### Sidebar (role-aware — only shows what the user can access)

```
Dashboard (home icon) — all roles

REPORTING
  My Report (this week)    — flight_shepherd
  Branch Reports           — branch_coordinator, chief_trainer, mfc
  District Reports         — district_coordinator
  Zonal Reports            — zonal_coordinator
  National Reports         — national_coordinator, super_admin

SOULS & SHEPHERDS
  Converts                 — branch_coordinator, mfc, flight_shepherd
  Flight Shepherds         — branch_coordinator
  SML Registry             — chief_trainer, zonal_coordinator

TRAINING
  SIP Cohorts              — chief_trainer
  FIA Tracker              — chief_trainer, branch_coordinator

ANALYTICS
  KPI Scorecard            — all coordinators
  7M Progress              — national_coordinator, zonal_coordinator
  Leaderboard              — all coordinators

ADMINISTRATION  (super_admin only)
  Organizations
  Users
  Notifications
  Audit Logs
  System Config

PROFILE
  My Account
  Notification Settings
  Logout
```

---

## Toast Notifications (in-app feedback)

```tsx
// Use shadcn/ui Sonner (toaster)
// Success: "✅ Report submitted successfully"
// Error:   "❌ Submission failed: {reason}"
// Warning: "⚠️ Souls Won cannot exceed Souls Reached"
// Info:    "ℹ️ Report auto-saved as draft"
```

---

## Mobile Responsiveness Rules

1. Sidebar collapses to bottom tab bar on mobile (max 5 tabs — most used)
2. All forms are single-column on mobile
3. Data tables scroll horizontally on mobile with sticky first column
4. Stats cards: 2 per row on mobile
5. Charts have minimum height of 200px on mobile, full width
6. Floating action button for "Submit Report" on mobile
7. All modals are full-screen drawers on mobile (use shadcn/ui Sheet)

---

## Loading States

```tsx
// Use shadcn/ui Skeleton for all loading states
// Never show blank white space while loading
<Skeleton className="h-32 w-full rounded-md" />

// For stats cards:
<StatsCardSkeleton />  // shows 4 skeleton cards

// For tables:
<TableSkeleton rows={10} />
```

---

## Empty States

```tsx
// Every table/list must have an empty state
<div className="flex flex-col items-center justify-center py-12">
  <Icon className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-medium mb-1">{emptyTitle}</h3>
  <p className="text-sm text-muted-foreground mb-4">{emptyDescription}</p>
  {actionButton}
</div>
```

---

## Accessibility Rules

- All interactive elements have aria-labels
- Color is never the ONLY indicator of status (always combine with text/icon)
- Form fields always have associated `<label>` elements
- Focus ring visible on all focusable elements (Tailwind `focus-visible:ring-2`)
- Minimum touch target: 44px × 44px on mobile
