-- Auto-assign admin role to approved email addresses
-- This trigger fires when a new user signs up (inserted into auth.users)

-- Insert admin roles for any existing users with approved emails
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'admin'::public.app_role
FROM auth.users au
WHERE au.email IN (
  'matilda@herbertandellis.com',
  'tom@herbertandellis.com',
  'ewan@herbertandellis.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create a trigger function to auto-assign admin role on signup
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN (
    'matilda@herbertandellis.com',
    'tom@herbertandellis.com',
    'ewan@herbertandellis.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();
