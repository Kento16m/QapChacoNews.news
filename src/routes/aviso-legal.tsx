import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/aviso-legal")({
  component: LegalNoticePage,
});

function LegalNoticePage() {
  return (
    <LegalPage
      title="Aviso Legal"
      lastUpdated="19 de octubre de 2026"
      intro={
        <>
          <p>
            Este Aviso Legal informa sobre la titularidad, la responsabilidad editorial, la normativa aplicable y las
            condiciones generales bajo las cuales se ofrece el servicio de QAP ChacoNews. El acceso al recurso digital
            implica el conocimiento y la aceptación de estas disposiciones.
          </p>
        </>
      }
      sections={[
        {
          title: "Titularidad",
          content: (
            <>
              <p>
                QAP ChacoNews es un medio digital de información, análisis y cobertura periodística con enfoque regional.
                La titularidad y la gestión del sitio corresponden al responsable editorial del proyecto, quien asume la
                dirección y supervisión del servicio informativo.
              </p>
            </>
          ),
        },
        {
          title: "Responsabilidad editorial",
          content: (
            <>
              <p>
                El contenido publicado responde a criterios editoriales, de verificación y actualización de la información.
                QAP ChacoNews se compromete a ejercer una labor responsable y a corregir errores o aclaraciones cuando se
                detecte información imprecisa, siempre que sea razonablemente posible.
              </p>
              <p>
                Sin embargo, la publicación de noticias, reportajes, análisis y contenidos de actualidad implica que la
                información pueda evolucionar con nuevos datos, actualizaciones o cambios contextuales.
              </p>
            </>
          ),
        },
        {
          title: "Responsabilidad por terceros",
          content: (
            <>
              <p>
                QAP ChacoNews puede incorporar contenidos o servicios de terceros, ya sea por integración de redes, citas,
                referencias, multimedia, contenido embebido o enlaces. El sitio no garantiza ni comparte necesariamente la
                responsabilidad editorial de esos terceros, salvo que exista una relación directa de gestión o producción.
              </p>
            </>
          ),
        },
        {
          title: "Seguridad y uso del servicio",
          content: (
            <>
              <p>
                El sitio se ofrece con la finalidad de divulgar información de interés general y facilitar el acceso a
                contenidos de calidad. El usuario debe utilizar la plataforma de forma razonable, respetuosa y conforme a
                la ley. QAP ChacoNews no garantiza la continuidad infinita del servicio ni la ausencia total de errores,
                pero sí busca mantener altos estándares de estabilidad y seguridad.
              </p>
            </>
          ),
        },
        {
          title: "Protección de la propiedad intelectual",
          content: (
            <>
              <p>
                Los contenidos, marcas, diseños, código, textos, gráficos y elementos visuales del sitio están protegidos
                por normas de propiedad intelectual. Su reproducción, distribución o uso comercial sin autorización puede
                ser ilegal y estar sujeto a las sanciones previstas por la normativa aplicable.
              </p>
            </>
          ),
        },
        {
          title: "Comunicaciones y contacto",
          content: (
            <>
              <p>
                El sitio puede ofrecer canales de contacto para consultas, sugerencias, errores, dudas sobre contenido o
                requerimientos legales. La respuesta a esos mensajes queda sujeta a la capacidad operativa del equipo y a
                la disponibilidad temporal del servicio.
              </p>
            </>
          ),
        },
        {
          title: "Ley aplicable",
          content: (
            <>
              <p>
                Este aviso legal se rige por la legislación paraguaya y, en lo que corresponda, por normas de protección
                de la información, propiedad intelectual, servicios digitales y prácticas comerciales. Cualquier cuestión
                que surja de su aplicación se resolverá en los tribunales competentes de la República del Paraguay.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
