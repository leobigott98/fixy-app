import { ClipboardPlus, Coins, UserPlus, Wrench } from "lucide-react";

export const dashboardCards = [
  {
    label: "Presupuestos del dia",
    value: "12",
    helper: "4 pendientes por aprobar",
  },
  {
    label: "Ordenes activas",
    value: "8",
    helper: "2 listas para entrega",
  },
  {
    label: "Cobros por confirmar",
    value: "3",
    helper: "USD 540 por validar",
  },
];

export const dashboardQuickActions = [
  {
    title: "Nuevo presupuesto",
    description: "Crea una cotizacion rapida sin salir del flujo operativo.",
    icon: ClipboardPlus,
  },
  {
    title: "Nueva orden",
    description: "Convierte un trabajo aprobado en seguimiento visual para el taller.",
    icon: Wrench,
  },
  {
    title: "Registrar pago",
    description: "Deja claro quien pago, cuanto y que sigue pendiente.",
    icon: Coins,
  },
  {
    title: "Agregar cliente",
    description: "Guarda cliente y vehiculo en pocos pasos.",
    icon: UserPlus,
  },
];

export const moduleContent = {
  clients: {
    title: "Clientes",
    description: "Base para clientes, contacto rapido y contexto claro antes de cotizar.",
    actionLabel: "Nuevo cliente",
    metrics: [
      { label: "Contacto rapido", value: "WhatsApp", tone: "primary" },
      { label: "Base inicial", value: "Lista", tone: "success" },
      { label: "Historial", value: "Preparado" },
      { label: "Estados", value: "Visible" },
    ],
    quickActions: [
      "Registrar cliente y vehiculo desde una sola vista.",
      "Ver ultimos trabajos antes de responder por WhatsApp.",
      "Detectar clientes frecuentes y pendientes de cobro.",
    ],
    sprintOneNotes: [
      "Agregar lista con busqueda movil, perfil rapido y notas clave del cliente.",
      "Conectar acciones directas a WhatsApp, llamadas y ultimos presupuestos.",
      "Relacionar clientes con vehiculos y repair history sin duplicar datos.",
    ],
  },
  vehicles: {
    title: "Vehiculos",
    description: "Ficha rapida por vehiculo para diagnosticar, cotizar y dar seguimiento sin perder contexto.",
    actionLabel: "Nuevo vehiculo",
    metrics: [
      { label: "Historial", value: "Base" },
      { label: "Estado operativo", value: "Visual", tone: "primary" },
      { label: "Placa", value: "Clave" },
      { label: "VIN", value: "Opcional", tone: "success" },
    ],
    quickActions: [
      "Escanear rapidamente placa, marca, modelo y kilometraje.",
      "Mostrar trabajos recientes y observaciones del taller.",
      "Preparar timeline de reparaciones para Sprint 1.",
    ],
    sprintOneNotes: [
      "Construir vista detalle con resumen tecnico, historial y archivos del vehiculo.",
      "Unir fotos, notas y kilometraje dentro del flujo de ordenes.",
      "Crear relacion directa con presupuestos y ordenes activas.",
    ],
  },
  quotes: {
    title: "Presupuestos",
    description: "Flujo listo para cotizar rapido, aprobar mejor y dejar todo visible para el taller.",
    actionLabel: "Nuevo presupuesto",
    metrics: [
      { label: "Prioridad", value: "Alta", tone: "primary" },
      { label: "Aprobacion", value: "Pendiente", tone: "success" },
      { label: "Items", value: "Escalable" },
      { label: "WhatsApp", value: "Listo" },
    ],
    quickActions: [
      "Crear presupuesto desde cliente o vehiculo con menos pasos.",
      "Preparar envio por WhatsApp con resumen claro y profesional.",
      "Convertir aprobados a orden de trabajo sin reescribir informacion.",
    ],
    sprintOneNotes: [
      "Implementar quote builder con servicios, repuestos y subtotal inmediato.",
      "Agregar estados de borrador, enviado, aprobado y rechazado.",
      "Generar mensaje optimizado para WhatsApp con enlace de aprobacion futura.",
    ],
  },
  "work-orders": {
    title: "Ordenes de trabajo",
    description: "Centro operativo del taller con estatus visibles, responsables y progreso del trabajo.",
    actionLabel: "Nueva orden",
    metrics: [
      { label: "Flujo visual", value: "Kanban", tone: "primary" },
      { label: "Responsable", value: "Visible", tone: "success" },
      { label: "Checklist", value: "Base" },
      { label: "Entrega", value: "Clara" },
    ],
    quickActions: [
      "Mover trabajos por estado sin abrir pantallas pesadas.",
      "Ver responsable, cliente y promesa de entrega desde la tarjeta.",
      "Marcar repuestos faltantes y bloqueos del trabajo.",
    ],
    sprintOneNotes: [
      "Crear board de estados con tarjetas grandes, fotos y alertas de tiempo.",
      "Soportar mano de obra, partes usadas y notas del mecanico.",
      "Vincular avances y cierre con pagos pendientes y repair history.",
    ],
  },
  mechanics: {
    title: "Equipo",
    description: "Base ligera para asignar trabajos, ver carga operativa y mantener claridad dentro del taller.",
    actionLabel: "Agregar integrante",
    metrics: [
      { label: "Carga", value: "Visible", tone: "primary" },
      { label: "Asignacion", value: "Rapida" },
      { label: "Roles", value: "Sprint 1", tone: "success" },
      { label: "Comisiones", value: "Future" },
    ],
    quickActions: [
      "Asignar ordenes por responsable sin formularios pesados.",
      "Ver quien esta libre, ocupado o atrasado.",
      "Preparar base para roles y permisos posteriores.",
    ],
    sprintOneNotes: [
      "Crear staff list con especialidad, estado y carga diaria.",
      "Conectar integrantes con ordenes activas y calendario.",
      "Dejar lista la estructura para comisiones y permisos futuros.",
    ],
  },
  calendar: {
    title: "Calendario",
    description: "Vista compacta para citas, entregas y promesas del taller sin complejidad innecesaria.",
    actionLabel: "Nueva cita",
    metrics: [
      { label: "Agenda diaria", value: "Base", tone: "primary" },
      { label: "Entregas", value: "Claras", tone: "success" },
      { label: "Citas", value: "Listas" },
      { label: "Recordatorios", value: "Future" },
    ],
    quickActions: [
      "Separar ingresos del dia, promesas de entrega y citas nuevas.",
      "Mostrar conflictos de horario con lectura rapida.",
      "Preparar recordatorios por WhatsApp para Sprint 1.",
    ],
    sprintOneNotes: [
      "Implementar agenda por dia con tarjetas compactas y estado visible.",
      "Sincronizar citas con clientes, vehiculos y ordenes.",
      "Anadir recordatorios basicos y filtro por responsable.",
    ],
  },
  inventory: {
    title: "Inventario",
    description: "Base para repuestos criticos, movimientos simples y visibilidad operativa sin parecer contabilidad.",
    actionLabel: "Nuevo repuesto",
    metrics: [
      { label: "Stock critico", value: "Visible", tone: "primary" },
      { label: "Movimientos", value: "Base" },
      { label: "Compras", value: "Future" },
      { label: "Ordenes", value: "Conectable", tone: "success" },
    ],
    quickActions: [
      "Registrar repuestos clave y existencias minimas.",
      "Detectar rapido que falta antes de retrasar una orden.",
      "Preparar salida directa desde orden de trabajo.",
    ],
    sprintOneNotes: [
      "Crear lista mobile-first con stock actual, minimo y costo base.",
      "Anadir movimientos de entrada y salida conectados a ordenes.",
      "Dejar lista la ruta para suppliers y compras en post-MVP.",
    ],
  },
  finances: {
    title: "Finanzas",
    description: "Vista simple para cobros, egresos basicos y salud operativa sin meterse en un ERP pesado.",
    actionLabel: "Registrar movimiento",
    metrics: [
      { label: "Cobros", value: "Claros", tone: "primary" },
      { label: "Caja", value: "Base" },
      { label: "Egresos", value: "Listos" },
      { label: "Reportes", value: "Post-MVP", tone: "success" },
    ],
    quickActions: [
      "Ver dinero pendiente sin abrir pantallas secundarias.",
      "Registrar pago parcial o completo en segundos.",
      "Mantener egresos operativos simples y visibles.",
    ],
    sprintOneNotes: [
      "Construir ledger simple de pagos y gastos con filtros rapidos.",
      "Conectar pagos a presupuestos, ordenes y estados de entrega.",
      "Mantener enfoque operativo antes que contable.",
    ],
  },
  settings: {
    title: "Ajustes",
    description: "Lugar unico para taller, branding basico, usuarios y preparacion de integraciones.",
    actionLabel: "Editar taller",
    metrics: [
      { label: "Perfil del taller", value: "Base", tone: "primary" },
      { label: "Usuarios", value: "Preparado" },
      { label: "WhatsApp", value: "Listo" },
      { label: "Roles", value: "Sprint 1", tone: "success" },
    ],
    quickActions: [
      "Editar datos del taller y branding de presupuestos.",
      "Preparar telefono y enlaces de WhatsApp por defecto.",
      "Definir estructura para miembros y permisos futuros.",
    ],
    sprintOneNotes: [
      "Conectar setup inicial del taller con Supabase y storage.",
      "Agregar miembros, invitaciones y permisos base.",
      "Guardar preferencias de moneda, horarios y mensajes rapidos.",
    ],
  },
} as const;
