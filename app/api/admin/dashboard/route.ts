import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);

  if (!decoded) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const hoy = new Date();
  const inicioHoy = new Date(`${hoy.toISOString().split("T")[0]}T00:00:00`);
  const finHoy = new Date(`${hoy.toISOString().split("T")[0]}T23:59:59`);

  const [negocio, citasHoy, citasPendientes, totalCitas] = await Promise.all([
    prisma.negocio.findUnique({
      where: { id: decoded.negocioId },
      select: {
        id: true,
        nombre: true,
        email: true,
      },
    }),
    prisma.cita.findMany({
      where: {
        negocioId: decoded.negocioId,
        fecha: { gte: inicioHoy, lte: finHoy },
        estado: { not: "cancelada" },
      },
      include: { servicio: true },
      orderBy: { fecha: "asc" },
    }),
    prisma.cita.count({
      where: {
        negocioId: decoded.negocioId,
        estado: "pendiente",
      },
    }),
    prisma.cita.count({
      where: { negocioId: decoded.negocioId },
    }),
  ]);

  if (!negocio) {
    return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    negocio,
    citasHoy,
    citasPendientes,
    totalCitas,
  });
}