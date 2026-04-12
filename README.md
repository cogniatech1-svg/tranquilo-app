# Tranquilo — Finanzas Personales

> "Ajustes pequeños para llegar tranquilo a fin de mes."

Tranquilo es una PWA (Progressive Web App) de finanzas personales diseñada para Latinoamérica. Permite registrar gastos, gestionar bolsillos de presupuesto y visualizar el estado financiero mensual con un sistema de semáforo visual.

---

## Características

- **Semáforo visual**: el hero de la app cambia de color según el estado del mes
  - Verde (tranquilo) → gastos < 85% del presupuesto proporcional
  - Ámbar (ajustado) → 85–115%
  - Rojo (riesgo) → > 115%
- **Bolsillos de presupuesto**: categorías personalizables con presupuesto propio
- **Ingresos**: registro de ingreso mensual fijo + ingresos extra puntuales
- **Histórico**: los meses anteriores se archivan automáticamente al cambiar de mes
- **Insights**: análisis de patrones de gasto, predicciones y comparativos
- **Exportar datos**: JSON y CSV (compatible con Excel)
- **Soporte multi-país**: Colombia, México, Argentina, Chile, España, Perú y más
- **100% offline**: datos guardados en localStorage, sin cuenta ni servidor
- **Instalable**: funciona como app nativa en Android e iOS

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Estilos | Tailwind CSS |
| Fuente | Geist (Vercel) |
| Íconos | Lucide React |
| Almacenamiento | localStorage |
| Deploy | Vercel |
| PWA | Service Worker + Web App Manifest |

---

## Estructura del proyecto

```
tranquilo/
├── app/
│   ├── page.tsx          # Raíz de la app, estado global y lógica principal
│   ├── layout.tsx        # Layout HTML, metadatos PWA y registro del SW
│   └── globals.css       # Estilos globales
├── screens/
│   ├── DashboardScreen   # Pantalla de inicio con hero y resumen
│   ├── TransactionsScreen# Lista de movimientos
│   ├── BudgetScreen      # Gestión de bolsillos y presupuesto
│   ├── InsightsScreen    # Análisis y gráficos
│   ├── ProfileScreen     # Perfil, histórico, exportar y ajustes
│   └── OnboardingScreen  # Primera configuración del usuario
├── components/
│   ├── ui/               # Componentes base (Card, Button, ProgressBar…)
│   ├── AddExpenseSheet   # Modal para agregar/editar gastos
│   └── BottomNavigation  # Barra de navegación inferior
├── lib/
│   ├── config.ts         # Design system, colores, configuración por país
│   ├── types.ts          # Tipos TypeScript compartidos
│   └── utils.ts          # Utilidades (formateo, parsing, fechas)
└── public/
    ├── manifest.json     # Configuración PWA
    ├── sw.js             # Service Worker
    ├── logo-ui.png       # Logo transparente (uso interno en la app)
    └── icons/
        ├── icon-192.png  # Ícono PWA con fondo verde
        └── icon-512.png  # Ícono PWA con fondo verde
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Deploy

El proyecto está conectado a Vercel. Cualquier push a `main` dispara un redeploy automático.

```bash
git add .
git commit -m "descripción del cambio"
git push
```

---

## Datos y privacidad

Tranquilo no tiene backend ni base de datos. Todos los datos se guardan únicamente en el dispositivo del usuario mediante `localStorage`. No se envía ningún dato a servidores externos.
