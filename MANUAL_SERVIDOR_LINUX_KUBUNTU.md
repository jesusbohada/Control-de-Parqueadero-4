# Guía de Instalación y Despliegue en Servidor Central Linux (Kubuntu 18.04 LTS)
## Sistema de Control de Parqueadero POS — WolfZone & Farmanorte
### Servidor: 6 × Intel® Xeon® E5-2603 v3 | 54.9 GiB RAM | Kubuntu 18.04 (Kernel 4.15)

---

## 1. Diagnóstico y Acierto Técnico

Tenías **totalmente la razón al sospechar que los comandos tradicionales de Linux no iban a funcionar todos**.

### ¿Por qué fallarían los comandos comunes en Kubuntu 18.04?
1. **Incompatibilidad de GLIBC en Node.js 20**:
   Kubuntu 18.04 LTS incluye la biblioteca `glibc 2.27`. Sin embargo, las versiones modernas de Node.js (18, 20 y 22) y Vite requieren obligatoriamente `glibc 2.28+`. Si intentaras instalar Node.js 20 de la forma convencional con `apt` o binarios oficiales, el sistema arrojaría inmediatamente el error crítico:
   `node: /lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.28' not found`
2. **Repositorios de PostgreSQL 16**:
   Los repositorios oficiales modernos de PostgreSQL ya descontinuaron los paquetes nativos para Ubuntu 18.04 (Bionic).
3. **Peligro de forzar librerías**:
   Intentar actualizar `glibc` manualmente en Kubuntu 18.04 puede romper el escritorio KDE y el gestor de paquetes `apt`.

---

## 2. La Solución Perfecta y Profesional: Docker & Docker Compose

Tu servidor es una **máquina potente** (6 núcleos Intel Xeon y **55 GB de memoria RAM**). 

Para este servidor, la mejor arquitectura en el mundo de Linux es desplegar el sistema mediante **Contenedores Docker**:
* **Aislamiento Total**: La aplicación corre dentro de un contenedor Debian Bookworm moderno (`glibc 2.36`), mientras que la base de datos corre en `PostgreSQL 16 Alpine`.
* **Cero Conflictos**: No toca ni altera ninguna librería de tu Kubuntu 18.04.
* **Rendimiento Nativo**: Con 55 GB de RAM y procesadores Xeon, el consumo de Docker es despreciable (< 0.1% de CPU y ~400 MB de RAM).
* **Despliegue en 1 Solo Paso**: Hemos preparado el script `desplegar-servidor-linux.sh` que hace todo de forma 100% automática.

---

## 3. Paso a Paso para Desplegar el Servidor

### Paso 1: Copiar el Proyecto al Servidor Kubuntu

Puedes transferir esta carpeta del proyecto (`Control-de-Parqueadero-4-2026-10-13-61ceb`) al servidor Kubuntu usando cualquiera de estos medios:
* **Opción A (Memoria USB / Disco Externo)**: Copia la carpeta y pégala en la carpeta de tu usuario (por ejemplo en `/home/tu_usuario/`).
* **Opción B (Red Local / WinSCP / FileZilla)**: Conéctate por SFTP o SSH a la IP del Kubuntu y sube la carpeta.
* **Opción C (Git Clone)**: Si tienes el repositorio en GitHub/GitLab:
  ```bash
  git clone <URL_DEL_REPOSITORIO>
  ```

---

### Paso 2: Abrir la Terminal de Kubuntu (Konsole)

1. En Kubuntu, abre el menú de aplicaciones y abre **Konsole** (o presiona `Ctrl + Alt + T`).
2. Entra a la carpeta del proyecto:
   ```bash
   cd ~/Control-de-Parqueadero-4-2026-10-13-61ceb
   ```
   *(Asegúrate de estar dentro de la carpeta donde están `Dockerfile`, `docker-compose.yml` y `desplegar-servidor-linux.sh`)*.

---

### Paso 3: Ejecutar el Instalador Automatizado

Ejecuta el script con permisos de superusuario:
```bash
sudo bash desplegar-servidor-linux.sh
```

**¿Qué hará este script automáticamente?**
1. Detecta tu distribución Kubuntu 18.04 y su IP de red local.
2. Instala Docker Engine y Docker Compose compatibles con el Kernel 4.15 de forma segura.
3. Levanta el contenedor de base de datos **PostgreSQL 16**.
4. Carga automáticamente el esquema completo de la base de datos (`database_schema.sql`).
5. Compila y levanta la aplicación **WolfZone POS** en segundo plano con reinicio automático si el servidor se apaga o reinicia.

Al finalizar, la terminal te mostrará el mensaje en verde con la IP y los enlaces de acceso.

---

### Paso 4: Habilitar los Puertos en el Cortafuegos (Firewall)

Para que las cajas y computadores de las taquillas puedan conectarse al servidor sin que Kubuntu bloquee la conexión, ejecuta:
```bash
sudo ufw allow 3000/tcp comment 'Wolfzone POS LAN'
sudo ufw allow 3001/tcp comment 'Wolfzone POS WAN'
sudo ufw allow 9050/tcp comment 'FarmaDesk Signaling Hub'
sudo ufw reload
```

---

## 4. ¿Cómo Acceder al Sistema?

### Desde el propio Servidor Kubuntu:
Abre el navegador (Firefox / Chrome) y entra a:
```
http://localhost:3000
```

### Desde las Taquillas / Cajas (Equipos con Windows en la Red Local):
Abre el navegador web (Google Chrome o Edge) e ingresa la dirección IP de tu servidor Kubuntu:
```
http://IP_DE_TU_SERVIDOR:3000
```
*(Ejemplo: `http://192.168.1.100:3000`)*.

---

## 5. Comandos de Administración en Kubuntu

Siempre desde la carpeta del proyecto (`cd ~/Control-de-Parqueadero-4-2026-10-13-61ceb`):

| Acción | Comando |
| :--- | :--- |
| **Ver registros y actividad en vivo** | `sudo docker compose logs -f` *(o `sudo docker-compose logs -f`)* |
| **Reiniciar el servidor POS** | `sudo docker compose restart` |
| **Detener el servidor POS** | `sudo docker compose down` |
| **Iniciar el servidor POS** | `sudo docker compose up -d` |
| **Ver estado y consumo de memoria** | `sudo docker stats` |
| **Generar un Respaldo Manual de BD** | `sudo docker exec -t wolfzone_postgres pg_dump -U postgres wolfzonepos_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql` |

---

## 6. Persistencia y Seguridad de la Información

* Toda la base de datos se guarda en un volumen seguro e independiente (`postgres_data`). Si detienes o actualizas los contenedores, **ningún dato se pierde**.
* Las carpetas `backups/`, `logs/` y `data/` están mapeadas directamente a la carpeta de tu servidor Kubuntu para que tengas acceso inmediato a los archivos desde el administrador de archivos Dolphin de Kubuntu.
