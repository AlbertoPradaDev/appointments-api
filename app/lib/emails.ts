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
  const fechaFormateada = new Date(fecha).toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const horaFormateada = new Date(fecha).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: "Reservas <onboarding@resend.dev>",
    to: emailCliente,
    subject: `Consulta confirmada em ${nombreNegocio}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>A sua consulta está confirmada</h2>
        <p>Olá <strong>${nombreCliente}</strong>,</p>
        <p>A sua consulta foi agendada com sucesso.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Negócio:</strong> ${nombreNegocio}</p>
          <p><strong>Serviço:</strong> ${servicio}</p>
          <p><strong>Data:</strong> ${fechaFormateada}</p>
          <p><strong>Hora:</strong> ${horaFormateada}</p>
          <p><strong>Duração:</strong> ${duracion} minutos</p>
        </div>
        <p>Se precisar cancelar a sua consulta, entre em contacto connosco.</p>
      </div>
    `,
  });
}