
# Plan: Fix Missing Admin Panel Button

## Problem Summary
The Admin Panel button is not appearing in the desktop sidebar even though:
- You're logged in as an admin account (confirmed by the "Admin" badge on Home)
- The code exists to show the button conditionally

## Root Cause
After analyzing the code, I found two issues:

1. **Stale session data**: The `isAdmin` state depends on role data stored in localStorage (`solarnova_user`). If this cached data is outdated or missing the role field, the button won't appear.

2. **Unused `userViewMode` toggle**: There's a `userViewMode` variable that blocks admin features when true, but there's no way to toggle it. If this somehow gets set to `true`, admin features disappear.

## Solution

### 1. Add session refresh logic
Ensure the user role is re-verified when the page loads, not just read from localStorage cache.

### 2. Make the Admin button always visible for admins
Remove the `userViewMode` dependency for the Admin Panel button since there's no toggle for it anyway.

### 3. Add a quick fix workaround
Add an "Admin View" toggle button so admins can deliberately switch between admin and user view (making the `userViewMode` actually usable).

---

## Technical Details

### File: `src/pages/Index.tsx`

**Change 1**: Simplify the Admin Panel button condition
- Current: `{effectiveIsAdmin && (...)`
- Change to: `{isAdmin && (...)`
- This ensures the button shows for any admin, regardless of `userViewMode`

**Change 2**: Add admin view toggle (optional enhancement)
- Add a small toggle in the sidebar for admins to switch between "Admin View" and "User View"
- This makes the `userViewMode` feature actually functional

### File: `src/contexts/AuthContext.tsx`

**Change 3**: Ensure role is properly loaded from localStorage
- Add validation that the cached user has a `role` field
- If missing, default to 'user' role

---

## Quick Workaround
If the issue persists, users can:
1. Log out completely
2. Clear localStorage (or browser data for the site)
3. Log back in

This forces a fresh role fetch from the database.

---

## Implementation Steps
1. Update the Admin Panel button conditions in `Index.tsx` (lines 446 and 520) to use `isAdmin` instead of `effectiveIsAdmin`
2. Add proper role validation in `AuthContext.tsx`
3. Optionally add an Admin/User view toggle for future flexibility
