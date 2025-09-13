DROP TRIGGER IF EXISTS on_auth_user_logged_in ON auth.users;

-- function to create a public user in the public users table
CREATE OR REPLACE FUNCTION public.handle_create_auth_user_profile () RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path TO '' AS $$
begin
  if (new.raw_app_meta_data ->> 'wallet_address' <> '') then
    insert into public.users (wallet_address, username, avatar_url)
    values (new.raw_app_meta_data ->> 'wallet_address', null, null)
    ON CONFLICT (wallet_address) DO NOTHING;
    end if;
  return new;
end;
$$;

-- trigger the function every time a user is created
create trigger on_auth_user_logged_in
after
update on auth.users for each row
execute procedure public.handle_create_auth_user_profile ();