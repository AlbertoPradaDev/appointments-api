import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

export async function POST(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const body = await req.json();
  const { fechas, servicioId } = body;

  if (!fechas || !servicioId || !Array.isArray(fechas)) {
    return NextResponse.json(
      { error: "Fechas y servicioId son obligatorios" },
      { status: 400 }
    );
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

  const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

  function horaAMinutos(hora: string): number {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  }

  function minutosAHora(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const resultados = await Promise.all(
    fechas.map(async (fecha: string) => {
      const fechaDate = new Date(fecha);
      const diaSemana = DIAS[fechaDate.getDay()];

      const [diaBloqueado, horario, pausas, citasDelDia] = await Promise.all([
        prisma.diaBloqueado.findFirst({
          where: { negocioId: negocio!.id, fecha: fechaDate },
        }),
        prisma.horario.findFirst({
          where: { negocioId: negocio!.id, diaSemana },
        }),
        prisma.pausa.findMany({
          where: { negocioId: negocio!.id, diaSemana },
        }),
        prisma.cita.findMany({
          where: {
            negocioId: negocio!.id,
            fecha: {
              gte: new Date(`${fecha}T00:00:00`),
              lte: new Date(`${fecha}T23:59:59`),
            },
            estado: { not: "cancelada" },
          },
          include: { servicio: true },
        }),
      ]);

      if (diaBloqueado || !horario) {
        return { fecha, disponible: false, huecos: [], horasOcupadas: [] };
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
          const citaInicioMin = citaInicio.getHours() * 60 + citaInicio.getMinutes();
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

      return {
        fecha,
        disponible: huecos.length > 0,
        huecos,
        horasOcupadas,
      };
    })
  );

  return NextResponse.json({ resultados });
}