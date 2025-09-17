# Sistema de Catequesis para Confirmación

[![CI & Security](https://github.com/${{github.repository}}/actions/workflows/ci-security.yml/badge.svg)](../../actions/workflows/ci-security.yml)

Sistema web para gestión de sesiones de catequesis dirigidas a jóvenes de 12-13 años en preparación para el sacramento de la Confirmación.

## ✨ Características

*   **Gestión de Sesiones:** Crear, editar, publicar y retirar sesiones de catequesis.
*   **Modo de Visibilidad:** Controla qué sesiones son visibles para los usuarios (solo publicadas o también editadas).
*   **Modo de Solo Lectura:** Deshabilita la edición y administración de sesiones.
*   **Generación de PDF y DOCX:** Descarga sesiones en formato PDF y DOCX.
*   **Recursos de Catequesis:** Acceso a fichas de personajes bíblicos y otros recursos.
*   **Autenticación Segura:** Acceso de administrador protegido por contraseña.
*   **Sistema de Backup y Restauración:** Scripts para crear y restaurar backups de los datos.
*   **Despliegue con Docker:** Fácil de desplegar en cualquier sistema con Docker y Docker Compose.

## 🚀 Tecnologías

*   **Frontend:** Next.js, React, Tailwind CSS
*   **Backend:** Next.js (API Routes), Node.js
*   **Base de Datos:** Sistema de archivos (Markdown para sesiones, YAML para módulos)
*   **Generación de PDF:** [Gotenberg](https://gotenberg.dev/)
*   **Generación de DOCX:** [docx](https://docx.js.org/)
*   **Contenerización:** Docker, Docker Compose

## 📁 Estructura del Proyecto

```
Confirmacion/
├── .env                   # Variables de entorno (crear a partir de web/.env.example)
├── data/                  # Datos de la aplicación (sesiones, logs, etc.)
│   ├── content/           # Contenido de las sesiones (.md) y módulos (.yml)
│   ├── auth/              # Ficheros de autenticación
│   └── logs/              # Logs de la aplicación
├── docker-compose.yml     # Orquestación de los servicios Docker
├── external/              # Submódulos Git
│   └── catequesis/        # Contenido de recursos de catequesis
├── scripts/               # Scripts de utilidad (PowerShell y Node.js)
├── web/                   # Código fuente de la aplicación Next.js
└── README.md              # Este archivo
```

## 📝 Contenido

El contenido de la catequesis se estructura en módulos y sesiones. Cada sesión es un fichero Markdown que sigue una plantilla estándar, con secciones para el objetivo, materiales, esquema de la sesión, evaluación y notas para el catequista. Para más detalles, consulta `docs/Plantilla_Sesion_A4.md`.

Además, el proyecto incluye un conjunto de fichas de personajes bíblicos que se gestionan como un [submódulo Git](https://git-scm.com/book/en/v2/Git-Tools-Submodules) en `external/catequesis`. Estas fichas están disponibles en la aplicación web y se pueden sincronizar con el comando `npm run sync:catequesis`.

## 🏁 Primeros Pasos

### Prerrequisitos

*   [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/)
*   [Git](https://git-scm.com/downloads/)
*   [Node.js](https://nodejs.org/en/) y [npm](https://www.npmjs.com/) (para desarrollo local y scripts)

### Instalación

1.  **Clonar el repositorio (incluyendo submódulos):**
    ```bash
    git clone --recurse-submodules <URL_DEL_REPOSITORIO>
    cd Confirmacion
    ```

2.  **Configurar variables de entorno:**
    Crea un fichero `.env` en la raíz del proyecto a partir de `web/.env.example` y ajústalo a tus necesidades.
    ```bash
    cp web/.env.example .env
    ```
    Asegúrate de cambiar `ADMIN_PASSWORD` y `JWT_SECRET` por valores seguros.

3.  **Sincronizar recursos de catequesis:**
    Este comando copia el contenido del submódulo `external/catequesis` al directorio `web/public/recursos/catequesis` para que esté disponible en la aplicación web.
    ```bash
    npm install
    npm run sync:catequesis
    ```

### Ejecutar la Aplicación con Docker

```bash
docker-compose up -d
```

La aplicación estará disponible en `http://localhost:3001`.

## 🔧 Uso

### Desarrollo Local

Para trabajar en la aplicación en un entorno de desarrollo local:

1.  **Instalar dependencias:**
    ```bash
    cd web
    npm install
    ```

2.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

La aplicación estará disponible en `http://localhost:3000`.

### Administración

*   **Login:** Accede a `/login` para iniciar sesión como administrador.
*   **Dashboard:** Una vez autenticado, serás redirigido a `/admin`, donde podrás gestionar las sesiones.

### Scripts Útiles

*   `npm run sync:catequesis`: Sincroniza los recursos de catequesis.
*   `npm run test`: Ejecuta los tests unitarios y de integración.
*   `npm run test:e2e`: Ejecuta los tests end-to-end con Playwright.
*   `npm run hash:admin`: Genera un hash de la contraseña de administrador.

## 📦 Gestión de Contenido

El contenido de las sesiones se gestiona a través de ficheros Markdown en el directorio `data/content/sessions`. La estructura de los módulos se define en `data/content/modules.yml`.

Los recursos de catequesis (fichas de personajes, etc.) se gestionan en un repositorio Git separado y se incluyen como un [submódulo Git](https://git-scm.com/book/en/v2/Git-Tools-Submodules) en `external/catequesis`. Para actualizar estos recursos, ejecuta `npm run sync:catequesis`.

## 🛡️ Backup y Restauración

El proyecto incluye scripts de PowerShell para realizar backups y restaurar los datos de la aplicación. Los scripts se encuentran en el directorio `scripts`.

*   **Crear un backup:**
    ```powershell
    # Backup básico en carpeta ./backups/
    .\scripts\backup.ps1

    # Backup comprimido (recomendado para envío)
    .\scripts\backup.ps1 -Compress
    ```

*   **Restaurar desde un backup:**
    ```powershell
    # Desde directorio
    .\scripts\restore.ps1 -BackupPath "./backups/catequesis_backup_20241214_143022"

    # Desde archivo ZIP
    .\scripts\restore.ps1 -BackupPath "./backups/backup.zip"
    ```

*   **Programar backups automáticos:**
    Puedes programar backups automáticos utilizando Tareas Programadas en Windows o Cron en Linux/NAS.

    **Windows (Tarea Programada):**
    ```powershell
    schtasks /create /tn "Backup Catequesis" /tr "powershell.exe -ExecutionPolicy Bypass -File C:\Proyectos\Confirmacion\scripts\backup.ps1 -Compress" /sc daily /st 02:00
    ```

    **Linux/NAS (Cron):**
    ```bash
    0 2 * * * cd /path/to/catequesis && pwsh ./scripts/backup.ps1 -Compress
    ```

Para más detalles, consulta la documentación en `BACKUP_SISTEMA.md` y `BACKUP_SEGURO.md`.

## 🔒 Seguridad

*   **Redes Docker:** El servicio `gotenberg` se ejecuta en una red interna sin acceso desde el exterior para minimizar la superficie de ataque.
*   **Variables de Entorno:** No incluyas secretos en el código fuente. Utiliza el fichero `.env` para gestionar las variables de entorno.
*   **CI/CD:** El workflow de integración continua incluye pasos para análisis de seguridad.
*   **Content Security Policy (CSP):** La aplicación implementa una CSP restrictiva para prevenir ataques XSS. Para más detalles, consulta `web/docs/CSP_Configuration.md`.

Para más información sobre la configuración de seguridad, consulta `SECURITY-GOTENBERG.md` y `ci-security-workflow.yml`.

## 🛠️ Detalles Técnicos

La aplicación está construida con Next.js y utiliza el App Router. El contenido se carga desde ficheros Markdown y se renderiza en el servidor. La exportación a PDF se realiza con Playwright y Gotenberg, mientras que la exportación a DOCX utiliza la librería `docx`.

Para una descripción técnica más detallada, consulta `docs/Especificaciones_Tecnicas_Completas.md`.

## 🚀 Despliegue

El método de despliegue recomendado es a través de Docker Compose. Asegúrate de que el entorno de producción esté correctamente configurado y de que los puertos necesarios estén disponibles.

Para más detalles sobre el despliegue en un NAS, consulta `DESPLIEGUE_NAS.md`.

## ❓ Solución de Problemas

El `README.md` original contiene una sección detallada de solución de problemas. Si encuentras algún problema, por favor, consúltala.
