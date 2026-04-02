export const workOrderStatusOptions = [
  {
    value: "presupuesto_pendiente",
    label: "Presupuesto pendiente",
  },
  {
    value: "diagnostico_pendiente",
    label: "Diagnostico pendiente",
  },
  {
    value: "en_reparacion",
    label: "En reparacion",
  },
  {
    value: "listo_para_entrega",
    label: "Listo para entrega",
  },
  {
    value: "completada",
    label: "Completada",
  },
  {
    value: "cancelada",
    label: "Cancelada",
  },
] as const;

export const workOrderStatusValues = workOrderStatusOptions.map((option) => option.value) as [
  "presupuesto_pendiente",
  "diagnostico_pendiente",
  "en_reparacion",
  "listo_para_entrega",
  "completada",
  "cancelada",
];

export const workOrderItemTypeOptions = [
  {
    value: "service",
    label: "Servicio",
  },
  {
    value: "part",
    label: "Repuesto",
  },
] as const;
