# Refactorización de servidor Express con arquitectura en capas

Trabajo práctico de la materia **TLP IV** — Refactorización de un servidor Express/Mongoose aplicando arquitectura en capas (MVC extendido con servicios y repositorios), principios SOLID y patrones de diseño orientados a objetos.

---

## Tecnologías utilizadas

- **Node.js** con soporte nativo de TypeScript (type stripping)
- **Express** — framework HTTP
- **Mongoose** — ODM para MongoDB
- **MongoDB** (via Docker)
- **dotenv** — variables de entorno
- **TypeScript**

---

## Docker y MongoDB

### ¿Qué es Docker?

Docker es una plataforma de **contenedorización** que permite empaquetar una aplicación junto con todas sus dependencias (librerías, configuraciones, sistema operativo base) en una unidad estandarizada llamada **contenedor**. A diferencia de una máquina virtual tradicional, un contenedor no virtualiza el hardware completo: comparte el kernel del sistema operativo anfitrión y solo aísla el proceso que corre dentro, lo que lo hace extremadamente liviano y portable.

Los beneficios principales en un contexto de desarrollo son:

- **Portabilidad:** el mismo contenedor corre de forma idéntica en cualquier máquina que tenga Docker instalado, eliminando el clásico problema de "en mi máquina funciona".
- **Aislamiento:** el servicio de base de datos corre en su propio entorno, sin interferir con otras instalaciones del sistema.
- **Reproducibilidad:** la configuración del entorno queda declarada en un archivo de texto (`docker-compose.yml`), versionable junto con el código.

### Docker Compose

**Docker Compose** es una herramienta complementaria que permite definir y orquestar múltiples contenedores desde un único archivo YAML. En lugar de ejecutar comandos `docker run` con decenas de flags, se describe el estado deseado de los servicios y Compose se encarga de levantarlos, conectarlos y gestionar su ciclo de vida.

### Implementación en este proyecto

La cátedra proveyó el siguiente `docker-compose.yml` para levantar la base de datos MongoDB sin necesidad de instalarla localmente:

```yaml
services:
  mongodb:
    image: mongo:8
    container_name: empleados-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

Cada clave tiene un propósito concreto:

| Clave                          | Descripción                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `image: mongo:8`               | Utiliza la imagen oficial de MongoDB versión 8 del registro de Docker Hub                                                                     |
| `container_name`               | Nombre fijo para identificar el contenedor en el sistema                                                                                      |
| `restart: unless-stopped`      | El contenedor se reinicia automáticamente si falla, excepto cuando se detiene de forma manual                                                 |
| `ports: "27017:27017"`         | Mapea el puerto 27017 del contenedor al 27017 del host, permitiendo que la aplicación se conecte como si Mongo estuviera instalado localmente |
| `volumes: mongo_data:/data/db` | Persiste los datos de la base en un volumen nombrado; sin esto, los datos se perderían cada vez que el contenedor se detiene                  |

La instalación y configuración de Docker no presentó inconvenientes, ya que el entorno ya se encontraba disponible. Para iniciar la base de datos basta con ejecutar:

```bash
docker compose up -d
```

Y para detenerla:

```bash
docker compose down
```

---

## Arquitectura del proyecto

```
src/
├── config/
│   └── db.ts                  # Conexión a MongoDB
├── controllers/
│   └── employee.controller.ts # Traducción entre HTTP y servicios
├── errors/
│   ├── app-error.ts            # Clase base de errores personalizados
│   ├── http-errors.ts         # Subclases por tipo de error HTTP
│   └── error-handler.ts       # Middleware centralizado de errores
├── interfaces/
│   └── employee.dto.ts        # DTOs: formas de datos de entrada y entidad
├── models/
│   └── employee.model.ts      # Esquema Mongoose / entidad de dominio
├── repository/
│   └── employee.repository.ts # Acceso a la base de datos
├── routes/
│   └── employee.routes.ts     # Mapeo de URLs a métodos del controller
├── services/
│   └── employee.service.ts    # Lógica de negocio
├── app.ts                     # Configuración de Express (sin arranque)
└── server.ts                  # Punto de entrada: conecta DB y levanta el servidor
```

### Principio de comunicación entre capas

Cada capa solo se comunica con la inmediatamente inferior. Nunca se saltan capas ni se habla "hacia arriba":

```
Routes → Controller → Service → Repository → Model (Mongoose/MongoDB)
```

Esto garantiza que un cambio en una capa no genere efectos en cascada hacia capas que no deberían verse afectadas.

---

## Proceso de refactorización

### Punto de partida

El código original consistía en un único archivo que concentraba todo el funcionamiento del servidor: definición de rutas, validaciones de entrada, cálculo del salario final, acceso directo a la base de datos y manejo de errores con bloques `try/catch` repetidos en cada endpoint. Cada función tenía más de una razón para cambiar, lo cual viola directamente el **Single Responsibility Principle (SRP)** de SOLID.

El objetivo del refactor fue separar esas responsabilidades en capas bien definidas, donde cada pieza del sistema tenga una única razón para existir y una única razón para cambiar.

---

### 1. Modelo (`models/employee.model.ts`)

El modelo ya existía en el proyecto base y no fue necesario modificarlo. Define la entidad `Employee` tal como se persiste en MongoDB mediante Mongoose. Se estableció como la base sobre la que construye todo el resto del sistema: ninguna capa distinta al repository debería importar Mongoose o interactuar con el modelo directamente.

---

### 2. Interfaces y DTOs (`interfaces/employee.dto.ts`)

Al comenzar la refactorización se identificó un problema de diseño: la estructura de datos que envía el cliente al crear un empleado **no es igual** a la entidad que se guarda en la base de datos. El campo `finalSalary` es calculado internamente por el sistema a partir del salario base y los años de servicio; si se usara una única interfaz para ambos casos, no existiría forma de representar honestamente que ese campo no debe venir del cliente.

Se optó por aplicar el patrón **DTO (Data Transfer Object)** y definir dos interfaces separadas:

```typescript
// Lo que recibe el sistema del cliente
export interface CreateEmployeeInput {
  name: string;
  position: string;
  baseSalary: number;
  yearsOfService: number;
}

// La entidad completa, tal como existe una vez procesada y persistida
export interface EmployeeData extends CreateEmployeeDto {
  finalSalary: number;
}
```

Esta separación además garantiza que TypeScript impida, a nivel de tipos, que el cliente pueda enviar un `finalSalary` inventado — el tipo de entrada directamente no lo contempla.

Se adoptó la convención de nombrado `kebab-case` con sufijo `.dto.ts` para el archivo, y los tipos en sí reciben el sufijo `Dto` o `Data` según corresponda, siguiendo las convenciones más extendidas en el ecosistema Node/TypeScript.

---

### 3. Repository (`repository/employee.repository.ts`)

Se creó la clase `EmployeeRepository`, cuya única responsabilidad es **hablar con la base de datos**. No valida, no calcula, no toma decisiones: simplemente ejecuta operaciones sobre el modelo de Mongoose y devuelve los resultados.

```typescript
class EmployeeRepository {
  async createEmployee(data: EmployeeData): Promise<EmployeeData> { ... }
  async findAllEmployees(): Promise<EmployeeData[]> { ... }
  async findEmployeeById(id: string): Promise<EmployeeData | null> { ... }
  async updateEmployee(id: string, data: Partial<EmployeeData>): Promise<EmployeeData | null> { ... }
  async deleteEmployee(id: string): Promise<EmployeeData | null> { ... }
}
```

En esta capa el tipo de entrada ya es `EmployeeData` completo (incluyendo `finalSalary`), porque se asume que la capa superior ya realizó todos los cálculos necesarios antes de delegar el guardado.

---

### 4. Service (`services/employee.service.ts`)

La clase `EmployeeService` concentra toda la **lógica de negocio** del sistema. Es la única capa que sabe cómo se calcula el salario final, qué validaciones aplican a los datos de entrada, y qué significa que un empleado "no exista" desde el punto de vista del dominio.

```typescript
class EmployeeService {
  private repository: EmployeeRepository;

  constructor(repository: EmployeeRepository = new EmployeeRepository()) {
    this.repository = repository;
  }
  ...
}
```

Se utilizó **inyección de dependencia simple** en el constructor: el repository se recibe como parámetro con un valor por default. Esto hace que la clase no esté acoplada a una implementación concreta del acceso a datos y facilita el reemplazo del repository en un entorno de testing (por ejemplo, con un mock).

#### Validaciones implementadas

- `baseSalary` debe ser un número mayor a 0.
- `yearsOfService` debe ser un entero mayor o igual a 0.

Ambas validaciones lanzan un `BadRequestError` (HTTP 400) cuando no se cumplen.

#### Cálculo del salario final

```
bonus = baseSalary × 0.02 × yearsOfService
finalSalary = baseSalary + bonus
```

#### Decisión de diseño relevante

Al implementar `findAllEmployees`, se evaluó si un array vacío debería considerarse un error. Se concluyó que **no lo es**: no haber empleados cargados es un estado válido del sistema, no una falla. Sin embargo, para esta actividad se opto por dejarlo como tal, devolviendo un error 400 (Bad Request). Este criterio contrasta con `findEmployeeById`, donde la ausencia de un recurso específico solicitado explícitamente sí corresponde a un error 404.

---

### 5. Errores personalizados (`errors/`)

Con el manejo de errores original (lanzar `new Error("mensaje")` y capturarlo en cada controller con su propio `try/catch`), no existía forma de asociar automáticamente un tipo de error con su código HTTP correspondiente. Cada controller terminaba tomando decisiones sobre status codes que no le correspondían.

Se diseñó un sistema de errores centralizado en tres piezas:

#### `AppError.ts` — clase base

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

La propiedad `isOperational` distingue errores **esperados** (parte del flujo normal de negocio, como validaciones o recursos no encontrados) de errores **inesperados** (bugs o fallas de infraestructura). La llamada a `Object.setPrototypeOf` es una medida defensiva para garantizar que `instanceof` funcione correctamente al heredar de clases nativas como `Error` en contextos donde el código se transpila a versiones antiguas de JavaScript.

#### `http-errors.ts` — subclases específicas

```typescript
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}
```

#### `error-handler.ts` — middleware centralizado de Express

```typescript
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: "Error interno del servidor" });
}
```

Express reconoce este middleware como manejador de errores por su firma de **4 parámetros** (`err, req, res, next`), no por el nombre de la función. Debe montarse **después** de las rutas en `app.ts`, ya que Express recorre los middlewares en el orden en que se registran y busca el próximo de 4 parámetros cuando se llama a `next(error)`.

Con este esquema, los controllers ya no deciden qué código HTTP corresponde a cada error: se limitan a hacer `next(err)` y delegan esa responsabilidad al error handler.

---

### 6. Controller (`controllers/employee.controller.ts`)

La clase `EmployeeController` actúa como **frontera entre el mundo HTTP y la lógica de negocio**. Lee los datos del request (`req.body`, `req.params`), llama al servicio correspondiente, y construye la respuesta HTTP (`res.status(...).json(...)`). No valida reglas de negocio ni accede a la base de datos.

```typescript
class EmployeeController {
  private service: EmployeeService;

  constructor(service = new EmployeeService()) {
    this.service = service;
  }

  createEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const employee = await this.service.createEmployee(req.body);
      return res.status(201).json({ ok: true, employee });
    } catch (err) {
      next(err);
    }
  };
}
```

#### Arrow functions en lugar de métodos de clase

Los métodos del controller se definen como **arrow functions asignadas a propiedades de la clase** en lugar de métodos tradicionales. La razón es técnica: cuando Express recibe una referencia a una función (`router.post("/...", controller.createEmployee)`), la invoca sin el contexto de la instancia original. Un método tradicional perdería el `this` en ese momento y fallaría al intentar acceder a `this.service`. Las arrow functions capturan el `this` léxico de la instancia en el momento de su creación, evitando este problema.

#### Type narrowing en `req.params`

Los tipos de Express definen `req.params` con valores de tipo `string | string[]`, porque el framework soporta patrones de ruta avanzados donde un parámetro puede matchear múltiples segmentos. Para la ruta `/employees/:id`, en la práctica siempre se recibe un `string`, pero TypeScript no lo puede inferir solo a partir de la definición de la ruta.

Se resolvió con **type narrowing** en el controller, validando el tipo antes de pasarlo al service:

```typescript
const { id } = req.params;
if (typeof id !== "string") {
  throw new BadRequestError("El id proporcionado no es válido");
}
const employee = await this.service.findEmployeeById(id);
```

Esta decisión es coherente con el principio de que las imprecisiones que vienen del mundo exterior (HTTP, tipos del framework) se resuelven en el borde de la aplicación —el controller— y no se propagan hacia las capas internas, que deben operar con tipos estrictos y confiables.

---

### 7. Rutas (`routes/employee.routes.ts`)

Las rutas tienen una única responsabilidad: mapear combinaciones de URL + verbo HTTP a métodos del controller. No contienen lógica, no toman decisiones, no tienen estado. Por esa razón se optó por **no encapsularlas en una clase**: un objeto `Router` de Express con los métodos declarados es suficiente y más claro que una clase sin estado real.

```typescript
const router = Router();
const controller = new EmployeeController();

router.post("/employees", controller.createEmployee);
router.get("/employees", controller.findAllEmployees);
router.get("/employees/:id", controller.findEmployeeById);
router.put("/employees/:id", controller.updateEmployee);
router.delete("/employees/:id", controller.deleteEmployee);
```

Durante el proceso se detectó y corrigió un error semántico: la ruta para obtener un empleado por ID había sido definida con el verbo `POST` en lugar de `GET`. Buscar un recurso es una operación de lectura; usar `POST` para lecturas viola la semántica REST y genera confusión en cualquier consumidor de la API.

---

### 8. Separación de `app.ts` y `server.ts`

La primera aproximación al servidor consistió en una clase `Server` que configuraba middlewares, montaba rutas y ejecutaba `.listen()` todo en el mismo lugar. Se identificaron dos problemas:

1. **Mezcla de responsabilidades:** configurar _qué es_ la aplicación Express y _cómo se arranca_ el proceso son dos ciclos de vida distintos. Si cambia la configuración de middlewares, no debería verse afectado el arranque del servidor, y viceversa.
2. **Dificultad para testing:** para testear rutas con herramientas como `supertest`, se necesita la instancia de Express configurada pero _sin_ que esté escuchando en un puerto real. Con todo fusionado en una clase, no es posible obtener eso de forma limpia.

Se adoptó la separación en dos archivos:

**`app.ts`** — configura la aplicación, la exporta sin levantarla:

```typescript
const app: Application = express();
app.use(express.json());
app.use("/api", router);
app.use(errorHandler); // siempre después de las rutas
export default app;
```

**`server.ts`** — conecta la base de datos y levanta el servidor:

```typescript
const server = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
};
server();
```

#### Bug detectado durante las pruebas

Al testear con Postman se obtuvo un error `ECONNREFUSED`, a pesar de que la consola mostraba el mensaje de "servidor corriendo". La causa fue que `.listen()` había sido llamado sin el puerto como primer argumento (`app.listen(callback)` en lugar de `app.listen(PORT, callback)`). En ese caso, Node asigna un puerto aleatorio del sistema operativo, mientras que el `console.log` seguía mostrando el puerto de la variable de entorno — generando una discrepancia entre lo logueado y lo real. El fix fue incluir `PORT` como primer parámetro.

---

### 9. Configuración de la base de datos (`config/db.ts`)

En la versión inicial, la conexión a MongoDB se ejecutaba como **efecto secundario del módulo**: al importar el archivo, la conexión se disparaba automáticamente. Esto es un patrón poco predecible porque el momento de conexión depende del orden de los imports, no de una decisión explícita.

Se refactorizó a una **función asíncrona explícita**:

```typescript
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conexión exitosa con la Base de datos");
  } catch (error) {
    console.error("No se pudo conectar a MongoDB", error);
    process.exit(1);
  }
};
```

Así, `server.ts` decide explícitamente cuándo conectar (`await connectDB()`), y la función es más fácil de mockear en tests.

---

### 10. Import de tipos de Express (`import type`)

Al correr archivos `.ts` directamente con el soporte nativo de TypeScript en Node (sin compilar con `tsc`), el motor realiza _type stripping_: elimina las anotaciones de tipos del código antes de ejecutarlo. Sin embargo, este proceso no analiza si un import nombrado se usa como valor o solo como tipo — y si intenta importar en runtime algo que no existe como valor en el módulo (como `Application` de Express, que es solo una interfaz de TypeScript), lanza un error.

La solución es usar `import type` para todos los imports que son exclusivamente tipos:

```typescript
import express from "express";
import type { Application, Request, Response, NextFunction } from "express";
```

Con `import type`, el compilador garantiza que ese import será eliminado completamente en tiempo de ejecución, independientemente de cómo se procese el archivo.

---

### 11. CRUD completo (endpoints adicionales)

El trabajo práctico establecía como requisito mínimo tres endpoints: crear un empleado, obtener todos y obtener uno por ID. A modo de práctica y para consolidar los conceptos aplicados en los endpoints anteriores, se implementó el CRUD completo añadiendo las operaciones de **actualización** (`PUT /api/employees/:id`) y **eliminación** (`DELETE /api/employees/:id`).

Ambos endpoints siguen exactamente el mismo patrón arquitectónico definido durante el refactor:

- El **repository** expone los métodos `updateEmployee` y `deleteEmployee`, que delegan en `findByIdAndUpdate` y `findByIdAndDelete` de Mongoose respectivamente.
- El **service** valida que el empleado exista antes de operar (lanzando `NotFoundError` si no se encuentra) y, en el caso de la actualización, recalcula `finalSalary` si se modifican `baseSalary` o `yearsOfService`.
- El **controller** aplica el mismo type narrowing sobre `req.params.id`, llama al método correspondiente del service y construye la respuesta HTTP.
- Las **rutas** se declararon con los verbos correctos según la semántica REST: `PUT` para actualización y `DELETE` para eliminación.

La implementación de estos endpoints sirvió para verificar en la práctica que la arquitectura en capas se comporta de forma consistente: añadir nuevas operaciones implicó extender cada capa de forma aislada, sin necesidad de modificar las ya existentes — lo que es precisamente el beneficio que esta arquitectura busca garantizar.

---

## Endpoints disponibles

Base URL: `http://localhost:3000/api`

| Método   | Ruta             | Descripción                   | Requerido por la cátedra |
| -------- | ---------------- | ----------------------------- | ------------------------ |
| `POST`   | `/employees`     | Crear un nuevo empleado       | ✅                       |
| `GET`    | `/employees`     | Obtener todos los empleados   | ✅                       |
| `GET`    | `/employees/:id` | Obtener un empleado por ID    | ✅                       |
| `PUT`    | `/employees/:id` | Actualizar un empleado por ID | ➕ Adicional             |
| `DELETE` | `/employees/:id` | Eliminar un empleado por ID   | ➕ Adicional             |

### Cuerpo esperado para `POST /employees` y `PUT /employees/:id`

```json
{
  "name": "Santiago",
  "position": "Senior",
  "baseSalary": 1000,
  "yearsOfService": 2
}
```

> `finalSalary` no debe enviarse: es calculado automáticamente por el sistema (`baseSalary + baseSalary × 0.02 × yearsOfService`).

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/employees_db
```

---

## Cómo ejecutar el proyecto

```bash
# 1. Levantar la base de datos con Docker
docker compose up -d

# 2. Instalar dependencias
npm install

# 3. Correr el servidor
npm run dev
```
