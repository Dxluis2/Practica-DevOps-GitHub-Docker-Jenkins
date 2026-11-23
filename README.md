
# Práctica DevOps: GitHub, Docker y Jenkins

## Descripción del proyecto

Agenda Escolar es una aplicación web progresiva (PWA) desarrollada con React, TypeScript y Firebase para facilitar la organización de actividades académicas.

Permite administrar materias, tareas y fechas de entrega, ayudando a los estudiantes a organizar sus responsabilidades escolares.

Este proyecto se utiliza para implementar un pipeline DevOps mediante GitHub, Docker y Jenkins, automatizando las pruebas, la construcción de imágenes y la ejecución de contenedores.

## Objetivo general

Integrar GitHub, Docker y Jenkins para implementar un flujo de integración continua que permita administrar el código fuente, realizar pruebas automatizadas, construir imágenes Docker y verificar el funcionamiento de la aplicación.

## Tecnologías utilizadas

- React y TypeScript
- Vite
- Firebase Authentication y Firestore
- Progressive Web App (PWA)
- Node.js y Express
- Redis
- Git y GitHub
- Docker y Docker Compose
- GitHub Actions
- Jenkins (integración pendiente)

## Requisitos

- Git
- Node.js y npm
- Docker Desktop
- Docker Compose
- Jenkins
- Navegador web
- Configuración de Firebase para utilizar la interfaz web

## Instalación del proyecto

Clonar el repositorio:

```bash
git clone https://github.com/Dxluis2/Practica-DevOps-GitHub-Docker-Jenkins.git
```

Entrar al directorio:

```bash
cd Practica-DevOps-GitHub-Docker-Jenkins
```

Instalar dependencias:

```bash
npm ci
```

## Ejecutar la aplicación web

Configurar las variables de entorno necesarias para Firebase.

```bash
npm run dev
```

Abrir la dirección indicada por Vite, normalmente:

http://localhost:5173/

## Ejecutar pruebas

```bash
npm test
```

Las pruebas actuales verifican aspectos básicos de la configuración de la API.

## Construcción de la imagen Docker

```bash
docker build -t control-visitas:v1 .
```

## Ejecutar los servicios con Docker Compose

```bash
docker compose up -d --build
```

Comprobar los contenedores:

```bash
docker compose ps
```

Verificar la API:

http://localhost:3000/health

Consultar el contador de visitas:

http://localhost:3000/api/visitas

Detener los servicios:

```bash
docker compose down
```

## Integración continua

El proyecto cuenta con un flujo previo de GitHub Actions que ejecuta pruebas, construye una imagen Docker y la publica en Docker Hub.

Para esta práctica se incorporará Jenkins mediante un archivo `Jenkinsfile`, con etapas para:

1. Obtener el código fuente desde GitHub.
2. Instalar las dependencias.
3. Ejecutar pruebas automatizadas.
4. Construir la imagen Docker.
5. Ejecutar un contenedor.
6. Verificar el funcionamiento de la API.

## Estructura principal

```text
Practica-DevOps-GitHub-Docker-Jenkins/
|-- .github/
|   |-- workflows/
|       |-- ci.yml
|-- api/
|   |-- server.js
|-- public/
|-- src/
|-- test/
|   |-- app.test.js
|-- .dockerignore
|-- Dockerfile
|-- compose.yaml
|-- package.json
|-- package-lock.json
|-- README.md
|-- Jenkinsfile 
```

## Integrantes del equipo

- Navarrete Sanchez Luis Angel
- Perez Lozano Erick David
- Ramirez Arellano Jose Luis
- Vargas Gonzalez Luis Gabriel

## Repositorio de GitHub

https://github.com/Dxluis2/Practica-DevOps-GitHub-Docker-Jenkins

## Estado del proyecto

La aplicación, la API, las pruebas automatizadas y la configuración Docker ya se encuentran implementadas.

La integración con Jenkins y la ejecución del nuevo pipeline se realizarán durante las siguientes fases de la práctica.
