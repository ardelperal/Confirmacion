# Resumen de Cambios

Se ha realizado una revisión completa de la documentación y la estructura del proyecto y se han realizado los siguientes cambios:

*   **Creación de un nuevo `README.md`:** Se ha creado un nuevo fichero `README.md` que sirve como punto central de la documentación del proyecto. Este fichero incluye información sobre:
    *   El propósito y las características del proyecto.
    *   Las tecnologías utilizadas.
    *   La estructura del proyecto.
    *   El contenido de la catequesis.
    *   Una guía de inicio rápido.
    *   Instrucciones de uso.
    *   Gestión de contenido.
    *   Procedimientos de backup y restauración.
    *   Consideraciones de seguridad.
    *   Detalles técnicos.
    *   Instrucciones de despliegue.
    *   Solución de problemas.

*   **Integración de la documentación existente:** Se ha integrado la información de los siguientes ficheros en el nuevo `README.md`:
    *   `docs/Contexto_Catequesis_A4.md`
    *   `docs/Especificaciones_Tecnicas_Completas.md`
    *   `docs/Plantilla_Sesion_A4.md`
    *   `external/catequesis/plan_personajes_salvacion.md`
    *   `external/catequesis/README.md`
    *   `web/docs/CSP_Configuration.md`
    *   `README_DOCKER.md`
    *   `DESPLIEGUE_NAS.md`
    *   `BACKUP_SISTEMA.md`
    *   `SECURITY-GOTENBERG.md`
    *   `ACTUALIZACIONES_DEPENDENCIAS.md`
    *   `BACKUP_SEGURO.md`
    *   `RECUPERACION_CONTRASEÑA.md`

*   **Eliminación de ficheros redundantes:** Se han eliminado los ficheros mencionados anteriormente para evitar la duplicación de información y mantener el `README.md` como única fuente de verdad.

*   **Reorganización de la estructura de ficheros:** Se han movido los siguientes ficheros a sus directorios correspondientes:
    *   `backup.ps1`, `cleanup-backups.ps1`, `restore.ps1`, `setup-backup-schedule.ps1`, `verify-backup-system.ps1` a la carpeta `scripts`.
    *   `RESUMEN_CAMBIOS.md` a la carpeta `docs`.
    *   `ci-security-workflow.yml` a la carpeta `.github/workflows`.