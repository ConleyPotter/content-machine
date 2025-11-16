import { OpenAIEmbeddings } from "@langchain/openai";

const embedder = new OpenAIEmbeddings({
  model: "text-embedding-3-large"
});

export async function embedText(text: string) {
  const result = await embedder.embedDocuments([text]);
  return result[0];
}
