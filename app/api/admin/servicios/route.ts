import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const servicios = await prisma.servicio.findMany({
    where: { negocioId: decoded.negocioId },
  });

  return NextResponse.json({ servicios });
}

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, duracion, precio } = await req.json();

  if (!nombre || !duracion) {
    return NextResponse.json(
      { error: "Nombre y duración son obligatorios" },
      { status: 400 }
    );
  }

  const servicio = await prisma.servicio.create({
    data: { nombre, duracion, precio: precio ?? null, negocioId: decoded.negocioId },
  });

  return NextResponse.json({ mensaje: "Servicio creado", servicio }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Id obligatorio" }, { status: 400 });

  const servicio = await prisma.servicio.findUnique({ where: { id: parseInt(id) } });

  if (!servicio || servicio.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  await prisma.servicio.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Servicio eliminado" });
}