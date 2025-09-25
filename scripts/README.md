# Scripts de Exportación - Sistema de Confirmación

## export-all-sessions-pdf.ps1

Script de PowerShell para exportar todas las sesiones de confirmación a archivos PDF.

### Características

- **Autenticación automática**: Se conecta al sistema usando credenciales de administrador
- **Descarga masiva**: Obtiene PDFs de todas las sesiones disponibles
- **Organización automática**: Crea una carpeta con todos los PDFs organizados
- **Logging completo**: Registra todas las operaciones en un archivo de log
- **Manejo de errores**: Continúa procesando aunque algunas sesiones fallen
- **Barra de progreso**: Muestra el avance de la descarga en tiempo real

### Uso

#### Uso básico (con valores por defecto):
```powershell
.\export-all-sessions-pdf.ps1
```

#### Uso con parámetros personalizados:
```powershell
.\export-all-sessions-pdf.ps1 -ServerUrl "http://localhost:3000" -OutputDir ".\mis-pdfs" -Username "admin" -Password "MiPassword"
```

### Parámetros

| Parámetro | Descripción | Valor por defecto |
|-----------|-------------|-------------------|
| `ServerUrl` | URL del servidor de la aplicación | `http://localhost:3000` |
| `OutputDir` | Directorio donde guardar los PDFs | `.\pdfs-sesiones` |
| `Username` | Usuario administrador | `admin` |
| `Password` | Contraseña del administrador | `Arm1833a` |

### Requisitos

1. **Servidor en funcionamiento**: El servidor de desarrollo debe estar ejecutándose
2. **PowerShell 5.1+**: Compatible con PowerShell Core y Windows PowerShell
3. **Credenciales válidas**: Usuario administrador configurado
4. **Conexión de red**: Acceso al servidor local o remoto

### Archivos generados

- **PDFs**: Se guardan en el directorio especificado con formato `CODIGO_TITULO.pdf`
- **Log**: Se crea `export-sessions.log` con el registro detallado de operaciones

### Ejemplo de salida

```
[2024-01-15 10:30:15] [INFO] === INICIO DE EXPORTACIÓN DE SESIONES A PDF ===
[2024-01-15 10:30:15] [INFO] Servidor: http://localhost:3000
[2024-01-15 10:30:15] [INFO] Directorio de salida: .\pdfs-sesiones
[2024-01-15 10:30:15] [INFO] Directorio creado: .\pdfs-sesiones
[2024-01-15 10:30:16] [INFO] Iniciando autenticación...
[2024-01-15 10:30:16] [INFO] Autenticación exitosa
[2024-01-15 10:30:16] [INFO] Obteniendo lista de sesiones...
[2024-01-15 10:30:17] [INFO] Se encontraron 24 sesiones
[2024-01-15 10:30:17] [INFO] Iniciando descarga de 24 sesiones...
[2024-01-15 10:30:18] [INFO] Descargando PDF para sesión F1...
[2024-01-15 10:30:19] [INFO] PDF descargado exitosamente: .\pdfs-sesiones\F1_Introduccion_a_la_Fe.pdf (245760 bytes)
...
[2024-01-15 10:32:45] [INFO] === RESUMEN DE EXPORTACIÓN ===
[2024-01-15 10:32:45] [INFO] Total de sesiones: 24
[2024-01-15 10:32:45] [INFO] Exitosas: 24
[2024-01-15 10:32:45] [INFO] Con errores: 0
[2024-01-15 10:32:45] [INFO] ¡Exportación completada exitosamente!
```

### Solución de problemas

#### Error de autenticación
- Verificar que el servidor esté ejecutándose
- Comprobar las credenciales de administrador
- Revisar la URL del servidor

#### Error de conexión
- Verificar que el puerto 3000 esté disponible
- Comprobar firewall y configuración de red
- Asegurar que el servidor Next.js esté iniciado

#### Errores de descarga
- Revisar el archivo de log para detalles específicos
- Verificar permisos de escritura en el directorio de destino
- Comprobar espacio disponible en disco

### Notas técnicas

- El script incluye una pausa de 500ms entre descargas para no sobrecargar el servidor
- Los nombres de archivo se sanitizan automáticamente para evitar caracteres problemáticos
- Se mantiene un log detallado de todas las operaciones para auditoría
- Compatible con ejecución desde cualquier directorio