# Role Handling System Guide

## Overview

This system provides robust, future-proof role handling for task assignment and email notifications **without hardcoded mappings**.

---

## Core Principles

✅ **Database is the source of truth** - All roles come from `login.role`  
✅ **No hardcoded role maps** - System adapts to new roles automatically  
✅ **Dual storage** - Both normalized and label values preserved  
✅ **Clean separation** - Normalized for logic, labels for display/email  

---

## Key Components

### 1. Role Normalization (`backend/utils/roleNormalizer.js`)

```javascript
import { normalizeRole } from './backend/utils/roleNormalizer.js';

// Example:
normalizeRole("Vice Chair Person") → "vice_chair_person"
normalizeRole("  Chair  ") → "chair"
normalizeRole("Social Media Manager") → "social_media_manager"
```

**Rules:**
- Convert to lowercase
- Trim whitespace
- Replace spaces with `_`
- Remove special characters

**When to use:**
- ✅ Storing to `tasks_temp.assigned_to`
- ✅ Filtering/routing logic
- ❌ NEVER for display
- ❌ NEVER for email queries

---

### 2. Email Resolution (`backend/services/roleEmailResolver.js`)

```javascript
import { getEmailByRole } from './backend/services/roleEmailResolver.js';

// ✅ CORRECT: Pass original role label
const email = await getEmailByRole('Vice Chair Person', supabase);

// ❌ WRONG: Don't pass normalized value
const email = await getEmailByRole('vice_chair_person', supabase); // FAILS!
```

**Features:**
- Queries `login.role` with exact match
- In-memory caching (normalized key for fast lookup)
- Clear error messages when role not found

---

## Database Schema

### `login` table (source of truth)
```
┌──────────────┬────────────────────────┐
│ Column       │ Example                │
├──────────────┼────────────────────────┤
│ role         │ "Vice Chair Person"    │
│ email        │ "vice@example.com"     │
│ username     │ "john_vice"            │
└──────────────┴────────────────────────┘
```

### `tasks_temp` table (dual storage)
```
┌────────────────────┬────────────────────────┐
│ Column             │ Example                │
├────────────────────┼────────────────────────┤
│ assigned_to        │ "vice_chair_person"    │  ← Normalized (logic)
│ assigned_to_label  │ "Vice Chair Person"    │  ← Original (display/email)
│ task_name          │ "Design Poster"        │
│ status             │ "pending"              │
└────────────────────┴────────────────────────┘
```

**CRITICAL:**
- `assigned_to` → Used for filtering, routing, role-based access
- `assigned_to_label` → Used for UI display and email resolution
- **NEVER derive one from the other** - Store both at insert time

---

## Implementation Guide

### Step 1: Fetch Roles from Database

```javascript
// On app start or first usage
const { data: roles } = await supabase
  .from('login')
  .select('role')
  .order('role');

const roleOptions = roles.map(r => ({
  label: r.role,                    // "Vice Chair Person"
  value: normalizeRole(r.role)      // "vice_chair_person"
}));

// Cache in Context/Zustand/localStorage
setRoleCache(roleOptions);
```

**✅ Benefits:**
- New roles auto-appear in dropdowns
- Zero code changes needed
- Always in sync with database

---

### Step 2: Assign Task Form

```jsx
// In Chair's task assignment UI
<Select
  options={roleOptions}              // From cache
  placeholder="Select Role"
  value={selectedRole}               // { label, value }
  onChange={setSelectedRole}
/>

// On Submit
const insertData = {
  task_name: taskName,
  assigned_to: selectedRole.value,        // "vice_chair_person"
  assigned_to_label: selectedRole.label,  // "Vice Chair Person"
  status: 'pending',
  event_id: eventId
};

await supabase.from('tasks_temp').insert(insertData);
```

**Key Points:**
- Store **both** normalized and label
- Don't compute one from the other later
- Prevents sync issues and mapping errors

---

### Step 3: UI Display

```jsx
// ✅ CORRECT: Use label for display
<p>Assigned to: {task.assigned_to_label}</p>

// ❌ WRONG: Don't show normalized value
<p>Assigned to: {task.assigned_to}</p>  // Shows "vice_chair_person" 😞
```

---

### Step 4: Email Notifications

```javascript
// In TaskCard.jsx or similar
import { sendTaskRejectedEmail, sendTaskAcceptedEmail } from '@/lib/emailNotify';

// After task status update
if (action === 'reject') {
  await sendTaskRejectedEmail({
    taskName: task.task_name,
    eventName,
    assignedToLabel: task.assigned_to_label,  // ✅ Use label!
    reviewerRole: userRole,
    rejectionReason: comment
  });
}

if (action === 'accept' && isFinalAccept) {
  await sendTaskAcceptedEmail({
    taskName: task.task_name,
    eventName,
    assignedToLabel: task.assigned_to_label,  // ✅ Use label!
    reviewerRole: userRole
  });
}
```

**Backend email endpoint flow:**
```
1. Receive assignedToLabel: "Vice Chair Person"
2. Call getEmailByRole("Vice Chair Person", supabase)
3. Query: SELECT email FROM login WHERE role = 'Vice Chair Person'
4. Cache result
5. Send email to retrieved address
```

---

## Adding New Roles

### Option 1: Direct Database Insert

```sql
INSERT INTO login (role, email, username, password)
VALUES ('Event Coordinator', 'events@example.com', 'event_coord', 'hash');
```

✅ **Done!** Role now appears in:
- Task assignment dropdowns (after cache refresh)
- Email resolution works automatically
- No code changes needed

---

### Option 2: Admin UI (Future Enhancement)

Add a role management page where admins can:
- Add new roles
- Edit role names
- Assign users to roles
- View role assignments

---

## Troubleshooting

### "No user found with role" error

**Cause:** Mismatch between `assigned_to_label` and `login.role`

**Fix:**
```javascript
// Check what's in tasks_temp
SELECT DISTINCT assigned_to_label FROM tasks_temp;

// Check what's in login
SELECT DISTINCT role FROM login;

// Ensure they match exactly (case-sensitive)
```

---

### Email not sending

**Debug steps:**

1. **Check task record:**
   ```javascript
   // Ensure assigned_to_label exists
   console.log('Label:', task.assigned_to_label);  // Should be "Chair Person" not "chair"
   ```

2. **Check backend logs:**
   ```
   [RoleEmailResolver] Resolving email for role label: "Chair Person"
   [RoleEmailResolver] ✅ Found and cached: "Chair Person" → chair@example.com
   ```

3. **Verify login table:**
   ```sql
   SELECT role, email FROM login WHERE role = 'Chair Person';
   ```

---

### Role not appearing in dropdown

**Cause:** Cache not refreshed or role not in `login` table

**Fix:**
```javascript
// Force cache refresh
const { data: roles } = await supabase
  .from('login')
  .select('role')
  .order('role');

setRoleCache(roles.map(r => ({
  label: r.role,
  value: normalizeRole(r.role)
})));
```

---

## Migration Guide

If you have existing tasks with only `assigned_to`:

```sql
-- Add column if not exists
ALTER TABLE tasks_temp 
ADD COLUMN IF NOT EXISTS assigned_to_label TEXT;

-- Populate from login table (one-time)
UPDATE tasks_temp t
SET assigned_to_label = l.role
FROM login l
WHERE t.assigned_to = normalize_role(l.role);  -- You'll need a normalize_role SQL function

-- Or simpler: populate with exact matches
UPDATE tasks_temp t
SET assigned_to_label = 
  CASE t.assigned_to
    WHEN 'chair' THEN 'Chair Person'
    WHEN 'vice_chair' THEN 'Vice Chairperson'
    -- ... add all existing mappings
  END
WHERE assigned_to_label IS NULL;
```

---

## Best Practices

✅ **DO:**
- Store both `assigned_to` and `assigned_to_label` on insert
- Use `assigned_to_label` for email queries
- Use `assigned_to` for filtering/access control
- Cache roles from database
- Use `normalizeRole()` utility consistently

❌ **DON'T:**
- Hardcode role → email mappings
- Try to "reverse normalize" (vice_chair → Vice Chair)
- Show normalized values in UI
- Query emails with normalized values
- Store only one format and derive the other

---

## Future Enhancements

1. **Role Permissions System**
   - Add `permissions` JSON column to `login`
   - Define what each role can do
   - Check permissions before allowing actions

2. **Role Hierarchy**
   - Define which roles can assign to which roles
   - Automatic escalation for approvals

3. **Multi-Role Support**
   - Users can have multiple roles
   - Task assigned to role group, not individual

4. **Role Change History**
   - Track when roles are reassigned
   - Audit trail for accountability

---

## Summary

| Aspect | Method |
|--------|--------|
| **Source of Truth** | `login.role` column |
| **Storage** | Dual: `assigned_to` (normalized) + `assigned_to_label` (original) |
| **Display** | Always use `assigned_to_label` |
| **Email Query** | Use `assigned_to_label` with `getEmailByRole()` |
| **Filtering** | Use `assigned_to` (normalized) |
| **New Roles** | Add to `login` table, zero code changes |
| **Normalization** | Use `normalizeRole()` utility |

**Result:** Zero-maintenance role system that scales automatically! 🎉
