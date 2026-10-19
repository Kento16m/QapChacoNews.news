import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/cookies")({
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPage
      title="Política de Cookies"
      lastUpdated="19 de octubre de 2026"
      intro={
        <>
          <p>
            En QAP ChacoNews utilizamos cookies y tecnologías similares para mejorar la experiencia de lectura,
            personalizar el contenido, proteger la seguridad del sitio, analizar el uso del servicio y cumplir con
            requisitos legales y operativos. Esta política explica qué son, cómo se usan, qué tipos existen y qué
            opciones tiene para gestionarlas.
          </p>
        </>
      }
      sections={[
        {
          title: "Qué son las cookies",
          content: (
            <>
              <p>
                Las cookies son pequeños archivos de texto que se almacenan en su navegador o dispositivo cuando
                visita una web. Permiten reconocer al usuario, recordar preferencias, facilitar la navegación y medir
                el rendimiento del sitio.
              </p>
              <p>
                También pueden utilizarse herramientas de analítica para conocer qué páginas son más consultadas,
                desde qué dispositivos accede el visitante y cómo evoluciona el tráfico. En ningún caso las cookies
                implican acceso directo a su dispositivo más allá de la información técnica necesaria para brindar la
                experiencia funcional del portal.
              </p>
            </>
          ),
        },
        {
          title: "Tipos de cookies que usamos",
          content: (
            <>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Cookies estrictamente necesarias:</strong> permiten la navegación básica del sitio,
                  mantener sesiones de uso, recordar el idioma o evitar riesgos de seguridad.
                </li>
                <li>
                  <strong>Cookies de rendimiento:</strong> ayudan a medir la eficacia del contenido, la velocidad del
                  sitio y el comportamiento general de lectura.
                </li>
                <li>
                  <strong>Cookies funcionales:</strong> recuerdan preferencias como temas visuales, filtros o ajustes
                  de lectura para una experiencia más cómoda.
                </li>
                <li>
                  <strong>Cookies analíticas:</strong> recopilan información agregada para mejorar la estructura del
                  sitio, las decisiones editoriales y la distribución de contenidos.
                </li>
                <li>
                  <strong>Cookies de terceros:</strong> pueden incluir integraciones de redes sociales, servicios de
                  métricas, contenido embebido o analítica externa cuando así lo requiera el ecosistema del sitio.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Finalidad del uso",
          content: (
            <>
              <p>Utilizamos cookies para:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>mantener el sitio estable y funcional;</li>
                <li>recordar ajustes de navegación y preferencias;</li>
                <li>analizar el uso del portal para mejorar contenidos y arquitectura;</li>
                <li>medir agregados de tráfico, visitas y engagement;</li>
                <li>prevenir usos abusivos, fraudes o accesos no autorizados;</li>
                <li>facilitar la lectura y la interacción con la interfaz.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Cookie de la sesión y autenticación",
          content: (
            <>
              <p>
                Si accede a funciones con cuenta o gestión de perfil, pueden usarse cookies relacionadas con la sesión,
                su identidad y la seguridad del acceso. Estas cookies permiten mantener al usuario autenticado durante
                la navegación y asegurar que las acciones personales se apliquen a la cuenta correcta.
              </p>
              <p>
                En todo caso, QAP ChacoNews no utiliza cookies para vender datos personales ni para perfiles de
                publicidad invasiva fuera del contexto del servicio informado.
              </p>
            </>
          ),
        },
        {
          title: "Cómo gestionar o rechazar cookies",
          content: (
            <>
              <p>
                Puede configurar su navegador para aceptar, rechazar o eliminar cookies. La mayoría de los navegadores
                permiten gestionar estas opciones desde la sección de configuración de privacidad o seguridad.
              </p>
              <p>
                Si desactiva cookies esenciales, es posible que algunas funciones del sitio no funcionen de forma
                óptima. Si bloquea cookies analíticas o funcionales, la experiencia puede cambiar, pero no se verá
                necesariamente afectada la lectura básica del contenido.
              </p>
              <p>
                También puede eliminar cookies ya almacenadas desde la configuración del navegador. Tenga en cuenta
                que la desactivación parcial o total puede requerir iniciar sesión nuevamente o restablecer algunos
                ajustes de visualización.
              </p>
            </>
          ),
        },
        {
          title: "Periodo de conservación",
          content: (
            <>
              <p>
                Las cookies se conservan durante el tiempo necesario para cumplir la finalidad para la que fueron
                colocadas, o durante el período legalmente permitido. Algunas expiran automáticamente cuando cierra el
                navegador o al cumplirse un tiempo determinado; otras pueden permanecer durante más tiempo para mantener
                preferencias de usuario.
              </p>
            </>
          ),
        },
        {
          title: "Cambios en la política",
          content: (
            <>
              <p>
                QAP ChacoNews puede actualizar esta política en función de cambios regulatorios, mejoras funcionales o
                nuevas integraciones de servicios. Cuando se produzcan cambios relevantes, se actualizará la fecha de
                modificación para que el usuario pueda consultar la versión vigente.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
