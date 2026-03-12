

## Plan: Add tom@herbertandellis.com as Admin

**Current State:**
- tom@herbertandellis.com exists as a user with ID: `dea73fc1-153b-4d6f-833d-6c6ca1797303`
- They do not currently have an admin role assigned
- matilda@herbertandellis.com already has admin access

**Implementation Steps:**
1. Create database migration to insert role assignment:
   ```sql
   INSERT INTO public.user_roles (user_id, role) 
   VALUES ('dea73fc1-153b-4d6f-833d-6c6ca1797303', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

2. Deploy the migration to assign admin role

**After Implementation:**
- Both matilda@herbertandellis.com and tom@herbertandellis.com will have admin access
- Tom will be able to access the `/admin` dashboard upon his next login

