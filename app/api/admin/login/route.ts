import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { generarToken } from "../../../lib/admin-auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiKey, password } = body;

  if (!apiKey || !password) {
    return NextResponse.json(
      { error: "ApiKey e senha são obrigatórios" },
      { status: 400 }
    );
  }

  const negocio = await prisma.negocio.findUnique({
    where: { apiKey },
  });

  if (!negocio) {
    return NextResponse.json(
      { error: "Credenciais inválidas" },
      { status: 401 }
    );
  }

  if (!negocio.adminPassword) {
    return NextResponse.json(
      { error: "Este negócio não tem senha configurada" },
      { status: 401 }
    );
  }

  const passwordCorrecta = await bcrypt.compare(password, negocio.adminPassword);

  if (!passwordCorrecta) {
    return NextResponse.json(
      { error: "Credenciais inválidas" },
      { status: 401 }
    );
  }

  const token = generarToken(negocio.id);

  return NextResponse.json({
    token,
    negocio: {
      id: negocio.id,
      nombre: negocio.nombre,
      email: negocio.email,
    },
  });
}