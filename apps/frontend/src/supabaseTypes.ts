export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          created_at: string
          DEFAULT_NATIVE_LANGUAGE: string
          HAS_WALLET_DEPLOYED: boolean
          id: number
          NAME: string
          WANTS_TO_LEARN_LANGS: string[] | null
          WANTS_TO_TEACH_LANGS: string[] | null
        }
        Insert: {
          created_at?: string
          DEFAULT_NATIVE_LANGUAGE: string
          HAS_WALLET_DEPLOYED?: boolean
          id?: number
          NAME: string
          WANTS_TO_LEARN_LANGS?: string[] | null
          WANTS_TO_TEACH_LANGS?: string[] | null
        }
        Update: {
          created_at?: string
          DEFAULT_NATIVE_LANGUAGE?: string
          HAS_WALLET_DEPLOYED?: boolean
          id?: number
          NAME?: string
          WANTS_TO_LEARN_LANGS?: string[] | null
          WANTS_TO_TEACH_LANGS?: string[] | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
