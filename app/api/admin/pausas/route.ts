import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";

const DIAS_VALIDOS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pausas = await prisma.pausa.findMany({
    where: { negocioId: decoded.negocioId },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ pausas });
}

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { diaSemana, horaInicio, horaFin } = await req.json();

  if (!diaSemana || !horaInicio || !horaFin) {
    return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
  }

  if (!DIAS_VALIDOS.includes(diaSemana.toLowerCase())) {
    return NextResponse.json({ error: "Día inválido" }, { status: 400 });
  }

  if (!HORA_REGEX.test(horaInicio) || !HORA_REGEX.test(horaFin)) {
    return NextResponse.json({ error: "Formato de hora inválido. Usa HH:MM" }, { status: 400 });
  }

  if (horaInicio >= horaFin) {
    return NextResponse.json({ error: "La hora de inicio debe ser anterior a la de fin" }, { status: 400 });
  }

  const horario = await prisma.horario.findFirst({
    where: { negocioId: decoded.negocioId, diaSemana: diaSemana.toLowerCase() },
  });

  if (!horario) {
    return NextResponse.json({ error: "No existe horario para ese día" }, { status: 400 });
  }

  if (horaInicio < horario.horaInicio || horaFin > horario.horaFin) {
    return NextResponse.json(
      { error: `La pausa debe estar dentro del horario: ${horario.horaInicio} - ${horario.horaFin}` },
      { status: 400 }
    );
  }

  const pausa = await prisma.pausa.create({
    data: { diaSemana: diaSemana.toLowerCase(), horaInicio, horaFin, negocioId: decoded.negocioId },
  });

  return NextResponse.json({ mensaje: "Pausa creada", pausa }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Id obligatorio" }, { status: 400 });

  const pausa = await prisma.pausa.findUnique({ where: { id: parseInt(id) } });

  if (!pausa || pausa.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Pausa no encontrada" }, { status: 404 });
  }

  await prisma.pausa.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Pausa eliminada" });
}