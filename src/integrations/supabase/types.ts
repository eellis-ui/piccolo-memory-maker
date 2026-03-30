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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliate_orders: {
        Row: {
          affiliate_id: string
          commission: number
          created_at: string
          id: string
          order_id: string | null
          order_total: number
          payout_eligible_at: string | null
          shopify_order_number: string | null
        }
        Insert: {
          affiliate_id: string
          commission?: number
          created_at?: string
          id?: string
          order_id?: string | null
          order_total?: number
          payout_eligible_at?: string | null
          shopify_order_number?: string | null
        }
        Update: {
          affiliate_id?: string
          commission?: number
          created_at?: string
          id?: string
          order_id?: string | null
          order_total?: number
          payout_eligible_at?: string | null
          shopify_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          created_at: string
          discount_code: string
          email: string
          full_name: string
          id: string
          instagram_handle: string | null
          shopify_price_rule_id: string | null
          tiktok_handle: string | null
          total_commission: number
          total_orders: number
          total_revenue: number
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_code: string
          email: string
          full_name: string
          id?: string
          instagram_handle?: string | null
          shopify_price_rule_id?: string | null
          tiktok_handle?: string | null
          total_commission?: number
          total_orders?: number
          total_revenue?: number
          user_id: string
        }
        Update: {
          created_at?: string
          discount_code?: string
          email?: string
          full_name?: string
          id?: string
          instagram_handle?: string | null
          shopify_price_rule_id?: string | null
          tiktok_handle?: string | null
          total_commission?: number
          total_orders?: number
          total_revenue?: number
          user_id?: string
        }
        Relationships: []
      }
      order_photos: {
        Row: {
          conversion_status: string
          converted_path: string | null
          created_at: string
          id: string
          is_approved: boolean
          is_landscape: boolean
          order_id: string
          original_path: string
          page_position: number
        }
        Insert: {
          conversion_status?: string
          converted_path?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          is_landscape?: boolean
          order_id: string
          original_path: string
          page_position: number
        }
        Update: {
          conversion_status?: string
          converted_path?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          is_landscape?: boolean
          order_id?: string
          original_path?: string
          page_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          builder_session_id: string | null
          builder_step: string
          cover_image_id: string | null
          cover_image_id_2: string | null
          cover_position_x: number
          cover_position_y: number
          cover_zoom: number
          created_at: string
          customer_email: string | null
          dedication_page_enabled: boolean
          dedication_page_text: string | null
          digital_download: boolean
          digital_pdf_path: string | null
          extra_pages: number
          id: string
          line_items: Json | null
          order_name: string | null
          payment_status: string
          production_pdf_path: string | null
          review_request_sent: boolean
          shipped_at: string | null
          shopify_order_number: string | null
          status: string
          title_page_enabled: boolean
          title_page_text: string
          tracking_number: string | null
          unique_photos: boolean
          user_id: string | null
        }
        Insert: {
          builder_session_id?: string | null
          builder_step?: string
          cover_image_id?: string | null
          cover_image_id_2?: string | null
          cover_position_x?: number
          cover_position_y?: number
          cover_zoom?: number
          created_at?: string
          customer_email?: string | null
          dedication_page_enabled?: boolean
          dedication_page_text?: string | null
          digital_download?: boolean
          digital_pdf_path?: string | null
          extra_pages?: number
          id?: string
          line_items?: Json | null
          order_name?: string | null
          payment_status?: string
          production_pdf_path?: string | null
          review_request_sent?: boolean
          shipped_at?: string | null
          shopify_order_number?: string | null
          status?: string
          title_page_enabled?: boolean
          title_page_text?: string
          tracking_number?: string | null
          unique_photos?: boolean
          user_id?: string | null
        }
        Update: {
          builder_session_id?: string | null
          builder_step?: string
          cover_image_id?: string | null
          cover_image_id_2?: string | null
          cover_position_x?: number
          cover_position_y?: number
          cover_zoom?: number
          created_at?: string
          customer_email?: string | null
          dedication_page_enabled?: boolean
          dedication_page_text?: string | null
          digital_download?: boolean
          digital_pdf_path?: string | null
          extra_pages?: number
          id?: string
          line_items?: Json | null
          order_name?: string | null
          payment_status?: string
          production_pdf_path?: string | null
          review_request_sent?: boolean
          shipped_at?: string | null
          shopify_order_number?: string | null
          status?: string
          title_page_enabled?: boolean
          title_page_text?: string
          tracking_number?: string | null
          unique_photos?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_approved: boolean
          is_verified: boolean
          rating: number
          review_text: string
          reviewer_name: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_approved?: boolean
          is_verified?: boolean
          rating: number
          review_text: string
          reviewer_name: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_approved?: boolean
          is_verified?: boolean
          rating?: number
          review_text?: string
          reviewer_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_orders_for_user: {
        Args: { _email: string; _session_id?: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_affiliate_totals: {
        Args: { _affiliate_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
