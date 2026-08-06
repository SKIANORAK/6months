const API_BASE = "https://api.meshy.ai/openapi/v1";

export type AssetKind = "character" | "clothing";

export interface CreateModelInput {
  imageUrl: string;
  kind: AssetKind;
  targetPolycount?: number;
}

export interface MeshyTask {
  id: string;
  status?: string;
  progress?: number;
  model_urls?: Record<string, string>;
  thumbnail_url?: string;
  task_error?: { message?: string } | null;
  [key: string]: unknown;
}

function apiKey(): string {
  const value = process.env.MESHY_API_KEY?.trim();
  if (!value) throw new Error("MESHY_API_KEY is not configured");
  return value;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(45_000),
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`Meshy API ${response.status}: ${detail}`);
  }

  return payload as T;
}

export async function createModel(input: CreateModelInput): Promise<{ taskId: string }> {
  const target = Math.max(5_000, Math.min(input.targetPolycount ?? 45_000, 100_000));
  const body = {
    image_url: input.imageUrl,
    model_type: "standard",
    ai_model: "latest",
    enable_pbr: true,
    should_remesh: true,
    target_polycount: target,
    should_texture: true,
    target_formats: ["glb"],
    ...(input.kind === "character" ? { pose_mode: "a-pose" } : {}),
  };

  const result = await request<{ result: string }>("/image-to-3d", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return { taskId: result.result };
}

export function getModelTask(taskId: string): Promise<MeshyTask> {
  return request<MeshyTask>(`/image-to-3d/${encodeURIComponent(taskId)}`);
}

export async function rigCharacter(
  taskId: string,
  heightMeters = 1.75,
): Promise<{ taskId: string }> {
  const result = await request<{ result: string }>("/rigging", {
    method: "POST",
    body: JSON.stringify({
      input_task_id: taskId,
      height_meters: Math.max(1.2, Math.min(heightMeters, 2.2)),
    }),
  });

  return { taskId: result.result };
}

export function getRiggingTask(taskId: string): Promise<MeshyTask> {
  return request<MeshyTask>(`/rigging/${encodeURIComponent(taskId)}`);
}
