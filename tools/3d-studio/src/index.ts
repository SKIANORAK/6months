import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { assertPublicHttpsUrl, requirePluginToken } from "./security.js";
import { createModel, getModelTask, getRiggingTask, rigCharacter } from "./meshy.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function buildServer(): McpServer {
  const server = new McpServer({ name: "6months-3d-studio", version: "0.1.0" });

  server.tool(
    "create_character_from_image",
    "Создать закрытого нейтрального 3D-персонажа в A-pose по изображению. Результат — асинхронная задача Meshy.",
    {
      imageUrl: z.string().url(),
      name: z.string().min(1).max(40),
      targetPolycount: z.number().int().min(5_000).max(100_000).default(45_000),
    },
    async ({ imageUrl, name, targetPolycount }) => {
      assertPublicHttpsUrl(imageUrl);
      const task = await createModel({ imageUrl, kind: "character", targetPolycount });
      return textResult({ ...task, name, kind: "character", next: "get_model_status" });
    },
  );

  server.tool(
    "create_clothing_from_image",
    "Создать черновую 3D-модель предмета одежды по изображению. После генерации модель потребуется адаптировать к общему скелету персонажей.",
    {
      imageUrl: z.string().url(),
      name: z.string().min(1).max(80),
      category: z.enum(["top", "bottom", "outerwear", "shoes", "accessory"]),
      targetPolycount: z.number().int().min(5_000).max(100_000).default(30_000),
    },
    async ({ imageUrl, name, category, targetPolycount }) => {
      assertPublicHttpsUrl(imageUrl);
      const task = await createModel({ imageUrl, kind: "clothing", targetPolycount });
      return textResult({ ...task, name, category, kind: "clothing", next: "get_model_status" });
    },
  );

  server.tool(
    "get_model_status",
    "Проверить состояние задачи создания 3D-модели и получить ссылку на GLB после завершения.",
    { taskId: z.string().uuid() },
    async ({ taskId }) => textResult(await getModelTask(taskId)),
  );

  server.tool(
    "rig_character",
    "Добавить скелет готовой humanoid-модели. Использовать только после успешного создания персонажа.",
    {
      modelTaskId: z.string().uuid(),
      heightMeters: z.number().min(1.2).max(2.2).default(1.75),
    },
    async ({ modelTaskId, heightMeters }) => {
      const task = await rigCharacter(modelTaskId, heightMeters);
      return textResult({ ...task, kind: "rigging", next: "get_rigging_status" });
    },
  );

  server.tool(
    "get_rigging_status",
    "Проверить состояние автоматического риггинга персонажа.",
    { taskId: z.string().uuid() },
    async ({ taskId }) => textResult(await getRiggingTask(taskId)),
  );

  server.tool(
    "describe_pipeline",
    "Показать этапы подготовки персонажей и одежды для примерочной 6 months.",
    {},
    async () =>
      textResult({
        character: [
          "reference image",
          "image-to-3d A-pose",
          "review",
          "rigging",
          "GLB validation",
          "try-on catalog",
        ],
        clothing: [
          "front/back/side references",
          "draft 3D",
          "manual fit to shared skeleton",
          "body masking",
          "GLB optimization",
          "try-on catalog",
        ],
        safety: [
          "no anatomical genitals",
          "no nipples",
          "permanent opaque base layer",
          "no nude mode",
        ],
      }),
  );

  return server;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "6months-3d-studio", version: "0.1.0" });
});

app.post("/mcp", requirePluginToken, async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});

app.get("/mcp", requirePluginToken, (_req, res) => {
  res.status(405).json({ error: "Use POST /mcp" });
});

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`6 months 3D Studio listening on :${port}`);
});
