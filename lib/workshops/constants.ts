export const workshopTypeOptions = [
  "Mecanica general",
  "Latoneria y pintura",
  "Electricidad automotriz",
  "Cauchos y alineacion",
  "Multiservicio",
  "Especializado",
] as const;

export const openingDaysOptions = [
  "Lunes a viernes",
  "Lunes a sabado",
  "Turnos rotativos",
  "24/7",
] as const;

export const currencyDisplayOptions = [
  {
    value: "USD",
    label: "USD",
    description: "Muestra montos en dolares.",
  },
  {
    value: "VES",
    label: "Bs.",
    description: "Muestra montos en bolivares.",
  },
  {
    value: "USD_VES",
    label: "USD + Bs.",
    description: "Mantiene una referencia doble.",
  },
] as const;

export const currencyDisplayValues = ["USD", "VES", "USD_VES"] as const;
