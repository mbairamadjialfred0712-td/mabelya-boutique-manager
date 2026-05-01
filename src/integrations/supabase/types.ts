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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          boutique_id: string
          budget: number
          campaign_name: string
          clicks: number
          conversions: number
          created_at: string
          end_date: string | null
          id: string
          impressions: number
          platform: string
          spent: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          boutique_id: string
          budget?: number
          campaign_name: string
          clicks?: number
          conversions?: number
          created_at?: string
          end_date?: string | null
          id?: string
          impressions?: number
          platform?: string
          spent?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          boutique_id?: string
          budget?: number
          campaign_name?: string
          clicks?: number
          conversions?: number
          created_at?: string
          end_date?: string | null
          id?: string
          impressions?: number
          platform?: string
          spent?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          app_name: string
          id: string
          logo_url: string | null
          updated_at: string
          updated_by: string | null
          welcome_message: string
        }
        Insert: {
          app_name?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
          updated_by?: string | null
          welcome_message?: string
        }
        Update: {
          app_name?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
          updated_by?: string | null
          welcome_message?: string
        }
        Relationships: []
      }
      boutiques: {
        Row: {
          address: string | null
          country_id: string
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          country_id: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          country_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boutiques_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          acquisition_channel: string | null
          age_range: string | null
          boutique_id: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          is_archived: boolean
          notes: string | null
          phone: string | null
          status: string | null
          total_spent: number
          updated_at: string
          visit_count: number
        }
        Insert: {
          acquisition_channel?: string | null
          age_range?: string | null
          boutique_id?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_archived?: boolean
          notes?: string | null
          phone?: string | null
          status?: string | null
          total_spent?: number
          updated_at?: string
          visit_count?: number
        }
        Update: {
          acquisition_channel?: string | null
          age_range?: string | null
          boutique_id?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_archived?: boolean
          notes?: string | null
          phone?: string | null
          status?: string | null
          total_spent?: number
          updated_at?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          boutique_id: string
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          boutique_id: string
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          boutique_id?: string
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          boutique_id: string
          category_id: string | null
          color: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          is_archived: boolean | null
          name: string
          purchase_price: number
          selling_price: number
          size: string | null
          stock_initial: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          boutique_id: string
          category_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          name: string
          purchase_price?: number
          selling_price?: number
          size?: string | null
          stock_initial?: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          boutique_id?: string
          category_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          name?: string
          purchase_price?: number
          selling_price?: number
          size?: string | null
          stock_initial?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_showcase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          boutique_id: string
          client_id: string | null
          created_at: string
          customer_name: string | null
          id: string
          invoice_number: string
          payment_method: string
          status: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          boutique_id: string
          client_id?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          invoice_number?: string
          payment_method: string
          status?: string | null
          total_amount?: number
          user_id: string
        }
        Update: {
          boutique_id?: string
          client_id?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          invoice_number?: string
          payment_method?: string
          status?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          boutique_id: string
          country_id: string | null
          created_at: string
          full_name: string
          hire_date: string
          id: string
          is_active: boolean
          phone: string | null
          role: string
          salary: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          boutique_id: string
          country_id?: string | null
          created_at?: string
          full_name: string
          hire_date?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          salary?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          boutique_id?: string
          country_id?: string | null
          created_at?: string
          full_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          salary?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_expenses: {
        Row: {
          amount: number
          boutique_id: string | null
          category: string
          created_at: string | null
          description: string
          expense_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          boutique_id?: string | null
          category?: string
          created_at?: string | null
          description: string
          expense_date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          boutique_id?: string | null
          category?: string
          created_at?: string | null
          description?: string
          expense_date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_expenses_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      products_showcase: {
        Row: {
          color: string | null
          id: string | null
          image_url: string | null
          name: string | null
          selling_price: number | null
          size: string | null
          stock_quantity: number | null
        }
        Insert: {
          color?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          selling_price?: number | null
          size?: string | null
          stock_quantity?: number | null
        }
        Update: {
          color?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          selling_price?: number | null
          size?: string | null
          stock_quantity?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_stock: {
        Args: { product_id: string; qty: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin_boutique" | "sales_staff"
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
      app_role: ["super_admin", "admin_boutique", "sales_staff"],
    },
  },
} as const
