export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      content_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      },
      duty_roster: {
        Row: {
          created_at: string | null
          department: string
          end_time: string
          id: string
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          start_time: string
          status: Database["public"]["Enums"]["shift_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department: string
          end_time: string
          id?: string
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string
          end_time?: string
          id?: string
          shift_date?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_roster_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      // ... (rest of generated types omitted for brevity in this snippet)
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // function types ...
    }
    Enums: {
      medication_update_type: "initial" | "completion_update" | "transfer_update" | "manual_update"
      message_type: "text" | "file" | "image" | "voice"
      referral_status:
        | "Sent"
        | "Received"
        | "Acknowledged"
        | "Cancelled"
        | "Accepted"
        | "Closed"
        | "Transferred"
      referral_urgency: "Normal" | "Urgent" | "Emergency" | "Elective"
      shift_status: "Scheduled" | "Completed" | "Swapped"
      shift_type: "Day" | "Afternoon" | "Night"
      user_role: "PG" | "Senior Resident" | "House" | "Consultant"
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
    ? keyof (
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
      )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
    )[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

// ... additional helper generic types remained same as generated (omitted) 

export const Constants = {
  public: {
    Enums: {
      medication_update_type: ["initial", "completion_update", "transfer_update", "manual_update"],
      message_type: ["text", "file", "image", "voice"],
      referral_status: [
        "Sent",
        "Received",
        "Acknowledged",
        "Cancelled",
        "Accepted",
        "Closed",
        "Transferred",
      ],
      referral_urgency: ["Normal", "Urgent", "Emergency", "Elective"],
      shift_status: ["Scheduled", "Completed", "Swapped"],
      shift_type: ["Day", "Afternoon", "Night"],
      user_role: ["PG", "Senior Resident", "House", "Consultant"],
    },
  },
} as const
