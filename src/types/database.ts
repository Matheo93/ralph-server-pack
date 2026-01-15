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
      users: {
        Row: {
          id: string
          email: string
          auth_provider: string
          language: string
          timezone: string
          role: string
          avatar_url: string | null
          device_tokens: Json
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          auth_provider?: string
          language?: string
          timezone?: string
          role?: string
          avatar_url?: string | null
          device_tokens?: Json
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          auth_provider?: string
          language?: string
          timezone?: string
          role?: string
          avatar_url?: string | null
          device_tokens?: Json
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          name: string
          country: string
          timezone: string
          streak_current: number
          streak_best: number
          streak_last_update: string
          subscription_status: string
          subscription_ends_at: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          country?: string
          timezone?: string
          streak_current?: number
          streak_best?: number
          streak_last_update?: string
          subscription_status?: string
          subscription_ends_at?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          country?: string
          timezone?: string
          streak_current?: number
          streak_best?: number
          streak_last_update?: string
          subscription_status?: string
          subscription_ends_at?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: string
          joined_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role?: string
          joined_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      invitations: {
        Row: {
          id: string
          household_id: string
          email: string
          role: string
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          email: string
          role?: string
          token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          email?: string
          role?: string
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      children: {
        Row: {
          id: string
          household_id: string
          first_name: string
          birthdate: string
          gender: string | null
          school_name: string | null
          school_level: string | null
          school_class: string | null
          tags: Json
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          first_name: string
          birthdate: string
          gender?: string | null
          school_name?: string | null
          school_level?: string | null
          school_class?: string | null
          tags?: Json
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          first_name?: string
          birthdate?: string
          gender?: string | null
          school_name?: string | null
          school_level?: string | null
          school_class?: string | null
          tags?: Json
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      task_categories: {
        Row: {
          id: string
          code: string
          name_fr: string
          name_en: string
          icon: string | null
          color: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          code: string
          name_fr: string
          name_en: string
          icon?: string | null
          color?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          code?: string
          name_fr?: string
          name_en?: string
          icon?: string | null
          color?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          id: string
          country: string
          category_id: string | null
          age_min: number | null
          age_max: number | null
          school_level: string | null
          title_fr: string
          title_en: string
          description_fr: string | null
          description_en: string | null
          recurrence_rule: Json | null
          period_trigger: string | null
          default_deadline_days: number
          load_weight: number
          is_critical: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          country?: string
          category_id?: string | null
          age_min?: number | null
          age_max?: number | null
          school_level?: string | null
          title_fr: string
          title_en: string
          description_fr?: string | null
          description_en?: string | null
          recurrence_rule?: Json | null
          period_trigger?: string | null
          default_deadline_days?: number
          load_weight?: number
          is_critical?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          country?: string
          category_id?: string | null
          age_min?: number | null
          age_max?: number | null
          school_level?: string | null
          title_fr?: string
          title_en?: string
          description_fr?: string | null
          description_en?: string | null
          recurrence_rule?: Json | null
          period_trigger?: string | null
          default_deadline_days?: number
          load_weight?: number
          is_critical?: boolean
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          household_id: string
          child_id: string | null
          category_id: string | null
          template_id: string | null
          title: string
          description: string | null
          source: string
          vocal_transcript: string | null
          vocal_audio_url: string | null
          status: string
          priority: string
          deadline: string | null
          deadline_flexible: boolean
          completed_at: string | null
          postponed_to: string | null
          assigned_to: string | null
          created_by: string | null
          load_weight: number
          is_critical: boolean
          recurrence_rule: Json | null
          parent_task_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          child_id?: string | null
          category_id?: string | null
          template_id?: string | null
          title: string
          description?: string | null
          source: string
          vocal_transcript?: string | null
          vocal_audio_url?: string | null
          status?: string
          priority?: string
          deadline?: string | null
          deadline_flexible?: boolean
          completed_at?: string | null
          postponed_to?: string | null
          assigned_to?: string | null
          created_by?: string | null
          load_weight?: number
          is_critical?: boolean
          recurrence_rule?: Json | null
          parent_task_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          child_id?: string | null
          category_id?: string | null
          template_id?: string | null
          title?: string
          description?: string | null
          source?: string
          vocal_transcript?: string | null
          vocal_audio_url?: string | null
          status?: string
          priority?: string
          deadline?: string | null
          deadline_flexible?: boolean
          completed_at?: string | null
          postponed_to?: string | null
          assigned_to?: string | null
          created_by?: string | null
          load_weight?: number
          is_critical?: boolean
          recurrence_rule?: Json | null
          parent_task_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          }
        ]
      }
      task_history: {
        Row: {
          id: string
          task_id: string
          user_id: string | null
          action: string
          old_value: Json | null
          new_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id?: string | null
          action: string
          old_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string | null
          action?: string
          old_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      load_snapshots: {
        Row: {
          id: string
          household_id: string
          user_id: string | null
          period_start: string
          period_end: string
          total_load: number
          tasks_completed: number
          percentage: number | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id?: string | null
          period_start: string
          period_end: string
          total_load?: number
          tasks_completed?: number
          percentage?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string | null
          period_start?: string
          period_end?: string
          total_load?: number
          tasks_completed?: number
          percentage?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "load_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "load_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      streak_history: {
        Row: {
          id: string
          household_id: string
          streak_date: string
          streak_value: number
          was_broken: boolean
          joker_used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          streak_date: string
          streak_value: number
          was_broken?: boolean
          joker_used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          streak_date?: string
          streak_value?: number
          was_broken?: boolean
          joker_used?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_history_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          household_id: string | null
          type: string
          title: string
          body: string | null
          is_read: boolean
          is_sent: boolean
          scheduled_for: string | null
          sent_at: string | null
          is_aggregated: boolean
          aggregation_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id?: string | null
          household_id?: string | null
          type: string
          title: string
          body?: string | null
          is_read?: boolean
          is_sent?: boolean
          scheduled_for?: string | null
          sent_at?: string | null
          is_aggregated?: boolean
          aggregation_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string | null
          household_id?: string | null
          type?: string
          title?: string
          body?: string | null
          is_read?: boolean
          is_sent?: boolean
          scheduled_for?: string | null
          sent_at?: string | null
          is_aggregated?: boolean
          aggregation_key?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      device_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: string
          last_used: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform?: string
          last_used?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: string
          last_used?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          household_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: string
          plan: string
          amount: number | null
          currency: string
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: string
          plan?: string
          amount?: number | null
          currency?: string
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: string
          plan?: string
          amount?: number | null
          currency?: string
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      member_exclusions: {
        Row: {
          id: string
          member_id: string
          household_id: string
          exclude_from: string
          exclude_until: string
          reason: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          household_id: string
          exclude_from: string
          exclude_until: string
          reason: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          household_id?: string
          exclude_from?: string
          exclude_until?: string
          reason?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_exclusions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_exclusions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_age: {
        Args: {
          birthdate: string
        }
        Returns: number
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

// Helper types for easier usage
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Insertable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type Updateable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

// Common entity types
export type User = Tables<"users">
export type Household = Tables<"households">
export type HouseholdMember = Tables<"household_members">
export type Child = Tables<"children">
export type Task = Tables<"tasks">
export type TaskCategory = Tables<"task_categories">
export type TaskTemplate = Tables<"task_templates">
export type Notification = Tables<"notifications">
export type Subscription = Tables<"subscriptions">
export type Invitation = Tables<"invitations">
export type MemberExclusion = Tables<"member_exclusions">
