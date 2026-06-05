# Tareas Pendientes: Migración y Arreglo de Cuenta R2 (Cuenta 2)

**Estado:** Pendiente de ejecución
**Prioridad:** Alta (Debe resolverse antes de que la Cuenta 1 llegue al 99% - 9.9GB)

## Contexto del Problema
La aplicación está configurada con dos cuentas de Cloudflare R2 para sumar 20GB de almacenamiento gratuito. Actualmente estamos usando la Cuenta 1 (5.24 GB usados).
Al intentar revisar la **Cuenta 2** de respaldo, el sistema arrojó un error de credenciales (`Signature Mismatch`). Si la Cuenta 1 se llena, el sistema fallará al intentar guardar en la Cuenta 2.

Además, la Cuenta 2 tiene una arquitectura de acceso mucho mejor (a través de un Cloudflare Worker en `jubiladocantv.workers.dev`) en lugar de acceso directo, lo que previene bloqueos por inactividad.

## Pasos para Retomar y Solucionar (Cuando estés listo)

Para indicarle a la IA que retome este trabajo, puedes usar el siguiente prompt:
> *"Revisa el archivo TAREAS_PENDIENTES.md y vamos a resolver el problema de los tokens de la Cuenta 2 de Cloudflare."*

### Lista de Tareas a Ejecutar:

1. **Generar nuevos Tokens en Cloudflare (Acción Manual del Usuario):**
   - Entrar al dashboard de Cloudflare.
   - Ir a "R2" -> "Manage R2 API Tokens".
   - Crear un nuevo token con permisos de **Admin Read & Write**.
   - Copiar el `Access Key ID` y el `Secret Access Key`.

2. **Actualizar Variables de Entorno (Con ayuda de la IA):**
   - Pegar las nuevas credenciales en el archivo `.env.local` bajo las variables:
     - `CLOUDFLARE_R2_ACCESS_KEY_ID_2`
     - `CLOUDFLARE_R2_SECRET_ACCESS_KEY_2`

3. **Verificación de Conexión:**
   - La IA ejecutará un script de prueba (similar a `check_r2.mjs`) forzando la conexión a la Cuenta 2 para confirmar que el error "Signature Mismatch" haya desaparecido y devuelva `0.00 GB` correctamente.

4. **[Opcional pero recomendado] Migrar la Cuenta 1 al sistema Worker:**
   - Para evitar que la Cuenta 1 sufra bloqueos de 7 días, se debería configurar un Worker idéntico al de la Cuenta 2 para entregar la música de la Cuenta 1, y actualizar `NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL` en el entorno.
