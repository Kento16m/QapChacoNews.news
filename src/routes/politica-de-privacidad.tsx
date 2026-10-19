import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/politica-de-privacidad")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidad"
      lastUpdated="19 de octubre de 2026"
      intro={
        <>
          <p>
            En QAP ChacoNews valoramos la privacidad de las personas que visitan, leen o interactúan con el sitio.
            Esta política describe la información que podemos recopilar, cómo la utilizamos, con quién la compartimos,
            qué medidas tomamos para protegerla y cuáles son los derechos que le asisten en relación con sus datos.
          </p>
        </>
      }
      sections={[
        {
          title: "Información que recopilamos",
          content: (
            <>
              <p>Podemos recopilar información de distintas formas, incluyendo:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>datos de contacto cuando se registra o se comunica con el equipo del sitio;</li>
                <li>datos técnicos del dispositivo y del navegador;</li>
                <li>dirección IP y metadatos de conexión para seguridad y analítica;</li>
                <li>datos de uso del sitio, páginas visitadas, interacciones y tiempo de lectura;</li>
                <li>información necesaria para gestionar cuentas, perfiles y preferencias.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Finalidad del tratamiento",
          content: (
            <>
              <p>Usamos la información para:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>mantener el sitio, sus servicios y su seguridad;</li>
                <li>personalizar la experiencia y recordar preferencias;</li>
                <li>mejorar contenidos, navegación y arquitectura de la información;</li>
                <li>responder consultas, comentarios o solicitudes;</li>
                <li>cumplir requisitos legales, regulatorios o de seguridad.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Base legal",
          content: (
            <>
              <p>
                Tratamos los datos con fundamento en la necesidad de prestar el servicio, la legítima atención a
                intereses del responsable del tratamiento, la ejecución de obligaciones legales y, en su caso, el
                consentimiento informado cuando la normativa así lo exija.
              </p>
            </>
          ),
        },
        {
          title: "Compartición de información",
          content: (
            <>
              <p>
                QAP ChacoNews no vende sus datos personales a terceros. La información puede compartirse con servicios
                de hosting, analítica, seguridad, infraestructura tecnológica y proveedores que cooperan con la operación
                del sitio, siempre bajo medidas contractuales para proteger la confidencialidad y seguridad de la
                información.
              </p>
              <p>
                También puede revelarse información cuando lo exija la ley, una autoridad competente, un procedimiento
                judicial o una obligación contractual.
              </p>
            </>
          ),
        },
        {
          title: "Seguridad",
          content: (
            <>
              <p>
                Adoptamos medidas razonables de seguridad para proteger la información frente a accesos no autorizados,
                pérdida, uso indebido o alteración. Sin embargo, ningún sistema es totalmente invulnerable. Por ello, el
                usuario reconoce que el uso del sitio implica aceptar este riesgo inherente a cualquier servicio digital.
              </p>
            </>
          ),
        },
        {
          title: "Derechos del usuario",
          content: (
            <>
              <p>En relación con sus datos personales, el usuario puede, según el marco legal aplicable:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>solicitar acceso a la información que tratamos;</li>
                <li>solicitar corrección de datos inexactos;</li>
                <li>pedir la eliminación de datos cuando proceda;</li>
                <li>oponerse o limitar el tratamiento en los supuestos previstos por la ley;</li>
                <li>solicitar la portabilidad de sus datos y ejercer derechos complementarios.</li>
              </ul>
              <p>
                Para ejercer estos derechos, puede comunicarse con el equipo editorial del sitio a través de los canales
                de contacto visibles en la web o a la dirección de correo que figure en la sección de contacto.
              </p>
            </>
          ),
        },
        {
          title: "Cookies y analítica",
          content: (
            <>
              <p>
                El sitio utiliza cookies y tecnologías similares para funciones esenciales, rendimiento y analítica. La
                información detallada sobre estas tecnologías está disponible en la Política de Cookies.
              </p>
            </>
          ),
        },
        {
          title: "Modificaciones",
          content: (
            <>
              <p>
                Esta política puede actualizarse para reflejar cambios operativos, regulatorios o de infraestructura. La
                fecha de última actualización se mantiene visible para que el usuario pueda conocer la versión vigente.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
