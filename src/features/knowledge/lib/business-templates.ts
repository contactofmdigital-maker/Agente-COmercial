export type BusinessSector = "digital_services" | "furniture" | "real_estate" | "fast_food" | "barber_beauty" | "professional_services";

export type KnowledgeQuestion = {
  question: string;
  answer: string;
};

export type BusinessTemplate = {
  id: BusinessSector;
  label: string;
  description: string;
  questions: KnowledgeQuestion[];
};

export const BUSINESS_TEMPLATES: Record<BusinessSector, BusinessTemplate> = {
  digital_services: {
    id: "digital_services",
    label: "Servicios digitales y marketing",
    description: "Agencias, consultores y proveedores de servicios digitales.",
    questions: [
      { question: "¿Qué servicios digitales ofrecen?", answer: "Ofrecemos los servicios que el negocio haya registrado en su catálogo, por ejemplo diseño web, landing pages, SEO, campañas publicitarias y analítica. El agente debe confirmar cuáles están efectivamente disponibles antes de ofrecerlos." },
      { question: "¿Cómo puedo saber qué servicio necesito?", answer: "Primero identificamos el objetivo, el estado actual del negocio y el principal problema. Con esa información recomendamos una alternativa adecuada, sin prometer resultados garantizados." },
      { question: "¿Cuánto cuesta el servicio?", answer: "El precio depende del servicio, alcance y requerimientos. El agente debe consultar los precios configurados por el negocio y, si no existen, solicitar los datos para preparar una cotización." },
      { question: "¿Cuánto demora la implementación?", answer: "El plazo depende del alcance, materiales y aprobaciones del cliente. Nunca se debe inventar una fecha; se confirma con el equipo responsable." },
      { question: "¿Qué necesitan para comenzar?", answer: "Normalmente se requiere una descripción del negocio, objetivos, público, accesos o materiales pertinentes y una persona de contacto. Los requisitos exactos dependen del servicio contratado." },
      { question: "¿Incluyen diseño y desarrollo web?", answer: "Solo si ese servicio está incluido en la oferta del negocio. El agente debe aclarar qué entregables, revisiones, integraciones y soporte contempla cada propuesta." },
      { question: "¿Trabajan SEO para mejorar la visibilidad en Google?", answer: "Se puede evaluar una estrategia SEO según el sitio, competencia y objetivos. No se deben garantizar posiciones ni plazos específicos en buscadores." },
      { question: "¿Gestionan campañas de Google Ads o Meta Ads?", answer: "La gestión de campañas se ofrece únicamente si está dentro del catálogo. La inversión publicitaria y los honorarios deben explicarse por separado cuando corresponda." },
      { question: "¿El presupuesto de publicidad está incluido?", answer: "No debe asumirse que está incluido. El agente debe revisar la propuesta y diferenciar honorarios de gestión, producción y presupuesto pagado a las plataformas." },
      { question: "¿Puedo contratar un servicio por separado?", answer: "Depende de las modalidades comerciales definidas por el negocio. El agente puede registrar la necesidad y confirmar si existe una contratación individual." },
      { question: "¿Cómo miden los resultados?", answer: "Los indicadores se definen según el objetivo: consultas, conversiones, tráfico, costo por resultado, ventas u otros. Se debe informar solo sobre métricas que realmente se midan." },
      { question: "¿Entregan informes de rendimiento?", answer: "La frecuencia y formato de los informes dependen del plan contratado. El agente debe confirmar las condiciones específicas antes de comprometer una entrega." },
      { question: "¿Ofrecen soporte después de la entrega?", answer: "El soporte depende del servicio y contrato. Se deben indicar claramente el canal, horario, duración y alcance que el negocio tenga establecidos." },
      { question: "¿Pueden trabajar con mi sitio o herramientas actuales?", answer: "Primero se revisan la plataforma, accesos, integraciones y estado técnico. La compatibilidad se confirma después de esa evaluación." },
      { question: "¿Cómo puedo contratar o solicitar una cotización?", answer: "El agente recopila nombre, empresa, contacto, servicio de interés, objetivo y plazo esperado. Luego deriva la solicitud al equipo para confirmar alcance y propuesta." }
    ]
  },
  furniture: {
    id: "furniture",
    label: "Muebles y decoración",
    description: "Tiendas, fabricantes y comercios de muebles y artículos para el hogar.",
    questions: [
      { question: "¿Qué tipos de muebles venden o fabrican?", answer: "El agente debe informar únicamente las categorías disponibles en el catálogo del negocio, como mesas, sillas, camas, escritorios, muebles infantiles o soluciones a medida." },
      { question: "¿Los muebles están disponibles para entrega inmediata?", answer: "La disponibilidad debe verificarse en el inventario actualizado. Si no hay confirmación de stock, el agente registra el producto consultado y solicita validación." },
      { question: "¿Fabrican muebles a medida?", answer: "Se confirma según las capacidades del fabricante. Para evaluar una solicitud se deben recopilar medidas, diseño de referencia, material y lugar de entrega." },
      { question: "¿Qué medidas tiene el producto?", answer: "Las dimensiones deben obtenerse de la ficha del producto. Nunca se deben estimar medidas ni asegurar que un mueble cabe en un espacio sin datos." },
      { question: "¿Qué materiales utilizan?", answer: "El agente informa los materiales especificados para cada producto, incluyendo estructura, superficies, terminaciones y tapizados cuando corresponda." },
      { question: "¿Qué colores o terminaciones están disponibles?", answer: "Las opciones dependen del modelo y stock. Se deben compartir solo los colores y acabados confirmados por el negocio." },
      { question: "¿Cuál es el precio del mueble?", answer: "El precio se consulta en el catálogo vigente y puede variar por tamaño, material o personalización. Si falta el dato, se solicita una cotización sin inventar valores." },
      { question: "¿Tienen descuentos o promociones?", answer: "Solo se informan promociones vigentes y autorizadas. El agente debe indicar condiciones, fechas y productos incluidos cuando estén disponibles." },
      { question: "¿Cómo puedo realizar una compra?", answer: "El agente explica los canales de compra habilitados y recopila el producto, variante y datos de contacto para continuar el proceso." },
      { question: "¿Qué medios de pago aceptan?", answer: "Se deben indicar exclusivamente los medios de pago configurados por el comercio y cualquier condición relevante, como cuotas o anticipos." },
      { question: "¿Realizan despachos a domicilio?", answer: "La cobertura, costo y plazo de despacho deben verificarse según comuna, ciudad y dimensiones del producto antes de confirmar." },
      { question: "¿Cuánto demora la fabricación o entrega?", answer: "El plazo depende del stock, personalización y agenda de producción o despacho. Se confirma con el equipo; no se inventan fechas." },
      { question: "¿El mueble requiere armado?", answer: "La ficha del producto debe indicar si se entrega armado, requiere montaje o incluye instrucciones. El agente debe confirmar si existe servicio de armado." },
      { question: "¿Qué garantía tienen los productos?", answer: "Se informa la garantía y sus condiciones según la política vigente y la normativa aplicable. No se amplían ni restringen condiciones por cuenta propia." },
      { question: "¿Puedo solicitar cambios, devoluciones o ayuda posventa?", answer: "El agente recopila número de pedido, producto y motivo, y deriva el caso según la política de cambios, devoluciones y garantía del comercio." }
    ]
  },
  real_estate: {
    id: "real_estate",
    label: "Inmobiliaria y propiedades",
    description: "Corredores, asesores y empresas de compraventa o arriendo.",
    questions: [
      { question: "¿Qué propiedades tienen disponibles?", answer: "El agente debe consultar el inventario vigente y mostrar solo propiedades publicadas y disponibles. Si no puede verificar el estado, debe confirmarlo con el corredor." },
      { question: "¿La propiedad está en venta o arriendo?", answer: "La modalidad se obtiene de la ficha de la propiedad. No se debe asumir que una propiedad está disponible en ambas modalidades." },
      { question: "¿Cuál es el precio de venta o valor de arriendo?", answer: "Se informa el valor vigente publicado y la moneda correspondiente. Gastos comunes, garantías y otros cargos se detallan por separado cuando estén confirmados." },
      { question: "¿Dónde está ubicada la propiedad?", answer: "Se comparte la ubicación o sector autorizado en la ficha. La dirección exacta se entrega según la política del propietario y del corredor." },
      { question: "¿Cuántos dormitorios y baños tiene?", answer: "La cantidad se consulta en las características verificadas de la propiedad. Si el dato no está registrado, se solicita confirmación al corredor." },
      { question: "¿Cuáles son los metros cuadrados y características?", answer: "Se informan superficie útil, total, terreno y características solo cuando estén respaldadas por la ficha o documentación de la propiedad." },
      { question: "¿La propiedad tiene estacionamiento, bodega o patio?", answer: "El agente revisa los atributos registrados para esa propiedad y distingue entre espacios incluidos y adicionales." },
      { question: "¿Puedo agendar una visita?", answer: "Se recopilan nombre, teléfono, propiedad de interés y disponibilidad horaria. La visita queda pendiente hasta que el corredor confirme fecha y hora." },
      { question: "¿Qué documentos necesito para arrendar?", answer: "Los requisitos dependen del propietario y del proceso de evaluación. El agente entrega únicamente la lista vigente definida por la corredora." },
      { question: "¿Qué requisitos solicitan para comprar?", answer: "Se debe explicar el proceso definido por la corredora y distinguir entre compra con recursos propios y financiamiento. La aprobación crediticia corresponde a la entidad financiera." },
      { question: "¿Se acepta subsidio o crédito hipotecario?", answer: "La aceptación depende de la propiedad, vendedor y condiciones de la operación. El agente registra el tipo de financiamiento y deriva la consulta para confirmación." },
      { question: "¿Cuánto se paga de garantía y gastos comunes?", answer: "Los montos se consultan en la ficha y condiciones vigentes. Si no están especificados, se confirma con el corredor antes de informar." },
      { question: "¿La propiedad admite mascotas?", answer: "La autorización debe confirmarse con el propietario y quedar reflejada en las condiciones del arriendo. No se debe prometer aceptación sin validación." },
      { question: "¿Quién gestiona el contrato y la documentación?", answer: "El agente explica el procedimiento de la corredora y deriva dudas legales o contractuales al responsable correspondiente. No reemplaza asesoría legal." },
      { question: "¿Cómo puedo dejar una propiedad para venta o arriendo?", answer: "Se recopilan datos del propietario, dirección o sector, tipo de operación, características y contacto. Luego se coordina una evaluación y revisión de antecedentes." }
    ]
  },
  fast_food: {
    id: "fast_food",
    label: "Comida rápida y restaurantes",
    description: "Restaurantes, cafeterías, locales de comida rápida y delivery.",
    questions: [
      { question: "¿Qué productos y platos ofrecen?", answer: "El agente debe describir únicamente los productos del menú vigente, incluyendo opciones, tamaños y acompañamientos confirmados." },
      { question: "¿Dónde puedo revisar el menú?", answer: "Se comparte el menú o carta oficial vigente. Si existe una versión digital, se facilita el enlace configurado por el negocio." },
      { question: "¿Cuáles son los precios?", answer: "Los precios se consultan en el menú vigente y se indican con sus tamaños o variantes. Nunca se inventan valores ni promociones." },
      { question: "¿Tienen promociones o combos?", answer: "Solo se informan promociones activas y autorizadas, detallando productos incluidos, vigencia y condiciones." },
      { question: "¿Tienen opciones vegetarianas, veganas o especiales?", answer: "Se revisan los ingredientes y la información confirmada por cocina. No se garantiza que un plato sea apto para alergias o restricciones sin validación." },
      { question: "¿Qué alérgenos contienen los productos?", answer: "El agente no debe adivinar ingredientes ni asegurar ausencia de trazas. Debe consultar la ficha de ingredientes o derivar la pregunta al equipo." },
      { question: "¿Puedo personalizar mi pedido?", answer: "Las modificaciones dependen del producto y la operación del local. Se confirma qué ingredientes, agregados o sustituciones están permitidos." },
      { question: "¿Realizan delivery a mi domicilio?", answer: "La cobertura se verifica según dirección o comuna y canal de despacho. No se confirma disponibilidad fuera de la zona atendida." },
      { question: "¿Cuánto cuesta el despacho?", answer: "El costo se consulta según ubicación, plataforma y condiciones vigentes. Si no está disponible, se confirma antes de cerrar el pedido." },
      { question: "¿Cuánto demora mi pedido?", answer: "El tiempo depende de demanda, preparación y distancia. Se informa solo el tiempo estimado confirmado por el sistema o el local." },
      { question: "¿Puedo retirar mi pedido en el local?", answer: "Se confirma si el local ofrece retiro, la sucursal disponible y el horario para entregar el pedido." },
      { question: "¿Qué medios de pago aceptan?", answer: "Se informan únicamente los medios de pago habilitados por el comercio o la plataforma de pedidos." },
      { question: "¿Cuál es el horario de atención?", answer: "Se comparte el horario vigente de la sucursal correspondiente y se advierten cambios o cierres especiales confirmados." },
      { question: "¿Cómo puedo reservar una mesa o hacer un pedido grupal?", answer: "Se recopilan fecha, hora, cantidad de personas o productos, sucursal y contacto. La reserva o pedido queda sujeto a confirmación del local." },
      { question: "¿Cómo puedo reclamar o consultar por un pedido?", answer: "Se solicita número de pedido, canal de compra, fecha y detalle del inconveniente, y se deriva al responsable para revisión." }
    ]
  },
  barber_beauty: {
    id: "barber_beauty",
    label: "Barbería y peluquería",
    description: "Barberías, peluquerías, salones de belleza y profesionales del cuidado personal.",
    questions: [
      { question: "¿Qué servicios realizan?", answer: "El agente debe informar los servicios incluidos en el catálogo del local, como cortes, barbería, coloración, peinados o tratamientos, según disponibilidad real." },
      { question: "¿Cuánto cuesta cada servicio?", answer: "Los valores se consultan en la lista de precios vigente y pueden depender del largo, técnica, profesional o complejidad. No se inventan precios." },
      { question: "¿Cuánto dura cada servicio?", answer: "La duración se informa según la agenda y el servicio solicitado. Si no existe un tiempo definido, se confirma con el profesional." },
      { question: "¿Necesito reservar una hora?", answer: "Se explica si el local atiende con reserva, por orden de llegada o con ambas modalidades, según su política actual." },
      { question: "¿Qué horarios y días tienen disponibles?", answer: "La disponibilidad se consulta en la agenda vigente. El horario general del local no garantiza que exista una hora libre." },
      { question: "¿Puedo elegir a un barbero o estilista?", answer: "Se confirma qué profesionales están disponibles y si el cliente puede seleccionar a una persona al reservar." },
      { question: "¿Qué incluye el servicio?", answer: "Se detallan solo las etapas y productos incluidos en la ficha del servicio. Extras o adicionales se informan por separado." },
      { question: "¿Realizan coloración, tintes o decoloración?", answer: "Se confirma según los servicios ofrecidos y se recopila historial químico, largo y objetivo para que el profesional evalúe el procedimiento." },
      { question: "¿Debo enviar una foto de referencia?", answer: "Se puede solicitar una imagen de referencia para comprender el resultado esperado, aclarando que el profesional debe evaluar su viabilidad." },
      { question: "¿Ofrecen diagnóstico o asesoría antes del servicio?", answer: "Se confirma si existe evaluación previa y si tiene costo. Las recomendaciones técnicas finales corresponden al profesional." },
      { question: "¿Qué cuidados debo tener después del servicio?", answer: "Se entregan indicaciones generales aprobadas por el profesional y específicas del tratamiento realizado, sin sustituir evaluación especializada." },
      { question: "¿Qué pasa si necesito cancelar o cambiar mi hora?", answer: "Se informa la política vigente de cancelaciones, reprogramaciones, anticipos y tiempos mínimos de aviso." },
      { question: "¿Atienden a niños o grupos?", answer: "Se confirma qué edades atienden, servicios disponibles y condiciones para reservas grupales." },
      { question: "¿Qué medios de pago aceptan?", answer: "Se indican exclusivamente los medios de pago habilitados por el establecimiento." },
      { question: "¿Cómo puedo agendar mi atención?", answer: "Se recopilan nombre, servicio, profesional preferido si aplica, fecha y rango horario; la hora queda confirmada solo cuando la agenda la acepta." }
    ]
  },
  professional_services: {
    id: "professional_services",
    label: "Servicios profesionales",
    description: "Consultores, asesores, estudios y profesionales independientes o empresas de servicios.",
    questions: [
      { question: "¿Qué servicios profesionales ofrecen?", answer: "El agente debe describir las áreas y prestaciones efectivamente ofrecidas, según el catálogo y las credenciales informadas por el profesional." },
      { question: "¿A qué tipo de clientes atienden?", answer: "Se explican los perfiles de clientes, sectores o casos que el profesional ha definido como adecuados para su servicio." },
      { question: "¿Cómo funciona la primera consulta?", answer: "Se informa si existe reunión inicial, evaluación, diagnóstico, duración y costo, únicamente según las condiciones configuradas." },
      { question: "¿Cuánto cuestan sus servicios?", answer: "Los honorarios dependen del alcance, complejidad y modalidad. Se comparte una tarifa vigente o se recopilan antecedentes para cotizar." },
      { question: "¿Cómo solicito una cotización?", answer: "Se recopilan necesidad, objetivo, contexto, alcance esperado, plazo y datos de contacto para que el profesional prepare una propuesta." },
      { question: "¿Qué incluye el servicio contratado?", answer: "Se detallan entregables, sesiones, revisiones, documentación y límites del servicio según la propuesta aceptada." },
      { question: "¿Qué información o documentos debo preparar?", answer: "Los antecedentes requeridos dependen de la especialidad y se solicitan solo cuando sean necesarios para evaluar el caso." },
      { question: "¿Atienden de forma presencial o en línea?", answer: "Se indican las modalidades disponibles, ubicación o plataforma de reunión, según la agenda y cobertura del profesional." },
      { question: "¿En qué zonas o países trabajan?", answer: "Se comunica el alcance geográfico confirmado y cualquier restricción regulatoria o de prestación aplicable." },
      { question: "¿Cuánto demora el proceso?", answer: "Los plazos dependen del alcance, disponibilidad y entrega de antecedentes. Se informa un plazo solo después de validarlo con el responsable." },
      { question: "¿Quién será el profesional a cargo?", answer: "Se identifica al profesional responsable y su función cuando esa asignación esté confirmada." },
      { question: "¿Cómo protegen la confidencialidad de mi información?", answer: "Se explica la política de privacidad y manejo de antecedentes vigente. No se prometen certificaciones o garantías que no estén acreditadas." },
      { question: "¿Puedo contratar un servicio puntual o un plan continuo?", answer: "Se describen las modalidades realmente disponibles, como asesoría puntual, proyecto o acompañamiento recurrente." },
      { question: "¿Cómo se realizan los pagos y la facturación?", answer: "Se informan medios, hitos de pago, anticipos y documentos tributarios según las condiciones administrativas del negocio." },
      { question: "¿Cómo puedo agendar o comenzar a trabajar?", answer: "Se recopilan datos de contacto, servicio requerido y disponibilidad. El inicio queda sujeto a evaluación, aceptación de propuesta y confirmación." }
    ]
  }
};

export const BUSINESS_SECTOR_OPTIONS = Object.values(BUSINESS_TEMPLATES).map(
  ({ id, label, description }) => ({ value: id, label, description }),
);

export function isBusinessSector(value: unknown): value is BusinessSector {
  return typeof value === "string" && value in BUSINESS_TEMPLATES;
}
