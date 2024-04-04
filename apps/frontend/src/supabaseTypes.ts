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
          controller_address: string | null
          controller_claim_keyid: string | null
          controller_claim_user_id: string | null
          controller_public_key: string | null
          counter_time_date: string | null
          created_at: string
          hashed_learner_address: string | null
          hashed_teacher_address: string | null
          huddle_room_id: string | null
          learner_id: number | null
          learner_joined_signature: string | null
          learner_joined_timestamp: string | null
          learner_joined_timestamp_worker_sig: string | null
          learner_left_signature: string | null
          learner_left_timestamp: string | null
          learner_left_timestamp_worker_sig: string | null
          request_origin: number | null
          request_origin_type: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date: string | null
          requested_session_duration: number | null
          session_id: number
          session_rejected_reason:
            | Database["public"]["Enums"]["session_req_reject_reason"]
            | null
          teacher_id: number | null
          teacher_joined_signature: string | null
          teacher_joined_timestamp: string | null
          teacher_joined_timestamp_worker_sig: string | null
          teacher_left_signature: string | null
          teacher_left_timestamp: string | null
          teacher_left_timestamp_worker_sig: string | null
          teaching_lang: string | null
        }
        Insert: {
          confirmed_time_date?: string | null
          controller_address?: string | null
          controller_claim_keyid?: string | null
          controller_claim_user_id?: string | null
          controller_public_key?: string | null
          counter_time_date?: string | null
          created_at?: string
          hashed_learner_address?: string | null
          hashed_teacher_address?: string | null
          huddle_room_id?: string | null
          learner_id?: number | null
          learner_joined_signature?: string | null
          learner_joined_timestamp?: string | null
          learner_joined_timestamp_worker_sig?: string | null
          learner_left_signature?: string | null
          learner_left_timestamp?: string | null
          learner_left_timestamp_worker_sig?: string | null
          request_origin?: number | null
          request_origin_type: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date?: string | null
          requested_session_duration?: number | null
          session_id?: number
          session_rejected_reason?:
            | Database["public"]["Enums"]["session_req_reject_reason"]
            | null
          teacher_id?: number | null
          teacher_joined_signature?: string | null
          teacher_joined_timestamp?: string | null
          teacher_joined_timestamp_worker_sig?: string | null
          teacher_left_signature?: string | null
          teacher_left_timestamp?: string | null
          teacher_left_timestamp_worker_sig?: string | null
          teaching_lang?: string | null
        }
        Update: {
          confirmed_time_date?: string | null
          controller_address?: string | null
          controller_claim_keyid?: string | null
          controller_claim_user_id?: string | null
          controller_public_key?: string | null
          counter_time_date?: string | null
          created_at?: string
          hashed_learner_address?: string | null
          hashed_teacher_address?: string | null
          huddle_room_id?: string | null
          learner_id?: number | null
          learner_joined_signature?: string | null
          learner_joined_timestamp?: string | null
          learner_joined_timestamp_worker_sig?: string | null
          learner_left_signature?: string | null
          learner_left_timestamp?: string | null
          learner_left_timestamp_worker_sig?: string | null
          request_origin?: number | null
          request_origin_type?: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date?: string | null
          requested_session_duration?: number | null
          session_id?: number
          session_rejected_reason?:
            | Database["public"]["Enums"]["session_req_reject_reason"]
            | null
          teacher_id?: number | null
          teacher_joined_signature?: string | null
          teacher_joined_timestamp?: string | null
          teacher_joined_timestamp_worker_sig?: string | null
          teacher_left_signature?: string | null
          teacher_left_timestamp?: string | null
          teacher_left_timestamp_worker_sig?: string | null
          teaching_lang?: string | null
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
          },
          {
            foreignKeyName: "public_sessions_request_origin_fkey"
            columns: ["request_origin"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
        ]
      }
      user_data: {
        Row: {
          created_at: string
          default_native_language: string
          id: number
          name: string
          user_address: string | null
          wants_to_learn_langs: string[] | null
          wants_to_teach_langs: string[] | null
        }
        Insert: {
          created_at?: string
          default_native_language: string
          id?: number
          name: string
          user_address?: string | null
          wants_to_learn_langs?: string[] | null
          wants_to_teach_langs?: string[] | null
        }
        Update: {
          created_at?: string
          default_native_language?: string
          id?: number
          name?: string
          user_address?: string | null
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
      get_eth_address_from_jwt: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      request_origin_enum: "learner" | "teacher"
      session_req_reject_reason: "no_time" | "no_interest" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
