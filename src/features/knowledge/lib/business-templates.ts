export type BusinessTemplateKey = "digital_services" | "furniture" | "real_estate";

export type StarterKnowledge = {
  category: "product" | "faq" | "policy" | "business";
  title: string;
  content: string;
};

export const businessTemplates: Record<BusinessTemplateKey, { label: string; description: string; entries: StarterKnowledge[] }> = {
  digital_services: {
    label: "Servicios digitales / landing pages",
    description: "Servicios, utilidad de una landing page y consultas de cotización.",
    entries: [
      { category: "faq", title: "¿Qué es una landing page?", content: "Una landing page es una página web diseñada para una acción concreta, como solicitar información, pedir una cotización, registrarse o contactar a un negocio. Presenta una oferta de forma clara y dirige al visitante hacia un siguiente paso." },
      { category: "faq", title: "¿Para qué sirve una landing page?", content: "Sirve para presentar un producto o servicio y facilitar que las personas interesadas realicen una acción: enviar un formulario, escribir por WhatsApp, solicitar una cotización o conocer una oferta." },
      { category: "product", title: "Servicios de landing pages", content: "Ofrecemos diseño y desarrollo de landing pages para emprendedores, empresas y agencias. El alcance, las funcionalidades y los entregables se confirman según las necesidades de cada proyecto." },
      { category: "faq", title: "¿Qué información se necesita para cotizar?", content: "Para preparar una cotización necesitamos conocer el tipo de negocio, el objetivo de la página, las secciones o funcionalidades requeridas y el plazo esperado. El precio y la fecha de entrega deben confirmarse según el alcance del proyecto." },
      { category: "policy", title: "Precios y plazos de desarrollo", content: "Los precios y plazos deben confirmarse con el equipo comercial según el alcance y las funcionalidades solicitadas. No se debe confirmar un importe ni una fecha que no estén publicados expresamente." },
    ],
  },
  furniture: {
    label: "Muebles y decoración",
    description: "Catálogo, consultas de productos, precios y entregas sin inventar condiciones.",
    entries: [
      { category: "product", title: "Catálogo de muebles", content: "Babys Maken ofrece muebles infantiles, incluyendo tablones infantiles, mesitas, sillas y vanitys. La disponibilidad y las características de cada modelo deben confirmarse antes de realizar el pedido." },
      { category: "faq", title: "¿Qué muebles infantiles venden?", content: "Contamos con tablones infantiles, mesitas, sillas y vanitys. Si nos indicas qué producto te interesa, podemos orientarte sobre el modelo y consultar sus detalles." },
      { category: "faq", title: "¿Cómo consultar por un modelo?", content: "Para consultar por un mueble, indica el producto que buscas y, si es posible, comparte una foto o el nombre del modelo. El equipo podrá confirmar características y disponibilidad." },
      { category: "policy", title: "Precios y disponibilidad de muebles", content: "Los precios y la disponibilidad dependen del producto y deben confirmarse con el equipo antes de realizar la compra. No se deben inventar precios, medidas, materiales ni stock." },
      { category: "business", title: "Envíos y entregas", content: "Las zonas de cobertura, los costes de envío y los plazos de entrega deben confirmarse con el equipo de Babys Maken antes de prometer una fecha o un importe." },
    ],
  },
  real_estate: {
    label: "Inmobiliaria / propiedades",
    description: "Servicios de venta y arriendo, captación de propiedades y coordinación de visitas.",
    entries: [
      { category: "product", title: "Servicios inmobiliarios", content: "Ofrecemos orientación a propietarios que desean vender o arrendar una propiedad y a personas que buscan una vivienda. El servicio y sus condiciones se revisan según cada caso." },
      { category: "faq", title: "¿Cómo puedo vender mi propiedad?", content: "Para comenzar, comparte la ubicación, el tipo de propiedad, sus características principales y el precio esperado si ya lo tienes definido. El equipo revisará los antecedentes y te indicará los siguientes pasos." },
      { category: "faq", title: "¿Cómo puedo coordinar una visita?", content: "Para consultar o coordinar una visita, indica la propiedad que te interesa y tus horarios disponibles. La visita queda sujeta a confirmación del equipo y de la disponibilidad de la propiedad." },
      { category: "policy", title: "Honorarios y condiciones inmobiliarias", content: "Los honorarios, requisitos, documentación, garantías y condiciones de venta o arriendo deben ser confirmados por el equipo para cada operación. No se deben prometer resultados ni condiciones no publicadas." },
      { category: "business", title: "Disponibilidad de propiedades", content: "La disponibilidad, los precios y las características de cada propiedad deben verificarse en el inventario actualizado antes de entregar una confirmación al interesado." },
    ],
  },
};

