type SendWorkshopInquiryEmailInput = {
  to: string;
  workshopName: string;
  requesterName: string;
  requesterPhone: string;
  requesterCity?: string | null;
  requestedService: string;
  vehicleReference?: string | null;
  preferredContact: "whatsapp" | "llamada";
  message: string;
};

type SendOwnerAppointmentConfirmedEmailInput = {
  to: string;
  ownerName: string;
  workshopName: string;
  vehicleLabel: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceNeeded: string;
  workshopPhone?: string | null;
  note?: string | null;
};

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      sent: false,
      reason: "missing_config",
    } as const;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();

    return {
      sent: false,
      reason: payload || "send_failed",
    } as const;
  }

  return {
    sent: true,
  } as const;
}

export async function sendWorkshopInquiryEmail(input: SendWorkshopInquiryEmailInput) {
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#151c23">
      <h2>Nueva solicitud de servicio en Fixy</h2>
      <p><strong>Taller:</strong> ${input.workshopName}</p>
      <p><strong>Cliente:</strong> ${input.requesterName}</p>
      <p><strong>Telefono:</strong> ${input.requesterPhone}</p>
      <p><strong>Ubicacion:</strong> ${input.requesterCity || "No especificada"}</p>
      <p><strong>Servicio:</strong> ${input.requestedService}</p>
      <p><strong>Vehiculo:</strong> ${input.vehicleReference || "No especificado"}</p>
      <p><strong>Contacto preferido:</strong> ${input.preferredContact}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${input.message.replace(/\n/g, "<br />")}</p>
    </div>
  `;

  return sendEmail({
    to: input.to,
    subject: `Nueva solicitud para ${input.workshopName} en Fixy`,
    html,
  });
}

export async function sendOwnerAppointmentConfirmedEmail(
  input: SendOwnerAppointmentConfirmedEmailInput,
) {
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#151c23">
      <h2>Tu cita fue confirmada en Fixy</h2>
      <p>Hola <strong>${input.ownerName}</strong>,</p>
      <p>El taller <strong>${input.workshopName}</strong> confirmó tu cita para <strong>${input.vehicleLabel}</strong>.</p>
      <p><strong>Fecha:</strong> ${input.appointmentDate}</p>
      <p><strong>Hora:</strong> ${input.appointmentTime}</p>
      <p><strong>Servicio:</strong> ${input.serviceNeeded}</p>
      <p><strong>Contacto del taller:</strong> ${input.workshopPhone || "Disponible en la app"}</p>
      ${
        input.note
          ? `<p><strong>Mensaje del taller:</strong><br />${input.note.replace(/\n/g, "<br />")}</p>`
          : ""
      }
      <p>Puedes revisar el estado de la cita directamente desde tu cuenta en Fixy.</p>
    </div>
  `;

  return sendEmail({
    to: input.to,
    subject: `Cita confirmada con ${input.workshopName}`,
    html,
  });
}
