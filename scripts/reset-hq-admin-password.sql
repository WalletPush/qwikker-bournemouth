-- ============================================================================
-- RESET HQ ADMIN PASSWORD
-- ============================================================================
-- This will reset the password for hq@qwikker.com to: "HQAdmin123!"
-- 
-- Run this in Supabase SQL Editor, then login with:
--   Email: hq@qwikker.com
--   Password: HQAdmin123!
-- ============================================================================

DO $$
DECLARE
    hq_user_id UUID;
    hq_email TEXT := 'hq@qwikker.com';
    new_password TEXT := 'HQAdmin123!';
BEGIN
    -- Find the user ID for hq@qwikker.com
    SELECT id INTO hq_user_id
    FROM auth.users
    WHERE email = hq_email;

    IF hq_user_id IS NULL THEN
        -- User doesn't exist - create them!
        RAISE NOTICE '❌ User % does not exist!', hq_email;
        RAISE NOTICE '📝 Creating new HQ admin user...';
        
        -- Create the user (you'll need to do this via Supabase Dashboard → Authentication → Add User)
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  MANUAL STEP REQUIRED:';
        RAISE NOTICE '   1. Go to Supabase Dashboard → Authentication → Users';
        RAISE NOTICE '   2. Click "Add user"';
        RAISE NOTICE '   3. Email: %', hq_email;
        RAISE NOTICE '   4. Password: %', new_password;
        RAISE NOTICE '   5. Confirm email: YES';
        RAISE NOTICE '   6. Then run this script again!';
        
    ELSE
        -- User exists - reset password
        RAISE NOTICE '✅ Found user: %', hq_email;
        RAISE NOTICE '🔐 Resetting password to: %', new_password;
        
        -- Update password using Supabase admin function
        -- Note: This requires service_role access
        PERFORM extensions.update_auth_user(
            hq_user_id,
            jsonb_build_object(
                'password', new_password,
                'email_confirm', true
            )
        );
        
        -- Make sure user is in hq_admins table
        INSERT INTO hq_admins (user_id, email, role, is_active)
        VALUES (hq_user_id, hq_email, 'admin', true)
        ON CONFLICT (user_id) 
        DO UPDATE SET is_active = true, email = hq_email;
        
        RAISE NOTICE '';
        RAISE NOTICE '🎉 PASSWORD RESET COMPLETE!';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Login Credentials:';
        RAISE NOTICE '   📧 Email: %', hq_email;
        RAISE NOTICE '   🔐 Password: %', new_password;
        RAISE NOTICE '';
        RAISE NOTICE '🌐 Login URL:';
        RAISE NOTICE '   🏠 Local: http://localhost:3000/hq-login';
        RAISE NOTICE '   🌍 Production: https://qwikker.com/hq-login';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  CHANGE THIS PASSWORD after logging in!';
        RAISE NOTICE '';
    END IF;
END $$;
