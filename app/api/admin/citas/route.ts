import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";
import { enviarConfirmacion } from "@/app/lib/emails";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const empleadoId = searchParams.get("empleadoId");
  const skip = Math.max(0, parseInt(searchParams.get("skip") || "0"));
  const take = Math.min(100, Math.max(1, parseInt(searchParams.get("take") || "10")));

  const where: any = { negocioId: decoded.negocioId };

  if (fecha) {
    where.fecha = {
      gte: new Date(`${fecha}T00:00:00`),
      lte: new Date(`${fecha}T23:59:59`),
    };
  }

  if (empleadoId) {
    where.empleadoId = parseInt(empleadoId);
  }

  const [citas, total] = await prisma.$transaction([
    prisma.cita.findMany({
      where,
      include: { servicio: true, empleado: true },
      orderBy: { fecha: "asc" },
      skip,
      take,
    }),
    prisma.cita.count({ where }),
  ]);

  return NextResponse.json({ citas, total });
}

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { nombreCliente, emailCliente, fecha, servicioId, empleadoId } = await req.json();

  if (!nombreCliente || !emailCliente || !fecha || !servicioId || !empleadoId) {
    return NextResponse.json(
      { error: "Nome, email, data, servicioId e empleadoId são obrigatórios" },
      { status: 400 }
    );
  }

  const fechaDate = new Date(fecha);

  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json({ error: "Formato de data inválido" }, { status: 400 });
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const servicio = await prisma.servicio.findUnique({ where: { id: parseInt(servicioId) } });

  if (!servicio || servicio.empleadoId !== empleado.id) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const citasDelDia = await prisma.cita.findMany({
    where: {
      empleadoId: empleado.id,
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
    return NextResponse.json({ error: "Esse horário já está ocupado" }, { status: 409 });
  }

  const negocio = await prisma.negocio.findUnique({ where: { id: decoded.negocioId } });

  const cita = await prisma.cita.create({
    data: {
      nombreCliente,
      emailCliente,
      fecha: fechaDate,
      negocioId: decoded.negocioId,
      empleadoId: empleado.id,
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

  return NextResponse.json({ mensaje: "Consulta criada com sucesso", cita }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "O id da consulta é obrigatório" }, { status: 400 });

  const cita = await prisma.cita.findUnique({
    where: { id: parseInt(id) },
    include: { servicio: true },
  });

  if (!cita || cita.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
  }

  const { estado } = await req.json();
  const ESTADOS_VALIDOS = ["pendiente", "confirmada", "cancelada"];

  if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
    return NextResponse.json(
      { error: `Estado inválido. Use: ${ESTADOS_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }

  const citaActualizada = await prisma.cita.update({
    where: { id: parseInt(id) },
    data: { estado },
    include: { servicio: true },
  });

  const negocio = await prisma.negocio.findUnique({ where: { id: decoded.negocioId } });

  const mensajes: Record<string, string> = {
    confirmada: "foi confirmada",
    cancelada: "foi cancelada",
    pendiente: "está pendente de confirmação",
  };

  await resend.emails.send({
    from: "Reservas <onboarding@resend.dev>",
    to: citaActualizada.emailCliente,
    subject: `A sua consulta em ${negocio!.nombre} ${mensajes[estado]}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Atualização da sua consulta</h2>
        <p>Olá <strong>${citaActualizada.nombreCliente}</strong>,</p>
        <p>A sua consulta <strong>${mensajes[estado]}</strong>.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Negócio:</strong> ${negocio!.nombre}</p>
          <p><strong>Serviço:</strong> ${citaActualizada.servicio.nombre}</p>
          <p><strong>Estado:</strong> ${estado}</p>
        </div>
        <p>Se tiver alguma dúvida, entre em contacto connosco.</p>
      </div>
    `,
  });

  return NextResponse.json({ mensaje: "Consulta atualizada com sucesso", cita: citaActualizada });
}
