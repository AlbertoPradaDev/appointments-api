import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";
import { enviarConfirmacion } from "@/app/lib/emails";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);

  if (!decoded) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");

  const where: any = { negocioId: decoded.negocioId };

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

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);

  if (!decoded) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
      { error: "Formato de fecha inválido" },
      { status: 400 }
    );
  }

  const servicio = await prisma.servicio.findUnique({
    where: { id: parseInt(servicioId) },
  });

  if (!servicio || servicio.negocioId !== decoded.negocioId) {
    return NextResponse.json(
      { error: "Servicio no encontrado" },
      { status: 404 }
    );
  }

  const citasDelDia = await prisma.cita.findMany({
    where: {
      negocioId: decoded.negocioId,
      estado: { not: "cancelada" },
      fecha: {
        gte: new Date(`${fecha.split("T")[0]}T00:00:00`),
        lte: new Date(`${fecha.split("T")[0]}T23:59:59`),
      },
    },
    include: { servicio: true },
  });

  const inicioNueva = fechaDate.getUTCHours() * 60 + fechaDate.getUTCMinutes();
  const finNueva = inicioNueva + servicio.duracion;

  const hayConflicto = citasDelDia.some((cita) => {
    const citaInicio = new Date(cita.fecha);
    const citaInicioMin = citaInicio.getUTCHours() * 60 + citaInicio.getUTCMinutes();
    const citaFinMin = citaInicioMin + cita.servicio.duracion;
    return inicioNueva < citaFinMin && finNueva > citaInicioMin;
  });

  if (hayConflicto) {
    return NextResponse.json(
      { error: "Ese horario ya está ocupado" },
      { status: 409 }
    );
  }

  const negocio = await prisma.negocio.findUnique({
    where: { id: decoded.negocioId },
  });

  const cita = await prisma.cita.create({
    data: {
      nombreCliente,
      emailCliente,
      fecha: fechaDate,
      negocioId: decoded.negocioId,
      servicioId: parseInt(servicioId),
    },
    include: { servicio: true },
  });

  await enviarConfirmacion({
    nombreCliente: cita.nombreCliente,
    emailCliente: cita.emailCliente,
    nombreNegocio: negocio!.nombre,
    servicio: cita.servicio.nombre,
    fecha: cita.fecha,
    duracion: cita.servicio.duracion,
  });

  return NextResponse.json(
    { mensaje: "Cita creada correctamente", cita },
    { status: 201 }
  );
}

export async function PATCH(req: NextRequest) {
  const decoded = verificarToken(req);

  if (!decoded) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
    include: { servicio: true },
  });

  if (!cita || cita.negocioId !== decoded.negocioId) {
    return NextResponse.json(
      { error: "Cita no encontrada" },
      { status: 404 }
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

  const negocio = await prisma.negocio.findUnique({
    where: { id: decoded.negocioId },
  });

  const mensajes: Record<string, string> = {
    confirmada: "ha sido confirmada",
    cancelada: "ha sido cancelada",
    pendiente: "está pendiente de confirmación",
  };

  await resend.emails.send({
    from: "Reservas <onboarding@resend.dev>",
    to: citaActualizada.emailCliente,
    subject: `Tu cita en ${negocio!.nombre} ${mensajes[estado]}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Actualización de tu cita</h2>
        <p>Hola <strong>${citaActualizada.nombreCliente}</strong>,</p>
        <p>Tu cita <strong>${mensajes[estado]}</strong>.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Negocio:</strong> ${negocio!.nombre}</p>
          <p><strong>Servicio:</strong> ${citaActualizada.servicio.nombre}</p>
          <p><strong>Estado:</strong> ${estado}</p>
        </div>
        <p>Si tienes alguna duda contacta con nosotros.</p>
      </div>
    `,
  });

  return NextResponse.json({
    mensaje: "Cita actualizada correctamente",
    cita: citaActualizada,
  });
}