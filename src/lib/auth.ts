import type { User } from "@supabase/supabase-js";
import { requireSupabaseClient } from "@/lib/supabase";
import { getProfileColor } from "@/lib/profile-colors";

const mapAuthError = (error: { code?: string; message?: string } | null) => {
  if (!error) return new Error("Ocurrió un error inesperado.");

  const code = error.code ?? "";
  const message = error.message?.toLowerCase() ?? "";

  if (code === "invalid_credentials" || message.includes("invalid login credentials") || message.includes("credenciales invalidas")) {
    return new Error("Correo o contraseña incorrectos.");
  }

  if (code === "user_already_exists" || message.includes("already registered") || message.includes("ya está registrado")) {
    return new Error("Este correo ya está registrado.");
  }

  if (code === "email_not_confirmed" || message.includes("not confirmed") || message.includes("sin confirmar")) {
    return new Error("Debés confirmar tu correo antes de iniciar sesión.");
  }

  if (code === "over_email_send_rate_limit" || message.includes("too many requests") || message.includes("demasiados intentos")) {
    return new Error("Demasiados intentos. Esperá unos minutos e intentá nuevamente.");
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return new Error("Demasiados intentos. Esperá unos minutos e intentá nuevamente.");
  }

  if (message.includes("otp") || message.includes("codigo") || message.includes("verification code") || message.includes("token") || message.includes("inválido")) {
    return new Error("El código de verificación es inválido o expiró. Pedí uno nuevo.");
  }

  return new Error("No se pudo completar la operación. Intentá nuevamente.");
};

async function getProfileAccessStatus(client: ReturnType<typeof requireSupabaseClient>, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, profile_color, role, is_blocked, blocked_reason")
    .eq("id", userId)
    .maybeSingle();

  if (!error) {
    return {
      is_blocked: Boolean((data as { is_blocked?: boolean } | null)?.is_blocked),
      blocked_reason: (data as { blocked_reason?: string | null } | null)?.blocked_reason ?? null,
    };
  }

  if (error.code === "42703") {
    const { data: fallbackData, error: fallbackError } = await client
      .from("profiles")
      .select("id, full_name, avatar_url, profile_color, role")
      .eq("id", userId)
      .maybeSingle();

    if (fallbackError) throw mapAuthError(fallbackError);
    return {
      is_blocked: false,
      blocked_reason: null,
      profile: fallbackData,
    };
  }

  throw mapAuthError(error);
}

export async function signInWithPassword(email: string, password: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw mapAuthError(error);

  const profileStatus = await getProfileAccessStatus(client, data.user.id);
  if (profileStatus.is_blocked) {
    await client.auth.signOut();
    throw new Error("Tu cuenta está bloqueada por el administrador.");
  }

  return data.user as User;
}

export async function signUp(email: string, password: string, full_name: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
    },
  });

  if (error) throw mapAuthError(error);

  const user = data.user as User | null;
  if (!user) {
    throw new Error("La cuenta se creó, pero necesitás confirmar tu correo antes de iniciar sesión.");
  }

  const { error: profileError } = await client.from("profiles").upsert({
    id: user.id,
    full_name: full_name.trim() || user.email?.split("@")[0] || "Usuario",
    avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? user.user_metadata?.avatar ?? null,
    profile_color: getProfileColor(full_name),
    role: "reader",
  }, { onConflict: "id" });

  if (profileError) {
    console.warn("No se pudo crear el perfil del usuario al registrarse:", profileError);
  }

  return user;
}

export async function signInWithOAuth(provider: "google" | "facebook") {
  const client = requireSupabaseClient();

  if (typeof window === "undefined") {
    throw new Error("La autenticación social solo está disponible en el navegador.");
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw mapAuthError(error);
  return data;
}

export async function sendPasswordRecoveryCode(email: string) {
  const client = requireSupabaseClient();

  if (!email || !email.trim() || !email.includes("@")) {
    throw new Error("Ingresá un correo electrónico válido.");
  }

  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/restablecer-contrasena` : undefined,
    },
  });

  if (error) throw mapAuthError(error);
  return { ok: true };
}

export async function verifyPasswordRecoveryCode(email: string, token: string) {
  const client = requireSupabaseClient();
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("Ingresá el código de verificación.");
  }

  const { data, error } = await client.auth.verifyOtp({
    email: email.trim(),
    token: normalizedToken,
    type: "email",
  });

  if (error) throw mapAuthError(error);
  return data.session?.user ?? null;
}

export async function updatePassword(newPassword: string) {
  const client = requireSupabaseClient();

  if (!newPassword || newPassword.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const { data, error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw mapAuthError(error);
  return data.user;
}

export async function resetPasswordForEmail(email: string) {
  const client = requireSupabaseClient();

  if (typeof window === "undefined") {
    throw new Error("La recuperación de contraseña solo está disponible en el navegador.");
  }

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/restablecer-contrasena`,
  });

  if (error) throw mapAuthError(error);
  return { ok: true };
}

export async function signOut() {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) throw mapAuthError(error);
  return true;
}

export async function getSession() {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw mapAuthError(error);
  return data.session?.user ?? null;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const client = requireSupabaseClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
