-- handle_new_user 関数を更新してアバターソースとプロバイダーアバターを保存
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE 
  default_role TEXT;
  user_provider TEXT;
  user_avatar_url TEXT;
BEGIN
  -- search_path is enforced via function attribute above

  BEGIN
    SELECT default_user_role INTO default_role
    FROM public.system_settings
    WHERE id = 1;
  EXCEPTION
    WHEN OTHERS THEN
      default_role := 'organizer';
      RAISE WARNING 'Failed to read system_settings, using default role: %', SQLERRM;
  END;

  IF default_role IS NULL THEN
    default_role := 'organizer';
  END IF;

  -- プロバイダーとアバターURLを取得
  user_provider := NEW.raw_app_meta_data->>'provider';
  user_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Prevent recursion from profile triggers touching auth.users
  PERFORM set_config('app.inserting_new_user', 'true', true);

  BEGIN
    -- プロバイダーが oauth プロバイダーの場合、avatar_source を設定
    -- それ以外（email, magic link など）の場合は 'default' を使用
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, avatar_source)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      user_avatar_url,
      default_role,
      CASE 
        WHEN user_provider IN ('google', 'twitch', 'github', 'discord') THEN user_provider
        ELSE 'default'
      END
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = NOW();

    -- プロバイダーアバターが存在する場合、user_provider_avatars テーブルに保存
    IF user_provider IN ('google', 'twitch', 'github', 'discord') AND user_avatar_url IS NOT NULL THEN
      INSERT INTO public.user_provider_avatars (user_id, provider, avatar_url)
      VALUES (NEW.id, user_provider, user_avatar_url)
      ON CONFLICT (user_id, provider) DO UPDATE
        SET avatar_url = EXCLUDED.avatar_url,
            updated_at = NOW();
    END IF;

    -- Clear recursion flag after successful insert
    PERFORM set_config('app.inserting_new_user', '', true);
  EXCEPTION
    WHEN OTHERS THEN
      -- Clear recursion flag before re-raising exception
      PERFORM set_config('app.inserting_new_user', '', true);
      RAISE;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
