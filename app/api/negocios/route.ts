import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, email } = body;

  if (!nombre || !email) {
    return NextResponse.json(
      { error: "Nombre y email son obligatorios" },
      { status: 400 }
    );
  }

  const negocioExistente = await prisma.negocio.findUnique({
    where: { email },
  });

  if (negocioExistente) {
    return NextResponse.json(
      { error: "Ya existe un negocio con ese email" },
      { status: 409 }
    );
  }

  const negocio = await prisma.negocio.create({
    data: { nombre, email },
  });

  return NextResponse.json(
    {
      mensaje: "Negocio creado correctamente",
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        email: negocio.email,
        apiKey: negocio.apiKey,
      },
    },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const negocios = await prisma.negocio.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      creadoEn: true,
    },
  });

  return NextResponse.json({ negocios });
}