require("dotenv").config();
const express = require("express");
const neo4j = require("neo4j-driver");
const { Client } = require('pg');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const port = process.env.PORT || 3000;

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const pgClient = new Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

pgClient.connect()
    .then(() => {
        console.log("Conectado a PostgreSQL");
    })
    .catch((err) => {
        console.error("Error al conectar a PostgreSQL:", err);
    });

const createTableIfNotExists = async () => {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS etl_data (
                nombre_formateado TEXT,
                categoria_calificacion TEXT,
                decada TEXT,
                puntuacion_ajustada FLOAT,
                fecha_procesamiento DATE
            );
        `;
        await pgClient.query(createTableQuery);
        console.log("Tabla 'etl_data' creada o verificada.");
    } catch (error) {
        console.error("Error al crear la tabla 'etl_data':", error);
    }
};

app.get("/api/extract", async (req, res) => {
    const session = driver.session();

    try {
        // Extraer datos de Neo4j
        const result = await session.run("MATCH (p:Pelicula) RETURN p.nombre as nombre, p.calificacion as calificacion, p.año_lanzamiento as año LIMIT 10");
        const movies = result.records.map(record => {
            return {
                nombre: record.get("nombre"),
                calificacion: record.get("calificacion"),
                año: record.get("año")
            };
        });

        res.json({ movies });
    } catch (error) {
        console.error("Error al extraer datos de Neo4j:", error);
        res.status(500).json({ error: "Error al extraer los datos" });
    } finally {
        await session.close();
    }
});

app.get("/api/transform", async (req, res) => {
    const session = driver.session();

    try {
        // Extraer datos de Neo4j
        const result = await session.run("MATCH (p:Pelicula) RETURN p.nombre as nombre, p.calificacion as calificacion, p.año_lanzamiento as año");

        const movies = result.records.map(record => {
            const nombre = record.get("nombre");
            const calificacion = parseFloat(record.get("calificacion")) || 0; 
            const año = record.get("año");

            // Transformaciones
            const nombreFormateado = nombre.toLowerCase().replace(/\s+/g, '-');
            const categoriaCalificacion = calificacion <= 5 ? "Mala" : calificacion <= 7 ? "Regular" : "Buena";
            const decada = `${Math.floor(año / 10) * 10}s`;
            const puntuacionAjustada = (calificacion * 2) - (2025 - año) / 10;
            const fechaProcesamiento = new Date().toISOString().split('T')[0];

            return { nombreFormateado, categoriaCalificacion, decada, puntuacionAjustada, fechaProcesamiento };
        });

        // Crear la tabla si no existe
        await createTableIfNotExists();

        // Cargar datos en PostgreSQL
        await loadDataIntoPostgreSQL(movies);

        // Exportar a CSV
        await exportDataToCSV(movies);

        res.json({ movies });
    } catch (error) {
        console.error("Error al transformar datos:", error);
        res.status(500).json({ error: "Error al transformar los datos" });
    } finally {
        await session.close();
    }
});

const loadDataIntoPostgreSQL = async (movies) => {
    try {
        for (const movie of movies) {
            const insertQuery = `
                INSERT INTO etl_data (nombre_formateado, categoria_calificacion, decada, puntuacion_ajustada, fecha_procesamiento)
                VALUES ($1, $2, $3, $4, $5)
            `;
            await pgClient.query(insertQuery, [movie.nombreFormateado, movie.categoriaCalificacion, movie.decada, movie.puntuacionAjustada, movie.fechaProcesamiento]);
        }

        console.log("Datos cargados en PostgreSQL correctamente.");
    } catch (error) {
        console.error("Error al cargar datos en PostgreSQL:", error);
    }
};

const exportDataToCSV = async (movies) => {
    const csvWriter = createCsvWriter({
        path: 'recap.csv',
        header: [
            { id: 'nombreFormateado', title: 'Nombre Formateado' },
            { id: 'categoriaCalificacion', title: 'Categoria Calificacion' },
            { id: 'decada', title: 'Decada' },
            { id: 'puntuacionAjustada', title: 'Puntuacion Ajustada' },
            { id: 'fechaProcesamiento', title: 'Fecha Procesamiento' }
        ]
    });

    try {
        await csvWriter.writeRecords(movies);
        console.log("Archivo CSV generado correctamente.");
    } catch (error) {
        console.error("Error al generar el archivo CSV:", error);
    }
};

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});