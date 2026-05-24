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
      { error: "Dia, hora de início e hora de fim são obrigatórios" },
      { status: 400 }
    );
  }

  if (!DIAS_VALIDOS.includes(diaSemana.toLowerCase())) {
    return NextResponse.json(
      { error: `Dia inválido. Use: ${DIAS_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }

  if (!validarHora(horaInicio) || !validarHora(horaFin)) {
    return NextResponse.json(
      { error: "Formato de hora inválido. Use HH:MM, exemplo: 12:00" },
      { status: 400 }
    );
  }

  if (horaInicio >= horaFin) {
    return NextResponse.json(
      { error: "A hora de início deve ser anterior à hora de fim" },
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
      { error: "Não existe horário para esse dia, crie um primeiro" },
      { status: 400 }
    );
  }

  if (horaInicio < horario.horaInicio || horaFin > horario.horaFin) {
    return NextResponse.json(
      {
        error: `A pausa deve estar dentro do horário do dia: ${horario.horaInicio} - ${horario.horaFin}`,
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
    { mensaje: "Pausa criada com sucesso", pausa },
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
      { error: "O id da pausa é obrigatório" },
      { status: 400 }
    );
  }

  const pausa = await prisma.pausa.findUnique({
    where: { id: parseInt(id) },
  });

  if (!pausa || pausa.negocioId !== negocio!.id) {
    return NextResponse.json(
      { error: "Pausa não encontrada" },
      { status: 404 }
    );
  }

  await prisma.pausa.delete({
    where: { id: parseInt(id) },
  });

  return NextResponse.json({ mensaje: "Pausa eliminada com sucesso" });
}