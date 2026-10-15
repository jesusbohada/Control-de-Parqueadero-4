# Sistema de Control de Parqueadero POS (WolfZone POS)

Sistema integral de gestión de estacionamientos con control de entradas, salidas, liquidación de tarifas por minutos/horas/días, mapa interactivo de plazas, escáner de códigos de barras / QR, tickets térmicos, reportes financieros y sincronización multicaja/sucursal.

---

## 🚀 Requisitos Previos

- **Node.js**: Versión 18.x o 20.x LTS o superior ([Descargar Node.js](https://nodejs.org/))
- **NPM**: Incluido automáticamente con Node.js
- *(Opcional)* **PostgreSQL**: Si deseas persistencia en base de datos relacional local (puerto 5432). Si no está disponible, el sistema opera automáticamente con persistencia en IndexedDB local del navegador y archivos JSON de contingencia.

---

## 💻 Instalación Rápida en tu Equipo (Windows)

Si estás en Windows, puedes usar los scripts automatizados incluidos:

1. **Instalación Inicial Automatizada:**
   - Haz doble clic en `INSTALAR_SISTEMA_NUEVO.bat`
   - El script verificará Node.js, instalará todas las dependencias (`npm install`) y preparará los archivos de configuración.

2. **Iniciar el Servidor y la Aplicación:**
   - Haz doble clic en `INICIAR_PARQUEADERO.bat`
   - Se abrirá automáticamente la terminal en el puerto `3000` e iniciará la aplicación en tu navegador web en:
     👉 **http://localhost:3000** (o la ruta `/wolfzonepos`)

3. **Actualización Automática:**
   - Para aplicar cambios o actualizar paquetes en el futuro, ejecuta `ACTUALIZAR_SISTEMA.bat`.

---

## 🛠️ Instalación Manual por Terminal (Windows / macOS / Linux)

1. **Clonar o descomprimir el proyecto** en tu directorio preferido:
   ```bash
   cd ruta-de-tu-carpeta
   ```

2. **Instalar dependencias de Node.js:**
   ```bash
   npm install
   ```

3. **Iniciar en Modo de Desarrollo:**
   ```bash
   npm run dev
   ```
   *El servidor full-stack (Express + Vite) iniciará en `http://localhost:3000`.*

4. **Compilar y Ejecutar en Modo Producción:**
   ```bash
   npm run build
   npm start
   ```

---

## 📂 Archivos y Scripts Ejecutables Disponibles

| Archivo | Función |
| :--- | :--- |
| `INICIAR_PARQUEADERO.bat` | Inicia el servidor Node/Express y abre el sistema en el navegador. |
| `INSTALAR_SISTEMA_NUEVO.bat` | Instalador guiado para equipos nuevos. |
| `ACTUALIZAR_SISTEMA.bat` | Descarga/actualiza dependencias y limpia caché. |
| `CONFIGURAR_SERVIDOR_CENTRAL_RED.bat` | Configura IP y conectividad de red local (LAN) para múltiples cajas. |
| `CREAR_BASE_DATOS_POSTGRES.bat` | Inicializa y migra las tablas de base de datos SQL local. |
| `server.ts` | Backend Express con WebSockets, sincronización y endpoints POS. |
| `package.json` | Lista completa de dependencias de frontend y backend actualizadas. |

---

## 🔑 Rutas y Acceso

- **Punto de Venta / Operaciones:** `http://localhost:3000`
- **Ruta de Acceso Protegido:** `http://localhost:3000/wolfzonepos`
- **Credenciales Predeterminadas de Operador:**
  - *Administrador:* `admin` / PIN: `1234`
  - *Cajero:* `cajero1` / PIN: `1234`
