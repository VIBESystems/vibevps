# Fixed Sidebar Layout

**Date**: 26-03-2026 16:40
**Version**: 1.3.2 (PATCH)

## Objective

Make the sidebar stay fixed on the left side of the screen on desktop, so that only the right content area scrolls. Currently on desktop (`lg+`) the sidebar uses `lg:static` which makes it part of the normal document flow and scrolls together with the content.

## Technical Approach

### Current State
- **Sidebar.tsx (line 48)**: `fixed top-0 left-0 ... lg:static lg:z-auto` — on desktop it becomes `static`, losing its fixed position
- **Layout.tsx (line 10)**: `flex min-h-screen` — standard flex container
- **Layout.tsx (line 28)**: `main.flex-1.overflow-auto` — the main area has overflow-auto but without a height constraint it doesn't create an independent scroll context

### Changes Required

**`frontend/src/components/layout/Sidebar.tsx`**:
- Change `lg:static` to `lg:fixed` so the sidebar stays fixed on desktop too
- Add `lg:z-auto` remains fine since it's already there

**`frontend/src/components/layout/Layout.tsx`**:
- Add `lg:ml-64` (256px = w-64) on the main content wrapper `div.flex-1` to offset it by the sidebar width
- Change the layout to use `h-screen overflow-hidden` on the root container and `overflow-y-auto h-screen` on the content area to create proper scroll containment

### Files Involved
- `frontend/src/components/layout/Layout.tsx`
- `frontend/src/components/layout/Sidebar.tsx`

### Expected Result
- Sidebar remains visible and fixed on the left at all times on desktop
- Only the right content area scrolls vertically
- Mobile behavior remains unchanged (hamburger menu overlay)
