// Minimal Anthropic Messages API helper: one forced tool call, returns the tool input. Server-side only.

export const AI_MODEL = () => process.env.CLAUDE_MODEL_IMPORT ?? process.env.CLAUDE_MODEL_DEFAULT ?? 'claude-haiku-4-5-20251001'

export async function callTool<T = any>(opts: { system: string; content: unknown[]; tool: { name: string; description: string; input_schema: unknown }; maxTokens: number }): Promise<T> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: AI_MODEL(),
      max_tokens: opts.maxTokens,
      system: opts.system,
      tools: [opts.tool],
      tool_choice: { type: 'tool', name: opts.tool.name },
      messages: [{ role: 'user', content: opts.content }],
    }),
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  const data = await res.json()
  if (data.stop_reason === 'max_tokens') throw new Error('max_tokens')
  const block = (data.content ?? []).find((b: any) => b.type === 'tool_use')
  if (!block) throw new Error('no tool_use')
  return block.input as T
}
