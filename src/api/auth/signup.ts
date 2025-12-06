import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/db/supabase";
import { logSystemEvent } from "../../repos/systemEvents";
import type { Json } from "../../db/types";
import { signupRequestSchema, type SignupRequest } from "../../schemas/apiSchemas";

interface SignupSuccess {
  success: true;
  data: {
    user: Pick<User, "id" | "email">;
    message: string;
  };
}

interface SignupFailure {
  success: false;
  error: string;
}

type SignupResponse = SignupSuccess | SignupFailure;

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
    console.error("[auth] Failed to log auth event", eventType, err);
  }
};

export const signup = async (rawBody: unknown): Promise<SignupResponse> => {
  const supabase = getSupabase();

  let credentials: SignupRequest;
  try {
    credentials = signupRequestSchema.parse(rawBody ?? {});
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid signup payload";
    await logAuthEvent("auth.signup.error", { message });
    console.error("[auth] Signup validation failed", err);
    return { success: false, error: message };
  }

  await logAuthEvent("auth.signup.start", { email: credentials.email });

  try {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error || !data.user) {
      const message = error?.message ?? "Sign-up failed";
      await logAuthEvent("auth.signup.error", {
        email: credentials.email,
        message,
      });
      console.error("[auth] Sign-up failed", error);
      return { success: false, error: message };
    }

    const userEmail = data.user.email ?? credentials.email;
    await logAuthEvent("auth.signup.success", {
      email: userEmail,
      userId: data.user.id,
    });

    return {
      success: true,
      data: {
        user: { id: data.user.id, email: userEmail },
        message: "Sign-up successful. Please verify your email.",
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected sign-up error";
    await logAuthEvent("auth.signup.error", {
      email: credentials.email,
      message,
    });
    console.error("[auth] Unexpected sign-up error", err);
    return { success: false, error: message };
  }
};

export default signup;
