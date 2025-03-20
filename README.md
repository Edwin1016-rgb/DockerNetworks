docker_networks/
├── neo4j-import/
│ └── Dataset_A-Peliculas.csv
├── backend/
│ ├── App.js
│ ├── Dockerfile
│ ├── package.json
│ └── ...
├── docker-compose.yml
└── README.md

Copy

## Requisitos

- Docker
- Docker Compose
- Node.js (opcional, para desarrollo local)

# ----------------------------------------------------------------------------------------------

## Configuración del Entorno

1. **Clonar el Repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/tu-repositorio.git
   cd tu-repositorio

# --------------------------------------------------------------------------------------------

# Configurar las Variables de Entorno:
Crea un archivo .env en la raíz del proyecto con las siguientes variables:

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=edwin.becerra03

# PostgreSQL
PG_USER=user
PG_PASSWORD=password
PG_DATABASE=etl_db
PG_HOST=postgres
PG_PORT=5432

# Express
EXPRESS_PORT=3000

# ---------------------------------------------------------------------------------------------

# Levantar los Contenedores:
Ejecuta el siguiente comando para construir y levantar los contenedores:

-> docker-compose up --build

Esto levantará los servicios de Neo4j, PostgreSQL y la aplicación Express.

# Cargar Datos en Neo4j
Para cargar los datos en Neo4j, sigue estos pasos:

# Copiar el Archivo CSV al Contenedor de Neo4j:
docker cp ./Dataset_A-Peliculas.csv docker_networks_neo4j_1:/var/lib/neo4j/import/Dataset_A-Peliculas.csv

# ---------------------------------------------------------------------------------------------

# Cargar los Datos en Neo4j:
Abre Neo4j Browser en tu navegador (http://localhost:7474) e inicia sesión con las credenciales (neo4j/edwin.becerra03).

# Ejecuta la siguiente consulta Cypher para cargar los datos:

LOAD CSV WITH HEADERS FROM 'file:///Dataset_A-Peliculas.csv' AS row
CREATE (p:Pelicula {
    id: row.id,
    nombre: row.nombre,
    calificacion: toFloat(row.calificacion),
    año_lanzamiento: toInteger(row.año_lanzamiento),
    genero: row.genero
});
Esto creará nodos en Neo4j con los datos del archivo CSV.
# -----------------------------------------------------------------------------------------------

# Endpoints de la API
La API tiene dos endpoints principales:

# GET /api/extract:

Extrae los datos de Neo4j y los devuelve en formato JSON sin transformar.

Ejemplo de respuesta:
{
    "movies": [
        {
            "nombre": "Inception",
            "calificacion": 8.8,
            "año": 2010
        },
        {
            "nombre": "The Dark Knight",
            "calificacion": 9.0,
            "año": 2008
        }
    ]
}

# GET /api/transform:

Extrae los datos de Neo4j, aplica transformaciones, los carga en PostgreSQL y los exporta a un archivo CSV (recap.csv).

Ejemplo de respuesta:

{
    "movies": [
        {
            "nombreFormateado": "inception",
            "categoriaCalificacion": "Buena",
            "decada": "2010s",
            "puntuacionAjustada": 8.7,
            "fechaProcesamiento": "2025-03-09"
        },
        {
            "nombreFormateado": "the-dark-knight",
            "categoriaCalificacion": "Buena",
            "decada": "2000s",
            "puntuacionAjustada": 8.3,
            "fechaProcesamiento": "2025-03-09"
        }
    ]
}
# Verificar los Datos en PostgreSQL
Después de ejecutar el endpoint GET /api/transform, los datos transformados se cargarán en la tabla etl_data de PostgreSQL. Puedes verificar esto conectándote a PostgreSQL:

# Conéctate a PostgreSQL:

docker exec -it postgres psql -U user -d etl_db
Ejecuta una consulta para ver los datos:

SELECT * FROM etl_data;

# Verificar el Archivo CSV
Después de ejecutar el endpoint GET /api/transform, los datos transformados se exportarán a un archivo CSV (recap.csv). Puedes verificar esto accediendo al contenedor de la aplicación Express:

# Conéctate al contenedor de la aplicación Express:
docker exec -it express_backend /bin/sh

# Verifica que el archivo recap.csv esté en el directorio raíz:
ls

# Verifica el contenido del archivo:
cat recap.csv
