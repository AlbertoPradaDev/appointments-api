import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EnviarConfirmacionParams {
  nombreCliente: string;
  emailCliente: string;
  nombreNegocio: string;
  servicio: string;
  fecha: Date;
  duracion: number;
}

export async function enviarConfirmacion({
  nombreCliente,
  emailCliente,
  nombreNegocio,
  servicio,
  fecha,
  duracion,
}: EnviarConfirmacionParams) {
  const fechaFormateada = new Date(fecha).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const horaFormateada = new Date(fecha).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: "Reservas <onboarding@resend.dev>",
    to: emailCliente,
    subject: `Cita confirmada en ${nombreNegocio}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Tu cita está confirmada</h2>
        <p>Hola <strong>${nombreCliente}</strong>,</p>
        <p>Tu cita ha sido agendada correctamente.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Negocio:</strong> ${nombreNegocio}</p>
          <p><strong>Servicio:</strong> ${servicio}</p>
          <p><strong>Fecha:</strong> ${fechaFormateada}</p>
          <p><strong>Hora:</strong> ${horaFormateada}</p>
          <p><strong>Duración:</strong> ${duracion} minutos</p>
        </div>
        <p>Si necesitas cancelar tu cita contacta con nosotros.</p>
      </div>
    `,
  });
}