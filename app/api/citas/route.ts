import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

export async function POST(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const body = await req.json();
  const { nombreCliente, emailCliente, fecha, servicioId } = body;

  if (!nombreCliente || !emailCliente || !fecha || !servicioId) {
    return NextResponse.json(
      { error: "Nombre, email, fecha y servicioId son obligatorios" },
      { status: 400 }
    );
  }

  const fechaDate = new Date(fecha);

  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json(
      { error: "Formato de fecha inválido. Usa YYYY-MM-DDTHH:MM, ejemplo: 2026-06-01T10:00" },
      { status: 400 }
    );
  }

  if (fechaDate < new Date()) {
    return NextResponse.json(
      { error: "No puedes agendar citas en el pasado" },
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

  const fechaInicio = fechaDate;
  const fechaFin = new Date(fechaDate.getTime() + servicio.duracion * 60000);

  const citaExistente = await prisma.cita.findFirst({
    where: {
      negocioId: negocio!.id,
      estado: { not: "cancelada" },
      AND: [
        { fecha: { lt: fechaFin } },
        {
          fecha: {
            gte: new Date(
              fechaInicio.getTime() - servicio.duracion * 60000
            ),
          },
        },
      ],
    },
    include: { servicio: true },
  });

  if (citaExistente) {
    return NextResponse.json(
      { error: "Ese horario ya está ocupado" },
      { status: 409 }
    );
  }

  const cita = await prisma.cita.create({
    data: {
      nombreCliente,
      emailCliente,
      fecha: fechaDate,
      negocioId: negocio!.id,
      servicioId: parseInt(servicioId),
    },
    include: { servicio: true },
  });

  return NextResponse.json(
    {
      mensaje: "Cita agendada correctamente",
      cita: {
        id: cita.id,
        nombreCliente: cita.nombreCliente,
        emailCliente: cita.emailCliente,
        fecha: cita.fecha,
        servicio: cita.servicio.nombre,
        duracion: cita.servicio.duracion,
        estado: cita.estado,
      },
    },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");

  const where: any = { negocioId: negocio!.id };

  if (fecha) {
    where.fecha = {
      gte: new Date(`${fecha}T00:00:00`),
      lte: new Date(`${fecha}T23:59:59`),
    };
  }

  const citas = await prisma.cita.findMany({
    where,
    include: { servicio: true },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({ citas });
}

export async function PATCH(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "El id de la cita es obligatorio" },
      { status: 400 }
    );
  }

  const cita = await prisma.cita.findUnique({
    where: { id: parseInt(id) },
  });

  if (!cita || cita.negocioId !== negocio!.id) {
    return NextResponse.json(
      { error: "Cita no encontrada" },
      { status: 404 }
    );
  }

  if (cita.estado === "cancelada") {
    return NextResponse.json(
      { error: "Esta cita ya está cancelada" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { estado } = body;

  const ESTADOS_VALIDOS = ["pendiente", "confirmada", "cancelada"];

  if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
    return NextResponse.json(
      { error: `Estado inválido. Usa: ${ESTADOS_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }

  const citaActualizada = await prisma.cita.update({
    where: { id: parseInt(id) },
    data: { estado },
    include: { servicio: true },
  });

  return NextResponse.json({
    mensaje: "Cita actualizada correctamente",
    cita: citaActualizada,
  });
}