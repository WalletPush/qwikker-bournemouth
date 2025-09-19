 WARN  Cannot switch to pnpm@9: "9" is not a valid version
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          badges: Json
          city: string
          created_at: string
          current_streak_days: number
          dietary_restrictions: string[] | null
          email: string | null
          experience_points: number
          id: string
          joined_date: string
          last_active_at: string | null
          level: number
          longest_streak_days: number
          name: string | null
          notification_preferences: Json
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          phone: string | null
          preferred_categories: string[] | null
          preferred_radius_miles: number | null
          profile_completion_percentage: number
          referral_code: string
          referred_by: string | null
          stats: Json
          tier: string
          total_points: number
          updated_at: string
          user_id: string
          wallet_pass_assigned_at: string | null
          wallet_pass_id: string | null
          wallet_pass_status: string | null
        }
        Insert: {
          badges?: Json
          city?: string
          created_at?: string
          current_streak_days?: number
          dietary_restrictions?: string[] | null
          email?: string | null
          experience_points?: number
          id?: string
          joined_date?: string
          last_active_at?: string | null
          level?: number
          longest_streak_days?: number
          name?: string | null
          notification_preferences?: Json
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          phone?: string | null
          preferred_categories?: string[] | null
          preferred_radius_miles?: number | null
          profile_completion_percentage?: number
          referral_code: string
          referred_by?: string | null
          stats?: Json
          tier?: string
          total_points?: number
          updated_at?: string
          user_id: string
          wallet_pass_assigned_at?: string | null
          wallet_pass_id?: string | null
          wallet_pass_status?: string | null
        }
        Update: {
          badges?: Json
          city?: string
          created_at?: string
          current_streak_days?: number
          dietary_restrictions?: string[] | null
          email?: string | null
          experience_points?: number
          id?: string
          joined_date?: string
          last_active_at?: string | null
          level?: number
          longest_streak_days?: number
          name?: string | null
          notification_preferences?: Json
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          phone?: string | null
          preferred_categories?: string[] | null
          preferred_radius_miles?: number | null
          profile_completion_percentage?: number
          referral_code?: string
          referred_by?: string | null
          stats?: Json
          tier?: string
          total_points?: number
          updated_at?: string
          user_id?: string
          wallet_pass_assigned_at?: string | null
          wallet_pass_id?: string | null
          wallet_pass_status?: string | null
        }
        Relationships: []
      }
      billing_history: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          business_id: string | null
          created_at: string | null
          currency: string | null
          external_payment_id: string | null
          failure_reason: string | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          payment_date: string | null
          payment_method: string | null
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          business_id?: string | null
          created_at?: string | null
          currency?: string | null
          external_payment_id?: string | null
          failure_reason?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          business_id?: string | null
          created_at?: string | null
          currency?: string | null
          external_payment_id?: string | null
          failure_reason?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "business_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_changes: {
        Row: {
          admin_notes: string | null
          business_id: string
          change_data: Json
          change_type: string
          created_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          business_id: string
          change_data: Json
          change_type: string
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          business_id?: string
          change_data?: Json
          change_type?: string
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_changes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "city_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          additional_notes: string | null
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          billing_address: Json | null
          billing_email: string | null
          business_address: string | null
          business_category: string | null
          business_description: string | null
          business_hours: string | null
          business_hours_structured: Json | null
          business_images: string[] | null
          business_name: string | null
          business_postcode: string | null
          business_tagline: string | null
          business_tier: string | null
          business_town: string | null
          business_type: string | null
          city: string
          created_at: string
          current_subscription_id: string | null
          email: string | null
          facebook_url: string | null
          first_name: string | null
          goals: string | null
          id: string
          instagram_handle: string | null
          is_founder: boolean
          last_name: string | null
          last_payment_date: string | null
          logo: string | null
          menu_preview: Json | null
          menu_url: string | null
          next_billing_date: string | null
          notes: string | null
          offer_claim_amount: string | null
          offer_end_date: string | null
          offer_image: string | null
          offer_name: string | null
          offer_start_date: string | null
          offer_terms: string | null
          offer_type: string | null
          offer_value: string | null
          payment_method_on_file: boolean | null
          phone: string | null
          plan: string
          profile_completion_percentage: number | null
          rating: number | null
          referral_code: string | null
          referral_source: string | null
          referred_by: string | null
          review_count: number | null
          status: string | null
          trial_expiry: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          additional_notes?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billing_address?: Json | null
          billing_email?: string | null
          business_address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_hours_structured?: Json | null
          business_images?: string[] | null
          business_name?: string | null
          business_postcode?: string | null
          business_tagline?: string | null
          business_tier?: string | null
          business_town?: string | null
          business_type?: string | null
          city?: string
          created_at?: string
          current_subscription_id?: string | null
          email?: string | null
          facebook_url?: string | null
          first_name?: string | null
          goals?: string | null
          id?: string
          instagram_handle?: string | null
          is_founder?: boolean
          last_name?: string | null
          last_payment_date?: string | null
          logo?: string | null
          menu_preview?: Json | null
          menu_url?: string | null
          next_billing_date?: string | null
          notes?: string | null
          offer_claim_amount?: string | null
          offer_end_date?: string | null
          offer_image?: string | null
          offer_name?: string | null
          offer_start_date?: string | null
          offer_terms?: string | null
          offer_type?: string | null
          offer_value?: string | null
          payment_method_on_file?: boolean | null
          phone?: string | null
          plan?: string
          profile_completion_percentage?: number | null
          rating?: number | null
          referral_code?: string | null
          referral_source?: string | null
          referred_by?: string | null
          review_count?: number | null
          status?: string | null
          trial_expiry?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          additional_notes?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billing_address?: Json | null
          billing_email?: string | null
          business_address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_hours_structured?: Json | null
          business_images?: string[] | null
          business_name?: string | null
          business_postcode?: string | null
          business_tagline?: string | null
          business_tier?: string | null
          business_town?: string | null
          business_type?: string | null
          city?: string
          created_at?: string
          current_subscription_id?: string | null
          email?: string | null
          facebook_url?: string | null
          first_name?: string | null
          goals?: string | null
          id?: string
          instagram_handle?: string | null
          is_founder?: boolean
          last_name?: string | null
          last_payment_date?: string | null
          logo?: string | null
          menu_preview?: Json | null
          menu_url?: string | null
          next_billing_date?: string | null
          notes?: string | null
          offer_claim_amount?: string | null
          offer_end_date?: string | null
          offer_image?: string | null
          offer_name?: string | null
          offer_start_date?: string | null
          offer_terms?: string | null
          offer_type?: string | null
          offer_value?: string | null
          payment_method_on_file?: boolean | null
          phone?: string | null
          plan?: string
          profile_completion_percentage?: number | null
          rating?: number | null
          referral_code?: string | null
          referral_source?: string | null
          referred_by?: string | null
          review_count?: number | null
          status?: string | null
          trial_expiry?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "city_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_subscription_id_fkey"
            columns: ["current_subscription_id"]
            isOneToOne: false
            referencedRelation: "business_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subscriptions: {
        Row: {
          base_price: number
          billing_cycle: string | null
          business_id: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          discounted_price: number | null
          free_trial_end_date: string | null
          free_trial_start_date: string | null
          has_lifetime_discount: boolean | null
          id: string
          is_in_free_trial: boolean | null
          lifetime_discount_percent: number | null
          notes: string | null
          original_approval_date: string | null
          status: string | null
          subscription_start_date: string | null
          tier_id: string | null
          updated_at: string | null
          upgraded_during_trial: boolean | null
        }
        Insert: {
          base_price?: number
          billing_cycle?: string | null
          business_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          discounted_price?: number | null
          free_trial_end_date?: string | null
          free_trial_start_date?: string | null
          has_lifetime_discount?: boolean | null
          id?: string
          is_in_free_trial?: boolean | null
          lifetime_discount_percent?: number | null
          notes?: string | null
          original_approval_date?: string | null
          status?: string | null
          subscription_start_date?: string | null
          tier_id?: string | null
          updated_at?: string | null
          upgraded_during_trial?: boolean | null
        }
        Update: {
          base_price?: number
          billing_cycle?: string | null
          business_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          discounted_price?: number | null
          free_trial_end_date?: string | null
          free_trial_start_date?: string | null
          has_lifetime_discount?: boolean | null
          id?: string
          is_in_free_trial?: boolean | null
          lifetime_discount_percent?: number | null
          notes?: string | null
          original_approval_date?: string | null
          status?: string | null
          subscription_start_date?: string | null
          tier_id?: string | null
          updated_at?: string | null
          upgraded_during_trial?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      city_admins: {
        Row: {
          city: string
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          password_changed_at: string | null
          password_hash: string
          updated_at: string | null
          username: string
        }
        Insert: {
          city: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_changed_at?: string | null
          password_hash: string
          updated_at?: string | null
          username: string
        }
        Update: {
          city?: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_changed_at?: string | null
          password_hash?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          business_id: string | null
          city: string
          content: string
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          knowledge_type: string
          metadata: Json | null
          source_url: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          city: string
          content: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          knowledge_type: string
          metadata?: Json | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          city?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          knowledge_type?: string
          metadata?: Json | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "city_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reason: string
          related_item_id: string | null
          related_item_name: string | null
          related_item_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          reason: string
          related_item_id?: string | null
          related_item_name?: string | null
          related_item_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reason?: string
          related_item_id?: string | null
          related_item_name?: string | null
          related_item_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referrals: {
        Row: {
          conversion_date: string | null
          created_at: string
          credited_date: string | null
          id: string
          notes: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          reward_currency: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conversion_date?: string | null
          created_at?: string
          credited_date?: string | null
          id?: string
          notes?: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          reward_currency?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conversion_date?: string | null
          created_at?: string
          credited_date?: string | null
          id?: string
          notes?: string | null
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          reward_currency?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          created_at: string | null
          features: Json
          id: string
          is_active: boolean | null
          monthly_price: number
          tier_display_name: string
          tier_name: string
          yearly_price: number
        }
        Insert: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          tier_display_name: string
          tier_name: string
          yearly_price?: number
        }
        Update: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          tier_display_name?: string
          tier_name?: string
          yearly_price?: number
        }
        Relationships: []
      }
      user_business_visits: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_first_visit: boolean
          photos_shared: string[] | null
          points_earned: number | null
          review_rating: number | null
          review_text: string | null
          user_id: string
          visit_date: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_first_visit?: boolean
          photos_shared?: string[] | null
          points_earned?: number | null
          review_rating?: number | null
          review_text?: string | null
          user_id: string
          visit_date?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_first_visit?: boolean
          photos_shared?: string[] | null
          points_earned?: number | null
          review_rating?: number | null
          review_text?: string | null
          user_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_business_visits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_business_visits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_business_visits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_business_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_offer_claims: {
        Row: {
          business_id: string
          claimed_at: string
          created_at: string
          id: string
          offer_name: string
          offer_type: string
          offer_value: string
          points_earned: number | null
          redeemed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_id: string
          claimed_at?: string
          created_at?: string
          id?: string
          offer_name: string
          offer_type: string
          offer_value: string
          points_earned?: number | null
          redeemed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string
          claimed_at?: string
          created_at?: string
          id?: string
          offer_name?: string
          offer_type?: string
          offer_value?: string
          points_earned?: number | null
          redeemed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offer_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offer_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offer_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offer_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_secret_unlocks: {
        Row: {
          business_id: string
          created_at: string
          id: string
          points_earned: number | null
          points_spent: number | null
          secret_item_description: string | null
          secret_item_name: string
          secret_item_price: string | null
          unlock_method: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          points_earned?: number | null
          points_spent?: number | null
          secret_item_description?: string | null
          secret_item_name: string
          secret_item_price?: string | null
          unlock_method: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          points_earned?: number | null
          points_spent?: number | null
          secret_item_description?: string | null
          secret_item_name?: string
          secret_item_price?: string | null
          unlock_method?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_secret_unlocks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_secret_unlocks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_secret_unlocks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_pending_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_secret_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      approved_businesses: {
        Row: {
          business_address: string | null
          business_category: string | null
          business_description: string | null
          business_hours: string | null
          business_images: string[] | null
          business_name: string | null
          business_postcode: string | null
          business_tagline: string | null
          business_tier: string | null
          business_town: string | null
          business_type: string | null
          city: string | null
          created_at: string | null
          facebook_url: string | null
          id: string | null
          instagram_handle: string | null
          logo: string | null
          menu_preview: Json | null
          offer_end_date: string | null
          offer_image: string | null
          offer_name: string | null
          offer_start_date: string | null
          offer_terms: string | null
          offer_type: string | null
          offer_value: string | null
          rating: number | null
          review_count: number | null
          status: string | null
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          business_address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_images?: string[] | null
          business_name?: string | null
          business_postcode?: string | null
          business_tagline?: string | null
          business_tier?: string | null
          business_town?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string | null
          instagram_handle?: string | null
          logo?: string | null
          menu_preview?: Json | null
          offer_end_date?: string | null
          offer_image?: string | null
          offer_name?: string | null
          offer_start_date?: string | null
          offer_terms?: string | null
          offer_type?: string | null
          offer_value?: string | null
          rating?: number | null
          review_count?: number | null
          status?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          business_address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_images?: string[] | null
          business_name?: string | null
          business_postcode?: string | null
          business_tagline?: string | null
          business_tier?: string | null
          business_town?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string | null
          instagram_handle?: string | null
          logo?: string | null
          menu_preview?: Json | null
          offer_end_date?: string | null
          offer_image?: string | null
          offer_name?: string | null
          offer_start_date?: string | null
          offer_terms?: string | null
          offer_type?: string | null
          offer_value?: string | null
          rating?: number | null
          review_count?: number | null
          status?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      businesses_pending_review: {
        Row: {
          business_address: string | null
          business_name: string | null
          business_town: string | null
          business_type: string | null
          created_at: string | null
          id: string | null
          logo: string | null
          offer_name: string | null
          profile_completion_percentage: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_address?: string | null
          business_name?: string | null
          business_town?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string | null
          logo?: string | null
          offer_name?: string | null
          profile_completion_percentage?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_address?: string | null
          business_name?: string | null
          business_town?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string | null
          logo?: string | null
          offer_name?: string | null
          profile_completion_percentage?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_points: {
        Args: {
          p_amount: number
          p_description: string
          p_reason: string
          p_related_item_id?: string
          p_related_item_name?: string
          p_related_item_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      calculate_user_tier: {
        Args: { points: number }
        Returns: string
      }
      create_user_from_wallet_pass: {
        Args: { p_city?: string; p_name?: string; p_wallet_pass_id: string }
        Returns: string
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never> | { user_name: string }
        Returns: string
      }
      spend_points: {
        Args: {
          p_amount: number
          p_description: string
          p_reason: string
          p_related_item_id?: string
          p_related_item_name?: string
          p_related_item_type?: string
          p_user_id: string
        }
        Returns: boolean
      }
      test_profiles_access: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_trigger_function: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      track_referral: {
        Args: { new_user_id: string; referral_code_param: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
