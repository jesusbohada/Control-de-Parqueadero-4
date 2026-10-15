/**
 * ============================================================================
 * AGENT SKILLS DATASET (WolfZone POS - Powered by Addy Osmani's agent-skills)
 * ============================================================================
 * Adaptado y especializado para terminales de Punto de Venta (POS),
 * interfaces táctiles industriales y sistemas de parqueadero en producción.
 */

export interface AgentSkill {
  id: string;
  name: string;
  title: string;
  category: 'frontend' | 'quality' | 'security' | 'workflow';
  categoryLabel: string;
  summary: string;
  posApplication: string;
  keyPractices: string[];
  rules: string[];
  checklist: string[];
}

export interface AgentRole {
  id: string;
  name: string;
  role: string;
  focus: string;
  diagnostics: string[];
}

export const AGENT_SKILLS_DATA: AgentSkill[] = [
  // 1. FRONTEND & UI ENGINEERING
  {
    id: 'frontend-ui-engineering',
    name: 'frontend-ui-engineering',
    title: 'Frontend UI Engineering & Accesibilidad',
    category: 'frontend',
    categoryLabel: 'Frontend & UI',
    summary: 'Construye interfaces de calidad de producción, altamente accesibles (WCAG AAA) y responsivas, eliminando la estética genérica de IA.',
    posApplication: 'Garantiza objetivos táctiles mínimos de 48px para cajeros, tipografía tabular en placas y dinero, y navegación por teclado numérico.',
    keyPractices: [
      'Touch Targets de 48px a 52px con respuesta activa táctil (active:scale-95).',
      'Contraste de texto Slate-950 (Light) y Slate-50 (Dark) con ratio > 16:1.',
      'Composición de componentes sobre configuraciones masivas monolíticas.',
      'Cero píldoras decorativas inútiles; diseño industrial estructurado.'
    ],
    rules: [
      'Ningún botón interactivo menor a 44x44px en pantallas de punto de venta.',
      'Siempre asociar etiquetas (labels) con inputs y selects mediante htmlFor.',
      'Soportar atajos directos (Enter para cobrar, Escape para cancelar).'
    ],
    checklist: [
      '¿El contraste pasa el estándar WCAG AAA en modo claro y oscuro?',
      '¿Los montos monetarios usan cifras tabulares font-mono?',
      '¿Los modales capturan el foco (focus trap) y se cierran con Escape?'
    ]
  },
  {
    id: 'performance-optimization',
    name: 'performance-optimization',
    title: 'Optimización de Rendimiento & Web Vitals',
    category: 'frontend',
    categoryLabel: 'Frontend & UI',
    summary: 'Optimización de Interaction to Next Paint (INP), Largest Contentful Paint (LCP) y presupuesto de renderizado.',
    posApplication: 'Renderizado ultra-rápido de cuadrículas de parqueo con 500+ plazas simultáneas a 60 FPS y cálculo de tarifas en < 5ms.',
    keyPractices: [
      'Memoización de cálculos pesados de facturación mediante useMemo.',
      'Virtualización de listas en reportes con más de 1,000 tickets diarios.',
      'Eliminación de re-renders innecesarios en inputs de placas de vehículos.',
      'Aceleración por GPU en transiciones CSS críticas.'
    ],
    rules: [
      'Tiempo de interacción (INP) menor a 100ms en cada pulsación de caja.',
      'Evitar llamadas a funciones complejas dentro del ciclo de render directo.',
      'Desacoplar el temporizador del reloj del estado de los formularios de entrada.'
    ],
    checklist: [
      '¿La cuadrícula de plazas mantiene 60 FPS al cambiar de zona?',
      '¿El cálculo de tarifa en vivo utiliza useMemo / useCallback?',
      '¿El tamaño del bundle está optimizado con Tree Shaking?'
    ]
  },
  {
    id: 'browser-testing-with-devtools',
    name: 'browser-testing-with-devtools',
    title: 'Auditoría & Pruebas con DevTools',
    category: 'frontend',
    categoryLabel: 'Frontend & UI',
    summary: 'Diagnóstico profundo del árbol DOM, capas de renderizado, fugas de memoria y eventos táctiles.',
    posApplication: 'Verificación de renderizado térmico (@media print) y simulación de pantallas táctiles de baja gama.',
    keyPractices: [
      'Auditoría de capas de pintura (Paint Flashing) en el mapa de estacionamiento.',
      'Simulación de aceleración de red y desconexión total (Offline mode).',
      'Inspección de tiempos de respuesta en eventos touchstart vs click.'
    ],
    rules: [
      'Cero desbordamientos horizontales (horizontal scrolling) no intencionados.',
      'Verificar que las hojas de estilo de impresión no incluyan elementos UI interactivos.'
    ],
    checklist: [
      '¿La vista de impresión térmica oculta barras laterales y botones?',
      '¿No hay fugas de listeners en componentes de actualización periódica?'
    ]
  },
  {
    id: 'code-simplification',
    name: 'code-simplification',
    title: 'Simplificación de Código & Anti-Bloat',
    category: 'frontend',
    categoryLabel: 'Frontend & UI',
    summary: 'Remueve sobre-ingeniería, código muerto y capas de abstracción innecesarias manteniendo el código directo y legible.',
    posApplication: 'Simplificación de formularios de cobro y eliminación de condicionales anidados redundantes en la lógica de cobro.',
    keyPractices: [
      'Reemplazar árboles ternarios profundos por mapas de estados claros.',
      'Eliminar dependencias externas superfluas cuando bastan APIs nativas.',
      'Nombrado explícito y autodocumentado en utilidades de facturación.'
    ],
    rules: [
      'Funciones con una sola responsabilidad demostrable.',
      'Cero abstracción prematura antes de que un patrón se repita al menos 3 veces.'
    ],
    checklist: [
      '¿La lógica de tarifas es legible en menos de 2 minutos de lectura?',
      '¿Se eliminaron clases Tailwind duplicadas o conflictivas?'
    ]
  },

  // 2. CALIDAD & TESTING
  {
    id: 'code-review-and-quality',
    name: 'code-review-and-quality',
    title: 'Revisión Exhaustiva de Código & Calidad',
    category: 'quality',
    categoryLabel: 'Calidad & Testing',
    summary: 'Detección proactiva de defectos, reducción de complejidad ciclomática y verificación de tipado estricto.',
    posApplication: 'Auditoría continua de integridad en el flujo de dinero, apertura de turnos de caja y conciliación contable.',
    keyPractices: [
      'Chequeo estricto de tipos TypeScript sin el uso de "any" en modelos financieros.',
      'Verificación de invariantes contables (efectivo inicial + ventas - gastos = total).',
      'Defensa contra valores undefined en tickets históricos sin fecha de salida.'
    ],
    rules: [
      'Toda operación que modifique saldo debe tener registro auditable.',
      'Prohibido mutar estados globales directamente fuera de sus setters.'
    ],
    checklist: [
      '¿Todas las funciones financieras tienen contratos de tipos estrictos?',
      '¿Los casos nulos (tickets extraviados, sin plaza) están manejados?'
    ]
  },
  {
    id: 'test-driven-development',
    name: 'test-driven-development',
    title: 'Desarrollo Guiado por Pruebas (TDD)',
    category: 'quality',
    categoryLabel: 'Calidad & Testing',
    summary: 'Creación de pruebas unitarias y de integración para asegurar que las reglas críticas nunca fallen.',
    posApplication: 'Pruebas automatizadas de tarifas fraccionadas, periodos de gracia (ej. 15 min), tarifa plena nocturna y redondeos.',
    keyPractices: [
      'Batería de casos de prueba con vehículos que ingresan en un día y salen al siguiente.',
      'Simulación de cobros con monedas fraccionarias y redondeo a la centena.',
      'Pruebas de cambio de tarifa a mitad de una estancia activa.'
    ],
    rules: [
      'El cálculo del periodo de gracia debe retornar siempre $0 sin importar la categoría.',
      'La tarifa mínima debe aplicarse solo si se supera el periodo de gracia.'
    ],
    checklist: [
      '¿Se probó el cambio de turno mientras hay vehículos dentro del patio?',
      '¿Se validó el cálculo de cobro en años bisiestos y cambios de horario?'
    ]
  },
  {
    id: 'doubt-driven-development',
    name: 'doubt-driven-development',
    title: 'Desarrollo Guiado por la Duda & Casos Límite',
    category: 'quality',
    categoryLabel: 'Calidad & Testing',
    summary: 'Cuestionamiento sistemático de suposiciones felices. "¿Qué pasa si se va la luz? ¿Qué pasa si el lector escanea 3 veces?"',
    posApplication: 'Defensa contra doble escaneo de tickets de salida, duplicación de placas en entrada y desconexión de base de datos.',
    keyPractices: [
      'Detección y bloqueo inmediato de ingreso de placas ya registradas activas.',
      'Debounce en lectores de código de barras para ignorar ráfagas de pulsaciones repetidas.',
      'Recuperación transparente ante recarga accidental de la página durante un cobro.'
    ],
    rules: [
      'Nunca confiar en que el usuario no hará clic dos veces seguidas en "Cobrar".',
      'Bloquear botones con estado isSubmitting durante la emisión de tickets.'
    ],
    checklist: [
      '¿Existe advertencia visual inmediata si una placa ya está en el patio?',
      '¿El botón de cobro se deshabilita durante el procesamiento?'
    ]
  },
  {
    id: 'debugging-and-error-recovery',
    name: 'debugging-and-error-recovery',
    title: 'Depuración Sistemática & Resiliencia',
    category: 'quality',
    categoryLabel: 'Calidad & Testing',
    summary: 'Aislamiento metódico de fallas, trazabilidad con logs estructurados y auto-recuperación de estado.',
    posApplication: 'Modal de auto-recuperación y verificación de integridad de base de datos si ocurre un corte eléctrico en la caja.',
    keyPractices: [
      'Rutina de verificación de integridad al iniciar el sistema.',
      'Captura de excepciones en drivers de impresora térmica con modo fallback a PDF.',
      'Sincronización reactiva con almacenamiento local en caso de error de red.'
    ],
    rules: [
      'Ningún error no controlado debe dejar la pantalla de taquilla en blanco (Error Boundaries).',
      'Proveer siempre un botón de reinicio seguro o exportación de emergencia.'
    ],
    checklist: [
      '¿Existe modal de recuperación de integridad de base de datos?',
      '¿Los errores de red no bloquean la operación local de entrada/salida?'
    ]
  },

  // 3. SEGURIDAD & ARQUITECTURA
  {
    id: 'security-and-hardening',
    name: 'security-and-hardening',
    title: 'Seguridad & Endurecimiento del Sistema',
    category: 'security',
    categoryLabel: 'Seguridad & Arquitectura',
    summary: 'Principio de menor privilegio, saneamiento de entradas, protección contra manipulaciones y auditoría inmutable.',
    posApplication: 'Arqueo ciego de caja para cajeros, rutas administrativas protegidas con PIN maestro y auditoría de anulación de tickets.',
    keyPractices: [
      'Cierre ciego de turno: el cajero no ve el monto esperado hasta digitar su conteo físico.',
      'Rutas protegidas con sesiones temporales y bloqueo automático tras inactividad.',
      'Sanitización de placas y referencias bancarias para prevenir inyecciones.'
    ],
    rules: [
      'Ningún cajero puede editar tarifas o ver utilidades sin rol de administrador.',
      'Toda anulación de ticket requiere motivo justificado y usuario responsable.'
    ],
    checklist: [
      '¿El cierre de turno oculta el valor calculado hasta confirmar el físico?',
      '¿Las rutas administrativas solicitan clave maestra con expiración de sesión?',
      '¿Se auditan los intentos fallidos de acceso a configuración?'
    ]
  },
  {
    id: 'api-and-interface-design',
    name: 'api-and-interface-design',
    title: 'Diseño de Interfaces & Contratos Tipados',
    category: 'security',
    categoryLabel: 'Seguridad & Arquitectura',
    summary: 'Diseño de tipos TypeScript ergonómicos, contratos claros, respuestas inmutables y separación de capas.',
    posApplication: 'Estructuración sólida de modelos de datos (Tickets, Turnos, Puestos, Tarifas, Sucursales) en types/index.ts.',
    keyPractices: [
      'Contratos inmutables para tickets pagados (no mutar tickets una vez liquidados).',
      'Definición de enums o union types estrictos para estados de plaza (available | occupied | reserved).',
      'Encapsulación de llamadas a servicios en capas desacopladas de la vista.'
    ],
    rules: [
      'Los componentes de UI solo reciben datos listos y emiten eventos tipados.',
      'Separar la lógica de facturación en utilidades puras probables sin DOM.'
    ],
    checklist: [
      '¿Las funciones de cobro son funciones puras independientes de React?',
      '¿Los tipos de vehículos y tarifas están centralizados?'
    ]
  },
  {
    id: 'observability-and-instrumentation',
    name: 'observability-and-instrumentation',
    title: 'Observabilidad, Telemetría & Diagnóstico',
    category: 'security',
    categoryLabel: 'Seguridad & Arquitectura',
    summary: 'Instrumentación de métricas de salud, monitoreo proactivo de recursos, alertas tempranas y telemetría de red.',
    posApplication: 'Monitoreo de espacio en disco del host (<500MB crítico), latencia WebSocket con sedes y estado de hardware.',
    keyPractices: [
      'Widget en TopNavbar con barra de espacio en disco en tiempo real.',
      'Contador de paquetes de sincronización pendientes con matriz central.',
      'Registro cronológico de eventos en consola y almacenamiento local.'
    ],
    rules: [
      'Alertar visualmente con banner rojo si el disco libre baja de 500 MB.',
      'Mostrar estado de conexión en vivo (🟢 En Línea / 🔴 Offline).'
    ],
    checklist: [
      '¿El indicador de disco libre es visible en la barra superior?',
      '¿La telemetría de sedes registra latencia y versión de software?'
    ]
  },
  {
    id: 'spec-driven-development',
    name: 'spec-driven-development',
    title: 'Desarrollo Guiado por Especificaciones',
    category: 'security',
    categoryLabel: 'Seguridad & Arquitectura',
    summary: 'Formalización de reglas de negocio, flujos de estados y algoritmos antes de escribir código.',
    posApplication: 'Definición formal de los 88 estilos visuales UI/UX, matrices de permisos RBAC y algoritmos de redondeo.',
    keyPractices: [
      'Documentación de la matriz de permisos por rol en data/initialData.ts.',
      'Definición de tokens semánticos en index.css antes de estilar vistas.',
      'Especificación de esquemas JSON para sincronización entre sucursales.'
    ],
    rules: [
      'Cualquier nueva regla de cobro debe documentarse primero en las tarifas del sistema.',
      'Los estados de transición de un ticket deben seguir un flujo estricto (activo -> liquidado -> archivado).'
    ],
    checklist: [
      '¿Las tarifas soportan fracciones de minuto, hora, día y tiquete perdido?',
      '¿Los roles y permisos cubren cajero, supervisor, administrador y master?'
    ]
  },

  // 4. FLUJO DE TRABAJO & DESPLIEGUE
  {
    id: 'shipping-and-launch',
    name: 'shipping-and-launch',
    title: 'Despliegue & Checklist de Lanzamiento',
    category: 'workflow',
    categoryLabel: 'Workflow & Lanzamiento',
    summary: 'Procedimientos rigurosos de pre-lanzamiento, pruebas de humo (smoke tests) y planes de reversión (rollback).',
    posApplication: 'Protocolo de apertura de sucursal nueva, verificación de conectividad y auto-test de impresión térmica.',
    keyPractices: [
      'Autodiagnóstico inicial del sistema al iniciar sesión el operador.',
      'Comprobación de que la hora del host está sincronizada para evitar cobros erróneos.',
      'Verificación de que existen plazas libres configuradas para cada categoría de vehículo.'
    ],
    rules: [
      'No permitir apertura de caja sin declarar el fondo inicial en efectivo.',
      'Tener siempre respaldo local descargable de la base de datos antes de una actualización OTA.'
    ],
    checklist: [
      '¿Se realizó la prueba de impresión de ticket de prueba?',
      '¿La base de datos local tiene backup automático configurado?',
      '¿El sistema compila al 100% con tsc sin advertencias críticas?'
    ]
  },
  {
    id: 'git-workflow-and-versioning',
    name: 'git-workflow-and-versioning',
    title: 'Flujo de Versiones & Trazabilidad Git',
    category: 'workflow',
    categoryLabel: 'Workflow & Lanzamiento',
    summary: 'Convención de commits semánticos, versionado SemVer y control de cambios reproducible.',
    posApplication: 'Historial de compilaciones (SoftwareReleaseBuild) y paquetes de actualización central (CentralUpdatePackage).',
    keyPractices: [
      'Control de versiones del POS con formato SemVer (ej. v3.4.0).',
      'Registro inmutable de paquetes de actualización aplicados a cada terminal.',
      'Separación limpia entre ramas de desarrollo y despliegue en producción.'
    ],
    rules: [
      'Cada versión publicada debe incluir notas de cambio (Changelog).',
      'Los paquetes de actualización OTA deben contener hash de integridad.'
    ],
    checklist: [
      '¿El historial de versiones registra fecha, versión y hash de build?',
      '¿Es posible revertir una actualización en caso de incompatibilidad?'
    ]
  },
  {
    id: 'documentation-and-adrs',
    name: 'documentation-and-adrs',
    title: 'Documentación & Registros de Decisiones (ADRs)',
    category: 'workflow',
    categoryLabel: 'Workflow & Lanzamiento',
    summary: 'Documentación viva de la arquitectura, decisiones de diseño, scripts de automatización y guías operativas.',
    posApplication: 'Guía de scripts .BAT de auto-reinicio, manual de terminales VNC y documentación de hardware para operarios.',
    keyPractices: [
      'Modal interactivo de documentación de scripts .BAT en TopNavbar.',
      'Documentación técnica clara para soporte en campo de impresoras y cámaras LPR.',
      'Registro de decisiones arquitectónicas (ej. adopción de Tailwind CSS + tokens semánticos).'
    ],
    rules: [
      'La documentación para cajeros debe ser concisa, visual y con capturas o pasos numerados.',
      'Los scripts de mantenimiento deben tener comentarios explicativos sobre su orden de ejecución.'
    ],
    checklist: [
      '¿Existe acceso directo a la guía de scripts .BAT desde la barra superior?',
      '¿Los procedimientos de emergencia están documentados en la interfaz?'
    ]
  },
  {
    id: 'ci-cd-and-automation',
    name: 'ci-cd-and-automation',
    title: 'Automatización, Linting & Compilación Continua',
    category: 'workflow',
    categoryLabel: 'Workflow & Lanzamiento',
    summary: 'Garantía de compilación limpia (tsc --noEmit), verificación de linters y optimización de activos.',
    posApplication: 'Compilación sin errores de TypeScript en cada cambio del POS para evitar caídas en taquillas en vivo.',
    keyPractices: [
      'Verificación automatizada con TypeScript antes de empaquetar ejecutables.',
      'Aislamiento de carpetas de respaldo para no contaminar el árbol de tipos principal.',
      'Compilación de producción con Vite para máxima velocidad de arranque del POS.'
    ],
    rules: [
      'Cero errores en el comando de compilación (compile_applet).',
      'Dependencias de producción estrictamente bloqueadas para consistencia de ejecución.'
    ],
    checklist: [
      '¿El comando tsc compila limpiamente con 0 errores de tipado?',
      '¿El dev server reinicia sin fallas ni advertencias no resueltas?'
    ]
  }
];

export const AGENT_ROLES: AgentRole[] = [
  {
    id: 'code-reviewer',
    name: 'Code Reviewer & Quality Auditor',
    role: 'Auditor de Calidad y Complejidad',
    focus: 'Estructura de componentes, tipos estrictos, acoplamiento y legibilidad.',
    diagnostics: [
      'Estructura modular de vistas y componentes de taquilla',
      'Tipado estricto sin "any" en cálculos financieros',
      'Desacoplamiento de lógica de cobro en funciones puras'
    ]
  },
  {
    id: 'web-performance-auditor',
    name: 'Web Performance Auditor',
    role: 'Auditor de Rendimiento & Render POS',
    focus: 'Tiempo de respuesta al cobrar, velocidad de la cuadrícula de plazas y framerate.',
    diagnostics: [
      'Tiempo de ejecución en el cálculo de tarifas (<5ms)',
      'Renderizado reactivo de la cuadrícula de estacionamiento (60 FPS)',
      'Uso de useMemo en filtros de plazas y reportes'
    ]
  },
  {
    id: 'security-auditor',
    name: 'Security & Integrity Auditor',
    role: 'Auditor de Seguridad Financiera y Roles',
    focus: 'Protección de rutas de administración, arqueo ciego y prevención de duplicados.',
    diagnostics: [
      'Verificación de cierre de turno ciego de caja',
      'Estado de las rutas administrativas con PIN maestro',
      'Validación de duplicidad en ingreso de placas'
    ]
  },
  {
    id: 'test-engineer',
    name: 'POS Test Engineer',
    role: 'Ingeniero de Pruebas y Casos Límite',
    focus: 'Casos extremos en cobro, cambio de turno nocturno y recuperación ante fallas.',
    diagnostics: [
      'Validación de periodo de gracia (15 min = $0)',
      'Prueba de persistencia de tickets tras recarga del sistema',
      'Comprobación de alertas de disco crítico (<500MB)'
    ]
  }
];
