"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { loginSchema, signupSchema, magicLinkSchema } from "@/lib/validations/auth"
import type { LoginInput, SignupInput, MagicLinkInput } from "@/lib/validations/auth"

export type AuthActionResult = {
  success: boolean
  error?: string
}

export async function login(data: LoginInput): Promise<AuthActionResult> {
  const validation = loginSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  })

  if (error) {
    return {
      success: false,
      error: error.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect"
        : error.message,
    }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signup(data: SignupInput): Promise<AuthActionResult> {
  const validation = signupSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""}/callback`,
    },
  })

  if (error) {
    if (error.message.includes("already registered")) {
      return {
        success: false,
        error: "Cet email est déjà utilisé",
      }
    }
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
  }
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

export async function sendMagicLink(data: MagicLinkInput): Promise<AuthActionResult> {
  const validation = magicLinkSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: validation.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""}/callback`,
    },
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
  }
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserHousehold() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role, households(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  return membership
}
