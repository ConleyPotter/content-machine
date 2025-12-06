import { getSupabase } from "../../db/supabase";

interface LogoutSuccess {
  success: true;
}

interface LogoutFailure {
  success: false;
  error: string;
}

type LogoutResponse = LogoutSuccess | LogoutFailure;

export const logout = async (): Promise<LogoutResponse> => {
  const supabase = getSupabase();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Auth logout failed", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected logout error";
    console.error("Auth logout unexpected error", err);
    return { success: false, error: message };
  }
};

export default logout;
