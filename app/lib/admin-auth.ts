import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET as string;
const TOKEN_EXPIRY = "24h";

export function generarToken(negocioId: number): string {
  return jwt.sign({ negocioId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verificarToken(req: NextRequest): { negocioId: number } | null {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { negocioId: number };
    return decoded;
  } catch {
    return null;
  }
}