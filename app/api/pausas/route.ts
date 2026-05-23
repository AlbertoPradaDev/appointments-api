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
      { error: "Formato de hora inválido. Usa HH:MM, ejemplo: 12:00" },
      { status: 400 }
    );
  }

  if (horaInicio >= horaFin) {
    return NextResponse.json(
      { error: "La hora de inicio debe ser anterior a la hora de fin" },
      { status: 400 }
    );
  }

  const horario = await prisma.horario.findFirst({
    where: {
      negocioId: negocio!.id,
      diaSemana: diaSemana.toLowerCase(),
    },
  });

  if (!horario) {
    return NextResponse.json(
      { error: "No existe horario para ese día, crea uno primero" },
      { status: 400 }
    );
  }

  if (horaInicio < horario.horaInicio || horaFin > horario.horaFin) {
    return NextResponse.json(
      {
        error: `La pausa debe estar dentro del horario del día: ${horario.horaInicio} - ${horario.horaFin}`,
      },
      { status: 400 }
    );
  }

  const pausa = await prisma.pausa.create({
    data: {
      diaSemana: diaSemana.toLowerCase(),
      horaInicio,
      horaFin,
      negocioId: negocio!.id,
    },
  });

  return NextResponse.json(
    { mensaje: "Pausa creada correctamente", pausa },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const pausas = await prisma.pausa.findMany({
    where: { negocioId: negocio!.id },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ pausas });
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
      { error: "El id de la pausa es obligatorio" },
      { status: 400 }
    );
  }

  const pausa = await prisma.pausa.findUnique({
    where: { id: parseInt(id) },
  });

  if (!pausa || pausa.negocioId !== negocio!.id) {
    return NextResponse.json(
      { error: "Pausa no encontrada" },
      { status: 404 }
    );
  }

  await prisma.pausa.delete({
    where: { id: parseInt(id) },
  });

  return NextResponse.json({ mensaje: "Pausa eliminada correctamente" });
}