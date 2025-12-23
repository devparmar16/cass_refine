# Task Flow Verification - All Roles

## ✅ FIXED ISSUES

### 1. **Uploaded Tab Filter Logic** (EventTasks.jsx)
**Problem:** Tasks with status 'uploaded' weren't showing in uploaded tab
**Fix:** Updated filter to show:
- Manual tasks (upload_type='none') with status 'completed'
- Regular tasks with status 'uploaded' OR has_user_submission
- Only for assigned_to === currentUserRole

### 2. **Accept/Reject Error Handling** (TaskCard.jsx)
**Problem:** No error handling, silent failures
**Fix:** Added comprehensive try-catch with:
- Error checking for review steps fetch
- Validation that steps exist
- Error handling for all DB operations
- User-facing error alerts

### 3. **User ID Caching Issue** (TasksContext.jsx & AuthContext.jsx)
**Problem:** user.id was undefined, breaking cache validation
**Fix:** 
- Added `id: data.username` to user object
- Added `displayName: data.disp_name` for compatibility
- Updated cache validation to use user.username

## 📋 COMPLETE TASK FLOW BY ROLE

### **ASSIGNED USER (All Roles)**

#### My Tasks Tab (/mytasks)
- **Shows:** Tasks with statuses: 'assigned', 'pending', 'rejected', 'in_progress'
- **Actions:**
  - ✅ Upload button (for non-manual tasks in assigned/pending/rejected status)
  - ✅ View Submissions button
  - ✅ Download button (if task is in_review/uploaded/rejected)
  - ✅ Template button (if templates exist)
  - ✅ Add comments (if canAddComment = true)

#### Upload Flow:
1. Click "Upload" → Opens appropriate modal (file/table/custom)
2. Submit files → Creates entry in task_submissions
3. onUploadSuccess() executes:
   - Fetches review flow steps
   - Sets status = 'in_review'
   - Sets current_step = 0
   - Sets current_reviewer_role = first reviewer
4. Task **disappears from /mytasks** (no longer in assigned/pending/rejected)
5. Task **appears in first reviewer's /reviews tab**

#### Uploaded Tab (/uploaded)
- **Shows:** 
  - Manual tasks: status = 'completed' AND upload_type = 'none'
  - Regular tasks: status = 'uploaded' OR has_user_submission
- **Actions:**
  - ✅ View Submissions button
  - ✅ Download button
  - ✅ Remove Upload button (soft reset - resets status, removes submissions)

---

### **REVIEWER (Any Role in Review Flow)**

#### Reviews Tab (/reviews)
- **Shows:** Tasks where current_reviewer_role === userRole AND status = 'in_review'
- **Actions:**
  - ✅ Accept button
  - ✅ Reject button (with comment requirement)
  - ✅ View Submissions button
  - ✅ Download button
  - ✅ Add comments

#### Accept Flow:
1. Click "Accept" → handleAcceptReject('accept')
2. Checks if next reviewer exists:
   - **If more reviewers:** 
     - status stays 'in_review'
     - current_step increments
     - current_reviewer_role = next reviewer
     - Task moves to next reviewer's /reviews
   - **If final reviewer:**
     - status = 'uploaded'
     - current_reviewer_role = null
     - Sends acceptance email
     - Task appears in assignee's /uploaded tab
3. Inserts flow log comment: `[__FLOW__][ACCEPT] {userRole}`
4. Task **disappears from current reviewer's /reviews**

#### Reject Flow:
1. Click "Reject" → Modal opens for comment
2. handleAcceptReject('reject', comment)
3. Updates:
   - status = 'rejected'
   - current_reviewer_role = null
   - current_step = 0
4. Inserts:
   - Flow log: `[__FLOW__][REJECT] {userRole}`
   - User comment (if provided)
5. Sends rejection email
6. Task **disappears from reviewer's /reviews**
7. Task **appears back in assignee's /mytasks** with status 'rejected'

---

### **CHAIR PERSON SPECIAL FEATURES**

#### Manage All Tasks View (Chair only, /mytasks)
- **Shows:** ALL tasks for the event, grouped by role
- **Actions:**
  - ✅ Delete Task button (hard delete - removes everything)
  - View all task statuses
  - See who's assigned to what

#### Manual Tasks (upload_type='none')
- **Chair Actions:**
  - ✅ Send To dropdown (route to other roles)
  - ✅ Finalize button (when status = pending/in_progress)
- **Non-Chair Actions:**
  - ✅ Send Back to Chair button

---

## 🔄 STATUS TRANSITIONS

```
INITIAL:
  assigned/pending
    ↓ (Upload)
  in_review → current_reviewer_role = Reviewer 1
    ↓ (Accept)
  in_review → current_reviewer_role = Reviewer 2
    ↓ (Accept)
  uploaded (final)

REJECTION PATH:
  in_review
    ↓ (Reject at any step)
  rejected → back to assigned_to
    ↓ (Re-upload)
  in_review → starts over from Reviewer 1
```

## 🎯 TAB VISIBILITY RULES

| Status | My Tasks | Reviews | Uploaded |
|--------|----------|---------|----------|
| assigned | ✅ (if assigned to me) | ❌ | ❌ |
| pending | ✅ (if assigned to me) | ❌ | ❌ |
| in_progress | ✅ (if assigned to me) | ❌ | ❌ |
| rejected | ✅ (if assigned to me) | ❌ | ❌ |
| in_review | ❌ | ✅ (if I'm current_reviewer) | ❌ |
| uploaded | ❌ | ❌ | ✅ (if assigned to me) |
| completed* | ❌ | ❌ | ✅ (if manual task assigned to me) |

*completed only for manual tasks (upload_type='none')

## ✅ BUTTON AVAILABILITY

### Upload Button
- **Condition:** `!isManualTask && isAssignedToMe && ['assigned', 'pending', 'rejected'].includes(status)`
- **Location:** My Tasks tab only

### Accept/Reject Buttons
- **Condition:** `!isManualTask && !isInUploadedTab && isReviewer && status === 'in_review'`
- **Location:** Reviews tab only

### Remove Upload Button
- **Condition:** `!isManualTask && isInUploadedTab && isAssignedToMe`
- **Location:** Uploaded tab only

### View Submissions Button
- **Condition:** `!isManualTask`
- **Location:** All tabs

### Download Button
- **Condition:** `!isManualTask && ['in_review', 'uploaded', 'rejected'].includes(status)`
- **Location:** All tabs

## 🔍 VERIFICATION CHECKLIST

### For Each Role:
- [ ] Task appears in correct tab after assignment
- [ ] Upload button works and moves task to in_review
- [ ] Task appears in first reviewer's /reviews tab
- [ ] Accept button moves to next reviewer or uploaded
- [ ] Reject button moves back to assignee's /mytasks
- [ ] Uploaded tasks appear in /uploaded tab
- [ ] Remove upload resets task correctly
- [ ] All buttons are disabled/hidden appropriately
- [ ] Comments work for all authorized users
- [ ] Review flow displays correctly on rejected tasks

### Chair Person Additional:
- [ ] Manage All Tasks view shows all event tasks
- [ ] Delete Task works and removes everything
- [ ] Manual task Send To works
- [ ] Manual task Finalize works

## 🐛 KNOWN EDGE CASES HANDLED

1. ✅ Tasks without flow_template_id - Error shown to user
2. ✅ Empty review flow steps - Error shown to user
3. ✅ Missing current_reviewer_role - Handled gracefully
4. ✅ Cache invalidation on role change
5. ✅ User without id field - Uses username as id
6. ✅ Task submission failures - Error alerts shown

## 🚀 PERFORMANCE OPTIMIZATIONS

1. ✅ Context caching with TTL (2 min tasks, 5 min events)
2. ✅ Lazy loading of components
3. ✅ useMemo for derived task lists
4. ✅ Real-time subscriptions instead of polling
5. ✅ No DB fetch in EventTasks - uses context only

