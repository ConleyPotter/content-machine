import { supabase } from "../db/db";
import type { Tables, TablesInsert, TablesUpdate } from "../db/types";
import { identifierSchema, jsonSchema, nullableDateSchema, z } from "./validators";

const scriptInsertSchema = z.object({
  created_at: nullableDateSchema,
  creative_variables: jsonSchema.nullable().optional(),
  hook: z.string().trim().nullable().optional(),
  product_id: identifierSchema.nullable().optional(),
  script_id: identifierSchema.optional(),
  script_text: z.string().min(1, "Script text is required"),
});

const scriptUpdateSchema = scriptInsertSchema.partial();

const scriptIdSchema = identifierSchema.describe("script_id");

export const createScript = async (payload: TablesInsert<"scripts">) => {
  const validated = scriptInsertSchema.parse(payload);
  const { data, error } = await supabase
    .from("scripts")
    .insert(validated)
    .select("*")
    .returns<Tables<"scripts">[]>()
    .single();

  if (error) {
    throw new Error(`Failed to create script: ${error.message}`);
  }

  return data;
};

export const listScripts = async () => {
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Tables<"scripts">[]>();

  if (error) {
    throw new Error(`Failed to list scripts: ${error.message}`);
  }

  return data ?? [];
};

export const getScriptById = async (scriptId: string) => {
  const validatedId = scriptIdSchema.parse(scriptId);
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("script_id", validatedId)
    .returns<Tables<"scripts">[]>()
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch script with id ${validatedId}: ${error.message}`,
    );
  }

  return data;
};

export const updateScript = async (
  scriptId: string,
  changes: TablesUpdate<"scripts">,
) => {
  const validatedId = scriptIdSchema.parse(scriptId);
  const validatedChanges = scriptUpdateSchema.parse(changes);
  const { data, error } = await supabase
    .from("scripts")
    .update(validatedChanges)
    .eq("script_id", validatedId)
    .select("*")
    .returns<Tables<"scripts">[]>()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update script ${validatedId}: ${error.message}`);
  }

  return data;
};

export const deleteScript = async (scriptId: string) => {
  const validatedId = scriptIdSchema.parse(scriptId);
  const { data, error } = await supabase
    .from("scripts")
    .delete()
    .eq("script_id", validatedId)
    .select("*")
    .returns<Tables<"scripts">[]>()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete script ${validatedId}: ${error.message}`);
  }

  return data;
};

export const listScriptsForProduct = async (productId: string) => {
  const validatedProductId = identifierSchema.parse(productId);
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("product_id", validatedProductId)
    .order("created_at", { ascending: false })
    .returns<Tables<"scripts">[]>();

  if (error) {
    throw new Error(
      `Failed to list scripts for product ${validatedProductId}: ${error.message}`,
    );
  }

  return data ?? [];
};

export const searchScriptsByHook = async (hookFragment: string) => {
  const validatedFragment = identifierSchema.parse(hookFragment);
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .ilike("hook", `%${validatedFragment}%`)
    .returns<Tables<"scripts">[]>();

  if (error) {
    throw new Error(
      `Failed to search scripts by hook ${validatedFragment}: ${error.message}`,
    );
  }

  return data ?? [];
};

export const listRecentScripts = async (limit = 10) => {
  const validatedLimit = z.number().int().positive().parse(limit);
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(validatedLimit)
    .returns<Tables<"scripts">[]>();

  if (error) {
    throw new Error(`Failed to list recent scripts: ${error.message}`);
  }

  return data ?? [];
};
