export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row:    { id: string; user_id: string; name: string; kind: string; opening_balance: number; currency: string; created_at: string }
        Insert: { id?: string; user_id: string; name: string; kind: string; opening_balance: number; currency: string; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; kind?: string; opening_balance?: number; currency?: string; created_at?: string }
        Relationships: []
      }
      transactions: {
        Row:    { id: string; user_id: string; account_id: string; occurred_at: string; description: string; amount: number; direction: string; axis: string | null; category_id: string | null; counter_account_id: string | null; created_at: string }
        Insert: { id: string; user_id: string; account_id: string; occurred_at: string; description: string; amount: number; direction: string; axis?: string | null; category_id?: string | null; counter_account_id?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; account_id?: string; occurred_at?: string; description?: string; amount?: number; direction?: string; axis?: string | null; category_id?: string | null; counter_account_id?: string | null; created_at?: string }
        Relationships: []
      }
      categories: {
        Row:    { id: string; user_id: string; name: string; axis: string; color: string | null }
        Insert: { id?: string; user_id: string; name: string; axis: string; color?: string | null }
        Update: { id?: string; user_id?: string; name?: string; axis?: string; color?: string | null }
        Relationships: []
      }
      budgets: {
        Row:    { id: string; user_id: string; category_id: string | null; axis: string | null; limit_amount: number; period: string; created_at: string }
        Insert: { id?: string; user_id: string; category_id?: string | null; axis?: string | null; limit_amount: number; period: string; created_at?: string }
        Update: { id?: string; user_id?: string; category_id?: string | null; axis?: string | null; limit_amount?: number; period?: string; created_at?: string }
        Relationships: []
      }
      goals: {
        Row:    { id: string; user_id: string; name: string; target_amount: number; current_amount: number; deadline: string | null; priority: number; is_complete: boolean; created_at: string }
        Insert: { id?: string; user_id: string; name: string; target_amount: number; current_amount: number; deadline?: string | null; priority: number; is_complete: boolean; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; target_amount?: number; current_amount?: number; deadline?: string | null; priority?: number; is_complete?: boolean; created_at?: string }
        Relationships: []
      }
      recurring: {
        Row:    { id: string; user_id: string; account_id: string; description: string; amount: number; direction: string; axis: string | null; category_id: string | null; frequency: string; next_date: string; is_active: boolean; created_at: string }
        Insert: { id?: string; user_id: string; account_id: string; description: string; amount: number; direction: string; axis?: string | null; category_id?: string | null; frequency: string; next_date: string; is_active: boolean; created_at?: string }
        Update: { id?: string; user_id?: string; account_id?: string; description?: string; amount?: number; direction?: string; axis?: string | null; category_id?: string | null; frequency?: string; next_date?: string; is_active?: boolean; created_at?: string }
        Relationships: []
      }
      snapshots: {
        Row:    { id: string; user_id: string; account_id: string; date: string; balance: number }
        Insert: { id?: string; user_id: string; account_id: string; date: string; balance: number }
        Update: { id?: string; user_id?: string; account_id?: string; date?: string; balance?: number }
        Relationships: []
      }
    }
    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums:     Record<string, never>
  }
}
