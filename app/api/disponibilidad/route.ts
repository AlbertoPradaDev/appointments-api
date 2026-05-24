import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

export async function GET(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const servicioId = searchParams.get("servicioId");

  if (!fecha || !servicioId) {
    return NextResponse.json(
      { error: "Fecha y servicioId son obligatorios" },
      { status: 400 }
    );
  }

  const fechaDate = new Date(fecha);

  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json(
      { error: "Formato de fecha inválido. Usa YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const diaBloqueado = await prisma.diaBloqueado.findFirst({
    where: {
      negocioId: negocio!.id,
      fecha: fechaDate,
    },
  });

  if (diaBloqueado) {
    return NextResponse.json({
      disponible: false,
      motivo: diaBloqueado.motivo ?? "Día no disponible",
      huecos: [],
      horasOcupadas: [],
    });
  }

  const DIAS = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  const diaSemana = DIAS[fechaDate.getDay()];

  const horario = await prisma.horario.findFirst({
    where: {
      negocioId: negocio!.id,
      diaSemana,
    },
  });

  if (!horario) {
    return NextResponse.json({
      disponible: false,
      motivo: "El negocio no trabaja ese día",
      huecos: [],
      horasOcupadas: [],
    });
  }

  const servicio = await prisma.servicio.findUnique({
    where: { id: parseInt(servicioId) },
  });

  if (!servicio || servicio.negocioId !== negocio!.id) {
    return NextResponse.json(
      { error: "Servicio no encontrado" },
      { status: 404 }
    );
  }

  const pausas = await prisma.pausa.findMany({
    where: {
      negocioId: negocio!.id,
      diaSemana,
    },
  });

  const citasDelDia = await prisma.cita.findMany({
    where: {
      negocioId: negocio!.id,
      fecha: {
        gte: new Date(`${fecha}T00:00:00`),
        lte: new Date(`${fecha}T23:59:59`),
      },
      estado: { not: "cancelada" },
    },
    include: { servicio: true },
  });

  function horaAMinutos(hora: string): number {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  }

  function minutosAHora(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function estaEnPausa(inicio: number, fin: number): boolean {
    return pausas.some((pausa) => {
      const pausaInicio = horaAMinutos(pausa.horaInicio);
      const pausaFin = horaAMinutos(pausa.horaFin);
      return inicio < pausaFin && fin > pausaInicio;
    });
  }

  function estaOcupado(inicio: number, fin: number): boolean {
    return citasDelDia.some((cita) => {
      const citaInicio = new Date(cita.fecha);
      const citaInicioMin =
        citaInicio.getHours() * 60 + citaInicio.getMinutes();
      const citaFinMin = citaInicioMin + cita.servicio.duracion;
      return inicio < citaFinMin && fin > citaInicioMin;
    });
  }

  const inicioHorario = horaAMinutos(horario.horaInicio);
  const finHorario = horaAMinutos(horario.horaFin);
  const duracion = servicio.duracion;
  const huecos: string[] = [];
  const horasOcupadas: string[] = [];

  for (let inicio = inicioHorario; inicio + duracion <= finHorario; inicio += duracion) {
    const fin = inicio + duracion;
    if (estaEnPausa(inicio, fin) || estaOcupado(inicio, fin)) {
      horasOcupadas.push(minutosAHora(inicio));
    } else {
      huecos.push(minutosAHora(inicio));
    }
  }

  return NextResponse.json({
    disponible: huecos.length > 0,
    fecha,
    diaSemana,
    servicio: servicio.nombre,
    duracion: servicio.duracion,
    huecos,
    horasOcupadas,
  });
}