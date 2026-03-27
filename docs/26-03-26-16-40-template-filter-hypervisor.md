# Filter Templates by Selected Hypervisor in Create VM

**Date**: 26-03-2026 16:40
**Version**: 1.3.3 (PATCH)

## Objective

In the Create VM wizard (Step 1), show only the templates belonging to the selected hypervisor. Currently, all saved templates are shown regardless of which hypervisor is selected, mixed with the discovered templates.

## Technical Approach

### Current State
- **CreateVm.tsx (line 49)**: `api.getTemplates()` fetches ALL saved templates on mount
- **CreateVm.tsx (lines 110-113)**: `allTemplates` merges all saved templates + discovered templates without filtering saved ones by hypervisor
- Saved templates have a `hypervisor_id` field that identifies which hypervisor they belong to

### Change Required

**`frontend/src/pages/CreateVm.tsx`**:
- Filter `templates` by `form.hypervisor_id` when building `allTemplates`:
  ```typescript
  const allTemplates = [
    ...templates
      .filter((t) => t.hypervisor_id === form.hypervisor_id)
      .map((t) => ({ ...t, source: 'saved', vmid: t.source_vm_id })),
    ...discoveredTemplates.map((t) => ({ ...t, source: 'discovered' })),
  ];
  ```

### Files Involved
- `frontend/src/pages/CreateVm.tsx` (single line change)

### Expected Result
- When a hypervisor is selected, only its saved templates + its discovered templates are shown
- Switching hypervisor updates the template list accordingly
- No templates from other hypervisors appear in the selection
