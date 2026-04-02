export const quoteStatusOptions = [
  {
    value: "draft",
    label: "Borrador",
  },
  {
    value: "sent",
    label: "Enviado",
  },
  {
    value: "approved",
    label: "Aprobado",
  },
  {
    value: "rejected",
    label: "Rechazado",
  },
  {
    value: "expired",
    label: "Vencido",
  },
] as const;

export const quoteStatusValues = quoteStatusOptions.map((option) => option.value) as [
  "draft",
  "sent",
  "approved",
  "rejected",
  "expired",
];

export const quoteItemTypeOptions = [
  {
    value: "labor",
    label: "Mano de obra",
  },
  {
    value: "part",
    label: "Repuesto",
  },
] as const;
