# Recuperación de Contraseña del Párroco

## Situación: El párroco olvidó su contraseña

El sistema de catequesis tiene un **sistema dual de autenticación** que permite al desarrollador ayudar en caso de que el párroco olvide su contraseña.

## Soluciones Disponibles

### Opción 1: Acceso con Contraseña Maestra del Desarrollador

El desarrollador mantiene acceso independiente con la contraseña configurada en `ADMIN_PASSWORD` del archivo `.env`:

1. **Ubicar el archivo `.env`** en el servidor/NAS donde está instalado el sistema
2. **Verificar la contraseña maestra:**
   ```env
   ADMIN_PASSWORD=admin123  # (cambiar por la contraseña real configurada)
   ```
3. **Acceder al sistema** usando esta contraseña en `/login`
4. **Ir al panel de administración** → Botón "Cambiar Contraseña"
5. **Establecer nueva contraseña** para el párroco

### Opción 2: Reseteo Manual del Archivo de Autenticación

Si no se tiene acceso a la contraseña maestra:

1. **Localizar el archivo:** `data/parish-auth.json`
2. **Eliminar o renombrar** el archivo:
   ```bash
   mv data/parish-auth.json data/parish-auth.json.backup
   ```
3. **Reiniciar la aplicación** (Docker Compose):
   ```bash
   docker-compose restart
   ```
4. **El sistema creará automáticamente** una nueva configuración con:
   - Contraseña por defecto: `parroco123`
   - Estado: `isDefault: true`

### Opción 3: Modificación Directa del Archivo

Para usuarios técnicos:

1. **Editar** `data/parish-auth.json`
2. **Cambiar el campo** `isDefault` a `true`:
   ```json
   {
     "hashedPassword": "...",
     "lastChanged": "...",
     "isDefault": true
   }
   ```
3. **Reiniciar** la aplicación
4. **Usar contraseña por defecto:** `parroco123`

## Contraseña por Defecto

- **Usuario:** Administrador (párroco)
- **Contraseña:** `parroco123`
- **Recomendación:** Cambiar inmediatamente después del acceso

## Prevención

### Para el Párroco:
1. **Anotar la contraseña** en lugar seguro
2. **Usar gestor de contraseñas** (recomendado)
3. **Cambiar periódicamente** la contraseña

### Para el Desarrollador/Administrador:
1. **Documentar la contraseña maestra** `ADMIN_PASSWORD`
2. **Mantener backup** del archivo `parish-auth.json`
3. **Establecer procedimiento** de recuperación con el párroco

## Contacto de Emergencia

En caso de problemas técnicos:
1. **Contactar al desarrollador** del sistema
2. **Proporcionar acceso** al servidor/NAS si es necesario
3. **Coordinar horario** para asistencia remota

## Notas de Seguridad

- ✅ El sistema mantiene **dos niveles de acceso independientes**
- ✅ La contraseña del desarrollador **NO se ve afectada** por cambios del párroco
- ✅ El párroco **NO puede ver** la contraseña maestra del desarrollador
- ⚠️ **Cambiar contraseñas por defecto** inmediatamente
- ⚠️ **No compartir** la contraseña maestra del desarrollador

---

**Fecha de creación:** $(date)
**Versión del sistema:** 1.0
**Última actualización:** $(date)