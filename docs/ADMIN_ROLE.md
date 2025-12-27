# Admin Role Implementation

This document describes the admin role functionality and how to use it.

## Overview

The admin role provides site administrators with special privileges to manage spaces and users across the entire application.

## Features

### 1. Admin Role Management
- Users have a `role` field in the `profiles` table that can be either 'user' or 'admin'
- Default role is 'user' for all new users
- Role can only be changed by using the service role key (not through the UI)

### 2. Access Control
- Admin routes are protected by middleware at `/admin/*`
- Only users with `role='admin'` can access admin pages
- Non-admin users are redirected to the home page

### 3. Admin Dashboard
Access the admin dashboard at: `/admin`

Features:
- **Overview**: Dashboard with warnings and information
- **Space Management**: View and delete any space
- **User Management**: View and ban users

## Setting Up Admin Users

To make a user an admin, you need to update their role using the service role key.

### Method 1: Using SQL (Local Development)

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres << 'EOF'
BEGIN;
SET LOCAL request.jwt.claims = '{"role": "service_role"}';
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';
COMMIT;
EOF
```

### Method 2: Using Supabase Dashboard

1. Open Supabase Studio (http://127.0.0.1:54323 for local)
2. Navigate to Table Editor → profiles
3. Find the user by email
4. Click Edit Row
5. Change `role` from 'user' to 'admin'
6. Save

### Method 3: Using API (Production)

Create a secure admin endpoint or script that uses the service role key:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function makeAdmin(userId: string) {
  const { data, error } = await adminClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);
  
  return { data, error };
}
```

## Security Considerations

1. **Service Role Key Protection**
   - The service role key bypasses all RLS policies
   - Never expose it to the client
   - Only use it in server-side code
   - Store it securely in environment variables

2. **Role Change Protection**
   - A database trigger prevents users from changing their own role
   - Only operations with `service_role` JWT claim can change roles
   - This prevents privilege escalation attacks

3. **Admin Action Verification**
   - All admin actions verify the user's role before executing
   - Role check is done server-side on every request
   - Consider caching role in JWT for better performance

4. **Data Cleanup**
   - Deleting a space moves it to `spaces_archive` table
   - Banning a user deletes their auth account and profile
   - Bingo cards remain as orphaned records (consider cleanup)

## Database Schema

### profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'user',
  CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'))
);
```

### Trigger
```sql
CREATE TRIGGER trigger_prevent_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();
```

## Testing Admin Functionality

### Test Admin Access
1. Create a test user account
2. Make them admin using one of the methods above
3. Log in with that account
4. Navigate to `/admin`
5. Verify you can access the admin dashboard

### Test Space Deletion
1. Create a test space
2. Navigate to `/admin/spaces`
3. Click "削除" (Delete) on the test space
4. Confirm deletion
5. Verify space is removed from the list
6. Check `spaces_archive` table to confirm it was archived

### Test User Ban
1. Create a test user account
2. Navigate to `/admin/users`
3. Click "BAN" on the test user
4. Confirm the action
5. Verify user is removed from the list
6. Verify user cannot log in anymore

## Troubleshooting

### Cannot Access Admin Routes
- Verify your user has `role='admin'` in the profiles table
- Clear browser cookies and log in again
- Check browser console for any errors

### Role Update Fails
- Ensure you're using service role key
- Check that the JWT claim is set correctly
- Verify the trigger function exists in the database

### Delete/Ban Actions Fail
- Check server logs for error messages
- Verify SUPABASE_SERVICE_ROLE_KEY is set in environment variables
- Ensure the admin client is being used (not regular client)

## Future Improvements

Consider implementing:
- [ ] Activity logs for admin actions
- [ ] Soft ban (disable account instead of delete)
- [ ] Batch operations (delete multiple spaces/users)
- [ ] Search and filter functionality
- [ ] Pagination for large datasets
- [ ] Toast notifications instead of alert()
- [ ] Role caching in JWT claims for better performance
- [ ] Cleanup of orphaned bingo cards when banning users
