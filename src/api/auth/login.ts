import type { User } from "@supabase/supabase-js";
import { getSupabase } from "../../db/supabase";
import { logSystemEvent } from "../../repos/systemEvents";
import type { Json } from "../../db/types";
import { loginRequestSchema, type LoginRequest } from "../../schemas/apiSchemas";

interface LoginSuccess {
  success: true;
  data: { token: string; user: User };
}

interface LoginFailure {
  success: false;
  error: string;
}

type LoginResponse = LoginSuccess | LoginFailure;

const logAuthEvent = async (
  eventType: string,
  payload: Record<string, unknown> = {},
) => {
  try {
    await logSystemEvent({
      agent_name: "AuthAPI",
      event_type: eventType,
      payload: payload as Json,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Failed to log auth event ${eventType}`, err);
  }
};

export const login = async (rawBody: unknown): Promise<LoginResponse> => {
  const supabase = getSupabase();
  const credentials: LoginRequest = loginRequestSchema.parse(rawBody ?? {});

  await logAuthEvent("auth.login.start", { email: credentials.email });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error || !data.session || !data.user) {
      const message = error?.message ?? "Invalid credentials";
      await logAuthEvent("auth.login.error", {
        email: credentials.email,
        message,
      });
      console.error("Auth login failed", error);
      return { success: false, error: message };
    }

    const token = data.session.access_token;
    await logAuthEvent("auth.login.success", {
      email: credentials.email,
      userId: data.user.id,
    });

    return { success: true, data: { token, user: data.user } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected login error";
    await logAuthEvent("auth.login.error", {
      email: credentials.email,
      message,
    });
    console.error("Auth login unexpected error", err);
    return { success: false, error: message };
  }
};

export default login;
