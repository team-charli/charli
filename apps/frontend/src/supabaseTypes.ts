export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          confirmed_time_date: string | null
          counter_time_date: string | null
          created_at: string
          learner_id: number | null
          request_origin: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date: string | null
          room_link: string | null
          session_id: number
          teacher_id: number | null
        }
        Insert: {
          confirmed_time_date?: string | null
          counter_time_date?: string | null
          created_at?: string
          learner_id?: number | null
          request_origin: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date?: string | null
          room_link?: string | null
          session_id?: number
          teacher_id?: number | null
        }
        Update: {
          confirmed_time_date?: string | null
          counter_time_date?: string | null
          created_at?: string
          learner_id?: number | null
          request_origin?: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date?: string | null
          room_link?: string | null
          session_id?: number
          teacher_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sessions_learner_id"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sessions_teacher_id"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          }
        ]
      }
      user_data: {
        Row: {
          created_at: string
          default_native_language: string
          id: number
          name: string
          user_address: string
          wants_to_learn_langs: string[] | null
          wants_to_teach_langs: string[] | null
        }
        Insert: {
          created_at?: string
          default_native_language: string
          id?: number
          name: string
          user_address: string
          wants_to_learn_langs?: string[] | null
          wants_to_teach_langs?: string[] | null
        }
        Update: {
          created_at?: string
          default_native_language?: string
          id?: number
          name?: string
          user_address?: string
          wants_to_learn_langs?: string[] | null
          wants_to_teach_langs?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      request_origin_enum: "learner" | "teacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
