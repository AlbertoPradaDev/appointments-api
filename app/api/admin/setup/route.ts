import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiKey, password } = body;

  if (!apiKey || !password) {
    return NextResponse.json(
      { error: "ApiKey y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  const negocio = await prisma.negocio.findUnique({
    where: { apiKey },
  });

  if (!negocio) {
    return NextResponse.json(
      { error: "Negocio no encontrado" },
      { status: 404 }
    );
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.negocio.update({
    where: { apiKey },
    data: { adminPassword: hash },
  });

  return NextResponse.json({
    mensaje: "Contraseña configurada correctamente",
  });
}