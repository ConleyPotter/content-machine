import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScriptwriterAgent } from "@/agents/ScriptwriterAgent";
import { getSupabase } from "@/db/db";
import * as agentNotesRepo from "@/repos/agentNotes";
import * as productsRepo from "@/repos/products";
import * as scriptsRepo from "@/repos/scripts";
import { ScriptWriterInput, ScriptOutput } from "@/schemas/scriptwriterSchemas";
import { scriptInsertSchema } from "@/schemas/scriptsSchema";
import * as scriptwriterChainModule from "@/llm/chains/scriptwriterChain";
import { integrationEnv } from "../setup";

const describeIf = integrationEnv.hasSupabaseCredentials ? describe : describe.skip;

const supabase = getSupabase();

const clearTablesForAgent = async (agentName: string, productId?: string) => {
  await supabase.from("system_events").delete().eq("agent_name", agentName);
  await supabase.from("agent_notes").delete().eq("agent_name", agentName);

  if (productId) {
    await supabase.from("scripts").delete().eq("product_id", productId);
    await supabase.from("products").delete().eq("product_id", productId);
  }
};

describeIf("ScriptwriterAgent integration", () => {
  const baseAgentName = "ScriptwriterAgentIntegration";
  let agentName: string;
  let productId: string;
  let scriptId: string | undefined;

  beforeEach(async () => {
    agentName = `${baseAgentName}-${randomUUID()}`;
    productId = randomUUID();
    await clearTablesForAgent(agentName, productId);
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await clearTablesForAgent(agentName, productId);
    vi.restoreAllMocks();
  });

  it("persists script, note, and ordered events on success", async () => {
    const structuredScript = ScriptOutput.parse({
      title: "Integration Title",
      hook: "Integration Hook",
      cta: "Integration CTA",
      outline: ["Beat one", "Beat two"],
      body: "Full integration body.",
    });

    const chainSpy = vi
      .spyOn(scriptwriterChainModule, "scriptwriterChain")
      .mockResolvedValue(structuredScript);

    const product = await productsRepo.createProduct({
      product_id: productId,
      name: "Integration Product",
      description: "Integration product description",
      source_platform: "integration",
      category: "testing",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      affiliate_link: null,
      image_url: null,
      meta: null,
    });

    const input = ScriptWriterInput.parse({
      productId,
      productSummary: product.description,
      trendSummaries: ["Trending summary"],
      patternSummaries: ["Pattern summary"],
      creativeVariables: { tone: "witty" },
    });

    const agent = new ScriptwriterAgent({ agentName });
    const result = await agent.run(input);
    scriptId = result.scriptId;

    expect(chainSpy).toHaveBeenCalledWith({
      productId,
      productSummary: product.description,
      trendSummaries: ["Trending summary"],
      patternSummaries: ["Pattern summary"],
      creativeVariables: { tone: "witty" },
    });

    const storedScript = await scriptsRepo.getScriptById(result.scriptId);
    expect(storedScript).toBeTruthy();
    expect(storedScript?.product_id).toBe(productId);
    expect(storedScript?.hook).toBe(structuredScript.hook);
    expect(storedScript?.script_text).toContain(structuredScript.body);
    scriptInsertSchema.parse({
      scriptId: storedScript?.script_id,
      productId: storedScript?.product_id,
      scriptText: storedScript?.script_text,
      hook: storedScript?.hook,
      creativeVariables: storedScript?.creative_variables,
      createdAt: storedScript?.created_at,
    });

    const notes = await agentNotesRepo.listNotesForAgent(agentName);
    expect(notes.some((note) => note.topic === "script_generation")).toBe(true);

    const { data: events, error } = await supabase
      .from("system_events")
      .select("*")
      .eq("agent_name", agentName)
      .order("created_at", { ascending: true });
    expect(error).toBeNull();
    const eventTypes = events?.map((event) => event.event_type);
    expect(eventTypes).toEqual([
      "agent.start",
      "script.generate.start",
      "script.generate.success",
      "agent.success",
    ]);

    expect(result.script.product_id).toBe(productId);
    expect(result.scriptId).toBeDefined();
  });

  it("logs error events when the chain fails", async () => {
    vi.spyOn(scriptwriterChainModule, "scriptwriterChain").mockRejectedValueOnce(
      new Error("Chain failure"),
    );

    await productsRepo.createProduct({
      product_id: productId,
      name: "Integration Product",
      description: "Integration product description",
      source_platform: "integration",
      category: "testing",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      affiliate_link: null,
      image_url: null,
      meta: null,
    });

    const input = ScriptWriterInput.parse({
      productId,
      productSummary: "Integration product description",
      trendSummaries: [],
      patternSummaries: [],
      creativeVariables: {},
    });

    const agent = new ScriptwriterAgent({ agentName });

    await expect(agent.run(input)).rejects.toThrow("Chain failure");

    const scripts = await scriptsRepo.listScriptsForProduct(productId);
    expect(scripts).toHaveLength(0);

    const { data: events, error } = await supabase
      .from("system_events")
      .select("*")
      .eq("agent_name", agentName)
      .order("created_at", { ascending: true });
    expect(error).toBeNull();
    const eventTypes = events?.map((event) => event.event_type);
    expect(eventTypes).toEqual([
      "agent.start",
      "script.generate.start",
      "script.generate.error",
      "agent.error",
      "error",
    ]);
  });
});
