import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

const DIAS_VALIDOS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validarHora(hora: string): boolean {
  return HORA_REGEX.test(hora);
}

export async function POST(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const body = await req.json();
  const { diaSemana, horaInicio, horaFin } = body;

  if (!diaSemana || !horaInicio || !horaFin) {
    return NextResponse.json(
      { error: "Día, hora de inicio y hora de fin son obligatorios" },
      { status: 400 }
    );
  }

  if (!DIAS_VALIDOS.includes(diaSemana.toLowerCase())) {
    return NextResponse.json(
      { error: `Día inválido. Usa: ${DIAS_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }

  if (!validarHora(horaInicio) || !validarHora(horaFin)) {
    return NextResponse.json(
      { error: "Formato de hora inválido. Usa HH:MM, ejemplo: 08:00" },
      { status: 400 }
    );
  }

  if (horaInicio >= horaFin) {
    return NextResponse.json(
      { error: "La hora de inicio debe ser anterior a la hora de fin" },
      { status: 400 }
    );
  }

  const horarioExistente = await prisma.horario.findFirst({
    where: {
      negocioId: negocio!.id,
      diaSemana: diaSemana.toLowerCase(),
    },
  });

  if (horarioExistente) {
    return NextResponse.json(
      { error: "Ya existe un horario para ese día" },
      { status: 409 }
    );
  }

  const horario = await prisma.horario.create({
    data: {
      diaSemana: diaSemana.toLowerCase(),
      horaInicio,
      horaFin,
      negocioId: negocio!.id,
    },
  });

  return NextResponse.json(
    { mensaje: "Horario creado correctamente", horario },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const horarios = await prisma.horario.findMany({
    where: { negocioId: negocio!.id },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ horarios });
}

export async function DELETE(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "El id del horario es obligatorio" },
      { status: 400 }
    );
  }

  const horario = await prisma.horario.findUnique({
    where: { id: parseInt(id) },
  });

  if (!horario || horario.negocioId !== negocio!.id) {
    return NextResponse.json(
      { error: "Horario no encontrado" },
      { status: 404 }
    );
  }

  await prisma.horario.delete({
    where: { id: parseInt(id) },
  });

  return NextResponse.json({ mensaje: "Horario eliminado correctamente" });
}