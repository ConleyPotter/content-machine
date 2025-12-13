# ScriptwriterAgent — ACE Agent Profile

## Purpose
Generate structured short-form scripts for products using creative patterns and trend data.

## Inputs
• productId  
• trendSnapshotIds  
• patternIds  
• creativeVariables  

## Outputs
• structured script object with title, hook, CTA, outline, body  
• persisted to scripts table with metadata  

## Responsibilities
• validate inputs  
• gather creative context  
• call scriptwriterChain  
• persist results  
• emit events  
• write rationale notes  

## Data Access
• reads: products, creative_patterns, trend_snapshots  
• writes: scripts, agent_notes  

## Events Emitted
• agent.start  
• agent.success  
• agent.error  
• script.generate.start  
• script.generate.success  
• script.generate.error  

## Testing
• covered by Vitest unit and integration tests  

## Deprecated Components
• the old ScriptwriterService has been retired; all logic now resides within ScriptwriterAgent and scriptwriterChain  

## Notes for Future Agents or Codex Runs
• always validate inputs with Zod  
• never access Supabase directly  
• always emit lifecycle and domain events  
• use repositories for persistence  
• use scriptwriterChain for LLM generation  
• keep file and class names consistent across upgrades  
