# 🧘 ZenAdmin — Panel de Gestión de Masajes

Dashboard administrativo para empresas de masajes. Foco principal en registro de masajes realizados y control de cobros.

## Requisitos

- **Node.js** 18 o superior
- **npm** (viene con Node.js)

## Instalación y ejecución

```bash
# 1. Entrar a la carpeta del proyecto
cd zenadmin

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

Se abrirá automáticamente en **http://localhost:3000**

## Usuarios demo

| Usuario     | Contraseña | Rol           |
|-------------|------------|---------------|
| admin       | admin123   | Administrador |
| recepcion   | recep123   | Recepción     |
| caja        | caja123    | Caja / Cobros |
| supervisor  | super123   | Supervisor    |

## Módulos

- **Dashboard** — KPIs, gráficos de evolución, distribución por tipo, medios de pago, alertas
- **Masajes Realizados** — CRUD completo con filtros, detalle, estados de cobro
- **Cobros** — Registro de pagos totales/parciales, detección de pendientes
- **Clientes** — Gestión con historial y estadísticas por cliente
- **Reportes** — Por tipo, profesional, método de pago, horas pico, clientes frecuentes
- **Agenda** — Módulo básico de turnos
- **Configuración** — Permisos por rol, datos del sistema

## Tecnología

- React 18 + Vite
- Recharts (gráficos)
- Lodash (utilidades)
- localStorage (persistencia)

## Build para producción

```bash
npm run build
npm run preview
```

Los archivos compilados quedan en la carpeta `dist/`.
