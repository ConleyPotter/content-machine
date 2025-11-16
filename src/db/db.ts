import { supabase } from "./supabase";
import type { TablesInsert } from "./types";

export const insertScript = (script: TablesInsert<"scripts">) =>
  supabase.from("scripts").insert(script).select().single();

export const selectScripts = () => supabase.from("scripts").select("*");

export const insertVideoAsset = (asset: TablesInsert<"video_assets">) =>
  supabase.from("video_assets").insert(asset).select().single();

export const selectVideoAssets = () =>
  supabase.from("video_assets").select("*");

export const insertExperiment = (experiment: TablesInsert<"experiments">) =>
  supabase.from("experiments").insert(experiment).select().single();

export const selectExperiments = () =>
  supabase.from("experiments").select("*");

export const insertPublishedPost = (
  post: TablesInsert<"published_posts">,
) => supabase.from("published_posts").insert(post).select().single();

export const selectPublishedPosts = () =>
  supabase.from("published_posts").select("*");

export const logPerformanceMetric = (
  metric: TablesInsert<"performance_metrics">,
) =>
  supabase.from("performance_metrics").insert(metric).select().single();

export const selectPerformanceMetrics = () =>
  supabase.from("performance_metrics").select("*");

export const logSystemEvent = (event: TablesInsert<"system_events">) =>
  supabase.from("system_events").insert(event).select().single();

export const selectSystemEvents = () =>
  supabase.from("system_events").select("*");

export const aceDb = {
  insertScript,
  selectScripts,
  insertVideoAsset,
  selectVideoAssets,
  insertExperiment,
  selectExperiments,
  insertPublishedPost,
  selectPublishedPosts,
  logPerformanceMetric,
  selectPerformanceMetrics,
  logSystemEvent,
  selectSystemEvents,
};

export type AceDb = typeof aceDb;

export { supabase };

