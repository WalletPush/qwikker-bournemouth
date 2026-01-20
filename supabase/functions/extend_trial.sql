-- Function to extend a business trial by X days (admin only)

CREATE OR REPLACE FUNCTION extend_business_trial(
  p_business_id UUID,
  p_additional_days INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_end_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_end_date TIMESTAMP WITH TIME ZONE;
  v_new_end_date TIMESTAMP WITH TIME ZONE;
  v_business_name TEXT;
  v_business_city TEXT;
  v_admin_city TEXT;
BEGIN
  -- ✅ MULTI-TENANT SECURITY: Check admin has access to this business's city
  -- Get business city and admin city in one query
  SELECT 
    bp.city
  INTO v_business_city
  FROM business_profiles bp
  WHERE bp.id = p_business_id;
  
  -- Check if business exists
  IF v_business_city IS NULL THEN
    RETURN QUERY SELECT false, 'Business not found'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  -- Get admin's city
  SELECT city INTO v_admin_city
  FROM city_admins
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Verify admin has access to this city
  IF v_admin_city IS NULL THEN
    RETURN QUERY SELECT false, 'Access denied: Not authorized as admin'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  IF v_admin_city != v_business_city THEN
    RETURN QUERY SELECT false, format('Access denied: You can only manage businesses in %s, not %s', v_admin_city, v_business_city)::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  -- Get current trial end date
  SELECT 
    bs.free_trial_end_date,
    bp.business_name
  INTO v_current_end_date, v_business_name
  FROM business_subscriptions bs
  JOIN business_profiles bp ON bp.id = bs.business_id
  WHERE bs.business_id = p_business_id
  AND bs.is_in_free_trial = true
  LIMIT 1;
  
  -- Check if business has an active trial
  IF v_current_end_date IS NULL THEN
    RETURN QUERY SELECT false, 'Business does not have an active trial'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  -- Calculate new end date
  v_new_end_date := v_current_end_date + (p_additional_days || ' days')::INTERVAL;
  
  -- Update the trial end date
  UPDATE business_subscriptions
  SET 
    free_trial_end_date = v_new_end_date,
    status = 'trial', -- 🔥 Restore status if it was 'expired'
    updated_at = NOW()
  WHERE business_id = p_business_id
  AND is_in_free_trial = true;
  
  -- 🔥 NEW: Restore business_tier if it was downgraded
  UPDATE business_profiles
  SET 
    business_tier = 'free_trial', -- Restore from 'starter' back to 'free_trial'
    plan = 'featured', -- Free trials get featured benefits
    updated_at = NOW()
  WHERE id = p_business_id;
  
  -- ⚠️ NOTE: Knowledge base entries were DELETED on expiry
  -- Business owner must re-add their menus/info manually
  
  -- Log the extension (optional - add to audit table if you have one)
  -- INSERT INTO trial_extensions_log (business_id, extended_by_days, new_end_date, extended_by_admin)
  -- VALUES (p_business_id, p_additional_days, v_new_end_date, auth.uid());
  
  RETURN QUERY SELECT 
    true, 
    format('✅ Trial extended by %s days for %s. New end date: %s. ⚠️ They must re-add KB entries manually.', 
      p_additional_days, 
      v_business_name, 
      to_char(v_new_end_date, 'DD Mon YYYY')
    )::TEXT,
    v_new_end_date;
END;
$$;

COMMENT ON FUNCTION extend_business_trial(UUID, INTEGER) IS 
  'Extends a business trial by specified number of days. Admin only. Multi-tenant safe: admins can only extend trials for businesses in their own city.';

-- Example usage:
-- SELECT * FROM extend_business_trial('business-uuid-here', 30);

