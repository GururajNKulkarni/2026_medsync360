-- Enable RLS on the users table if it's not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows any authenticated user to view all other users.
-- This is necessary for features like the doctor selection dropdown in the referral form.
CREATE POLICY "Authenticated users can view all other users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Add comments for clarity
COMMENT ON POLICY "Authenticated users can view all other users" ON public.users 
IS 'This policy allows any logged-in user to see the list of all other users, which is required for referral destination selection and other collaborative features.';
