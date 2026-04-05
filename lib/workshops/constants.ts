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

export const publicProfileVisibilityOptions = [
  {
    value: "private",
    label: "Privado",
    description: "Mantiene el perfil fuera de la vista publica mientras lo preparas.",
  },
  {
    value: "public",
    label: "Publico",
    description: "Activa una pagina lista para compartir y descubrir mas adelante.",
  },
] as const;

export const publicProfileVisibilityValues = ["private", "public"] as const;

export const workshopServiceOptions = [
  "Diagnostico general",
  "Mantenimiento preventivo",
  "Cambio de aceite y filtros",
  "Frenos y suspension",
  "Alineacion y balanceo",
  "Electricidad y bateria",
  "Escaner y sensores",
  "Aire acondicionado",
  "Latoneria y pintura",
  "Cauchos y tren delantero",
] as const;
