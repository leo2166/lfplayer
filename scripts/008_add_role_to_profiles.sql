-- Add role column to profiles table
alter table profiles
add column role text not null default 'user';

-- Set a specific user as admin for testing (optional, for developer)
-- Replace 'user_id_to_make_admin' with the actual user id
-- update profiles set role = 'admin' where id = 'user_id_to_make_admin';
