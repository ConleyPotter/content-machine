import type { Tables } from "../db/types";
import { runScriptwriterChain } from "../llm/chains/scriptwriterChain";
import { scriptInsertSchema, type ScriptInsertPayload } from "../repos/scripts";

export async function generateScript(
  product: Tables<"products">,
  notes: Tables<"agent_notes">[],
): Promise<ScriptInsertPayload> {
  const chainResult = await runScriptwriterChain({ product, notes });

  const scriptPayload: ScriptInsertPayload = {
    product_id: product.product_id,
    script_text: chainResult.scriptText,
    hook: chainResult.hook ?? null,
    creative_variables: chainResult.creativeVariables ?? null,
  };

  return scriptInsertSchema.parse(scriptPayload);
}
