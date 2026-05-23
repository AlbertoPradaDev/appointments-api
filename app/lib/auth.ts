import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export async function verificarApiKey(req: NextRequest) {
  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("X-Api-Key") ||
    req.headers.get("X-API-KEY");

  if (!apiKey) {
    return { error: "API key no proporcionada", status: 401, negocio: null };
  }

  const negocio = await prisma.negocio.findUnique({
    where: { apiKey },
  });

  if (!negocio) {
    return { error: "API Key inválida", status: 401, negocio: null };
  }

  return { error: null, status: 200, negocio };
}