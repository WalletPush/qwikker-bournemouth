// Database-specific types for Supabase integration

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          referral_source: string | null;
          goals: string | null;
          notes: string | null;
          business_name: string | null;
          business_type: string | null;
          business_category: string | null;
          business_address: string | null;
          business_town: string | null;
          business_postcode: string | null;
          website_url: string | null;
          instagram_handle: string | null;
          facebook_url: string | null;
          logo: string | null;
          offer_name: string | null;
          offer_type: string | null;
          offer_value: string | null;
          offer_claim_amount: string | null;
          offer_start_date: string | null;
          offer_end_date: string | null;
          offer_terms: string | null;
          offer_image: string | null;
          plan: string;
          trial_expiry: string | null;
          is_founder: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          referral_source?: string | null;
          goals?: string | null;
          notes?: string | null;
          business_name?: string | null;
          business_type?: string | null;
          business_category?: string | null;
          business_address?: string | null;
          business_town?: string | null;
          business_postcode?: string | null;
          website_url?: string | null;
          instagram_handle?: string | null;
          facebook_url?: string | null;
          logo?: string | null;
          offer_name?: string | null;
          offer_type?: string | null;
          offer_value?: string | null;
          offer_claim_amount?: string | null;
          offer_start_date?: string | null;
          offer_end_date?: string | null;
          offer_terms?: string | null;
          offer_image?: string | null;
          plan?: string;
          trial_expiry?: string | null;
          is_founder?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          referral_source?: string | null;
          goals?: string | null;
          notes?: string | null;
          business_name?: string | null;
          business_type?: string | null;
          business_category?: string | null;
          business_address?: string | null;
          business_town?: string | null;
          business_postcode?: string | null;
          website_url?: string | null;
          instagram_handle?: string | null;
          facebook_url?: string | null;
          logo?: string | null;
          offer_name?: string | null;
          offer_type?: string | null;
          offer_value?: string | null;
          offer_claim_amount?: string | null;
          offer_start_date?: string | null;
          offer_end_date?: string | null;
          offer_terms?: string | null;
          offer_image?: string | null;
          plan?: string;
          trial_expiry?: string | null;
          is_founder?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
