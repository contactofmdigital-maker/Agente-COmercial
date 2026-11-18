export type BusinessSector = "digital_services" | "furniture" | "real_estate";

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
  }
};

export const BUSINESS_SECTOR_OPTIONS = Object.values(BUSINESS_TEMPLATES).map(
  ({ id, label, description }) => ({ value: id, label, description }),
);

export function isBusinessSector(value: unknown): value is BusinessSector {
  return typeof value === "string" && value in BUSINESS_TEMPLATES;
}
