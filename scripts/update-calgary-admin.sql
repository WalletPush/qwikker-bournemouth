-- Update Calgary admin password
-- Password: "Calgary123" 
-- Hash generated with bcrypt rounds=10: $2b$10$vNrIxnoZhB6rfNwH9/bLB.pOWgBeGuKiOHJgF5lWJX.mwnQlb5sHK

-- First, let's see if Calgary admin exists
DO $$
DECLARE
    admin_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.city_admins 
        WHERE city = 'calgary' AND username = 'calgary'
    ) INTO admin_exists;
    
    IF admin_exists THEN
        -- Update existing Calgary admin
        UPDATE public.city_admins 
        SET 
            password_hash = '$2b$10$vNrIxnoZhB6rfNwH9/bLB.pOWgBeGuKiOHJgF5lWJX.mwnQlb5sHK',
            password_changed_at = NOW(),
            email = 'admin@calgary.qwikker.com',
            full_name = 'Calgary Admin',
            is_active = true,
            updated_at = NOW()
        WHERE city = 'calgary' AND username = 'calgary';
        
        RAISE NOTICE '✅ Updated existing Calgary admin password';
    ELSE
        -- Create new Calgary admin
        INSERT INTO public.city_admins (
            city, 
            username, 
            password_hash, 
            email, 
            full_name, 
            is_active
        ) VALUES (
            'calgary',
            'calgary', 
            '$2b$10$vNrIxnoZhB6rfNwH9/bLB.pOWgBeGuKiOHJgF5lWJX.mwnQlb5sHK',
            'admin@calgary.qwikker.com',
            'Calgary Admin',
            true
        );
        
        RAISE NOTICE '✅ Created new Calgary admin';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Calgary Admin Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Login Credentials:';
    RAISE NOTICE '   🏙️  City: Calgary';  
    RAISE NOTICE '   👤 Username: calgary';
    RAISE NOTICE '   🔐 Password: Calgary123';
    RAISE NOTICE '';
    RAISE NOTICE '🌐 Login URLs:';
    RAISE NOTICE '   🏠 Local: http://localhost:3000/admin/login';
    RAISE NOTICE '   🌍 Production: https://calgary.qwikker.com/admin/login';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 This admin can only access Calgary businesses!';
    
END $$;
