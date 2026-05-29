import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";

const DIAS_VALIDOS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const empleadoId = searchParams.get("empleadoId");

  if (!empleadoId) {
    return NextResponse.json({ error: "empleadoId é obrigatório" }, { status: 400 });
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const horarios = await prisma.horario.findMany({
    where: { empleadoId: empleado.id },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ horarios });
}

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { diaSemana, horaInicio, horaFin, empleadoId } = await req.json();

  if (!diaSemana || !horaInicio || !horaFin || !empleadoId) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
  }

  if (!DIAS_VALIDOS.includes(diaSemana.toLowerCase())) {
    return NextResponse.json({ error: "Dia inválido" }, { status: 400 });
  }

  if (!HORA_REGEX.test(horaInicio) || !HORA_REGEX.test(horaFin)) {
    return NextResponse.json({ error: "Formato de hora inválido. Use HH:MM" }, { status: 400 });
  }

  if (horaInicio >= horaFin) {
    return NextResponse.json({ error: "A hora de início deve ser anterior à de fim" }, { status: 400 });
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const existente = await prisma.horario.findFirst({
    where: { empleadoId: empleado.id, diaSemana: diaSemana.toLowerCase() },
  });

  if (existente) {
    return NextResponse.json({ error: "Já existe um horário para esse dia" }, { status: 409 });
  }

  const horario = await prisma.horario.create({
    data: { diaSemana: diaSemana.toLowerCase(), horaInicio, horaFin, empleadoId: empleado.id },
  });

  return NextResponse.json({ mensaje: "Horário criado", horario }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Id obrigatório" }, { status: 400 });

  const horario = await prisma.horario.findUnique({
    where: { id: parseInt(id) },
    include: { empleado: true },
  });

  if (!horario || horario.empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Horário não encontrado" }, { status: 404 });
  }

  await prisma.horario.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Horário eliminado" });
}
