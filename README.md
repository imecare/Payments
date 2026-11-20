# React + TypeScript + Vite

## Payments: contado y reporte de deudas

- En **Ventas > Nueva venta**, elegir la pestana **A credito / De contado**. Contado exige
  comisionista y metodo de cobro (efectivo, tarjeta o transferencia).
- Sin cliente seleccionado, el backend crea/reutiliza un cliente interno
  **Publico en general por empresa**, sin telefono, RFC ni vendedor fijo.
- El cliente, la venta y el cobro se guardan en una sola transaccion. Contado
  queda liquidado, con saldo cero y comision pendiente. Los reintentos conservan
  la clave de registro y no duplican la venta ni el cobro.
- El tipo no cambia al editar. En contado tampoco se modifican total, fecha
  ni movimientos del cobro; las ventas a credito conservan su flujo de abonos.
- En **Deudas > Descargar Excel (todas)** se descargan todas las deudas activas
  de la empresa (no los filtros de pantalla). Incluye tres hojas:
  resumen por cliente, compras con saldo pendiente y abonos de esas compras.
  El ultimo abono y su fecha consideran solo compras activas; si no existen
  abonos, las celdas quedan vacias. El resumen usa el vendedor del cliente y
  el detalle muestra el vendedor asignado a cada compra.
- La descarga verifica el tipo de archivo y su firma ZIP antes de guardarlo
  como `.xlsx`; una respuesta de texto, HTML o JSON muestra un error.

### Despliegue

Antes de publicar backend y frontend, aplicar la migracion `AddCashSales` al
contexto `PaymentsDbContext` del backend. No se aplica automaticamente:

```powershell
dotnet ef database update --project BusinessCloud.Infrastructure --startup-project BusinessCloud.Api --context PaymentsDbContext
```

Ejecutar desde la carpeta del backend, con la conexion del entorno de destino
configurada. La migracion conserva las ventas existentes como credito y no
crea clientes genericos hasta la primera venta de contado. Su reversion se
bloquea si ya existen ventas de contado o clientes sin vendedor.

Pruebas SQL locales optativas (crean y eliminan exclusivamente bases temporales
`PaymentsCashTests_*` en LocalDB; requieren autorizacion para esa limpieza):

```powershell
$env:PAYMENTS_LOCAL_SQL_TESTS = '1'
dotnet test BusinessCloud.Tests --filter "FullyQualifiedName~Application.Payments|FullyQualifiedName~CashSaleSqlTests"
```

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
