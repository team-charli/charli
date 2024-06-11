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
      language_interest: {
        Row: {
          created_at: string | null
          id: number
          interest_type: string | null
          language_id: number
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          interest_type?: string | null
          language_id: number
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          interest_type?: string | null
          language_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_language"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          country_code: string | null
          emoji: string | null
          id: number
          language_code: string
          name: string
        }
        Insert: {
          country_code?: string | null
          emoji?: string | null
          id?: number
          language_code: string
          name: string
        }
        Update: {
          country_code?: string | null
          emoji?: string | null
          id?: number
          language_code?: string
          name?: string
        }
        Relationships: []
      }
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
          ipfs_cid_learner: string | null
          ipfs_cid_teacher: string | null
          learner_id: number | null
          learner_signed_duration_ipfs_cid: string | null
          request_origin: number | null
          request_origin_type: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date: string | null
          requested_session_duration: number | null
          requested_session_duration_learner_sig: string | null
          requested_session_duration_teacher_sig: string | null
          session_id: number
          session_rejected_reason:
            | Database["public"]["Enums"]["session_req_reject_reason"]
            | null
          session_resolved: boolean | null
          teacher_id: number | null
          teacher_signed_duration_ipfs_cid: string | null
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
          ipfs_cid_learner?: string | null
          ipfs_cid_teacher?: string | null
          learner_id?: number | null
          learner_signed_duration_ipfs_cid?: string | null
          request_origin?: number | null
          request_origin_type: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date?: string | null
          requested_session_duration?: number | null
          requested_session_duration_learner_sig?: string | null
          requested_session_duration_teacher_sig?: string | null
          session_id?: number
          session_rejected_reason?:
            | Database["public"]["Enums"]["session_req_reject_reason"]
            | null
          session_resolved?: boolean | null
          teacher_id?: number | null
          teacher_signed_duration_ipfs_cid?: string | null
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
          ipfs_cid_learner?: string | null
          ipfs_cid_teacher?: string | null
          learner_id?: number | null
          learner_signed_duration_ipfs_cid?: string | null
          request_origin?: number | null
          request_origin_type?: Database["public"]["Enums"]["request_origin_enum"]
          request_time_date?: string | null
          requested_session_duration?: number | null
          requested_session_duration_learner_sig?: string | null
          requested_session_duration_teacher_sig?: string | null
          session_id?: number
          session_rejected_reason?:
            | Database["public"]["Enums"]["session_req_reject_reason"]
            | null
          session_resolved?: boolean | null
          teacher_id?: number | null
          teacher_signed_duration_ipfs_cid?: string | null
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
          wants_to_learn_langs: number[] | null
          wants_to_teach_langs: number[] | null
        }
        Insert: {
          created_at?: string
          default_native_language: string
          id?: number
          name: string
          user_address?: string | null
          wants_to_learn_langs?: number[] | null
          wants_to_teach_langs?: number[] | null
        }
        Update: {
          created_at?: string
          default_native_language?: string
          id?: number
          name?: string
          user_address?: string | null
          wants_to_learn_langs?: number[] | null
          wants_to_teach_langs?: number[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_wants_to_learn_langs: {
        Args: {
          langs: number[]
        }
        Returns: boolean
      }
      check_wants_to_teach_langs: {
        Args: {
          langs: number[]
        }
        Returns: boolean
      }
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
