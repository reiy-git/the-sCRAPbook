"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AuthFormState } from "@/lib/types";

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  let error: { message: string } | null = null;

  try {
    const supabase = await createClient();
    const result = await supabase.auth.signInWithPassword({ email, password });
    error = result.error;
  } catch (cause) {
    console.error("Login action failed:", cause);
    return {
      message:
        "Authentication is temporarily unavailable. Check the Vercel Supabase environment variables and redeploy.",
    };
  }

  if (error) {
    return { message: error.message };
  }

  redirect("/dashboard");
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string)?.trim();

  if (!email || !password || !username) {
    return { message: "Username, email, and password are required." };
  }

  if (password.length < 6) {
    return { message: "Password must be at least 6 characters." };
  }

  let error: { message: string } | null = null;
  let requiresEmailConfirmation = false;
  try {
    const supabase = await createClient();
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    error = result.error;
    requiresEmailConfirmation = !result.data.session;
  } catch (cause) {
    console.error("Signup action failed:", cause);
    return {
      message:
        "Authentication is temporarily unavailable. Check the Vercel Supabase environment variables and redeploy.",
    };
  }

  if (error) {
    return { message: error.message };
  }

  if (requiresEmailConfirmation) {
    return {
      message: "Account created. Check your email and confirm your address before logging in.",
    };
  }

  redirect("/dashboard");
}

export async function updatePassword(
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!newPassword || newPassword.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await supabase.from("entries").delete().eq("user_id", user.id);
    await supabase.from("diaries").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete account",
    };
  }

  return { success: true };
}
