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
      profiles: {
        Row: {
          additional_notes: string | null
          business_address: string | null
          business_category: string | null
          business_description: string | null
          business_hours: string | null
          business_images: Json | null
          business_name: string | null
          business_postcode: string | null
          business_tagline: string | null
          business_tier: string | null
          business_town: string | null
          business_type: string | null
          city: string | null
          created_at: string
          email: string | null
          facebook_url: string | null
          first_name: string | null
          goals: string | null
          id: string
          instagram_handle: string | null
          is_founder: boolean
          last_name: string | null
          logo: string | null
          menu_preview: Json | null
          menu_url: string | null
          notes: string | null
          offer_claim_amount: string | null
          offer_end_date: string | null
          offer_image: string | null
          offer_name: string | null
          offer_start_date: string | null
          offer_terms: string | null
          offer_type: string | null
          offer_value: string | null
          phone: string | null
          plan: string
          referral_code: string | null
          referral_source: string | null
          referred_by: string | null
          status: string | null
          trial_expiry: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          additional_notes?: string | null
          business_address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_images?: Json | null
          business_name?: string | null
          business_postcode?: string | null
          business_tagline?: string | null
          business_tier?: string | null
          business_town?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          first_name?: string | null
          goals?: string | null
          id?: string
          instagram_handle?: string | null
          is_founder?: boolean
          last_name?: string | null
          logo?: string | null
          menu_preview?: Json | null
          menu_url?: string | null
          notes?: string | null
          offer_claim_amount?: string | null
          offer_end_date?: string | null
          offer_image?: string | null
          offer_name?: string | null
          offer_start_date?: string | null
          offer_terms?: string | null
          offer_type?: string | null
          offer_value?: string | null
          phone?: string | null
          plan?: string
          referral_code?: string | null
          referral_source?: string | null
          referred_by?: string | null
          status?: string | null
          trial_expiry?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          additional_notes?: string | null
          business_address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_images?: Json | null
          business_name?: string | null
          business_postcode?: string | null
          business_tagline?: string | null
          business_tier?: string | null
          business_town?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          first_name?: string | null
          goals?: string | null
          id?: string
          instagram_handle?: string | null
          is_founder?: boolean
          last_name?: string | null
          logo?: string | null
          menu_preview?: Json | null
          menu_url?: string | null
          notes?: string | null
          offer_claim_amount?: string | null
          offer_end_date?: string | null
          offer_image?: string | null
          offer_name?: string | null
          offer_start_date?: string | null
          offer_terms?: string | null
          offer_type?: string | null
          offer_value?: string | null
          phone?: string | null
          plan?: string
          referral_code?: string | null
          referral_source?: string | null
          referred_by?: string | null
          status?: string | null
          trial_expiry?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
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