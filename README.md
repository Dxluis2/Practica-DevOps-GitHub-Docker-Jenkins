# Agenda Escolar — DevOps

## Descripción del proyecto

Agenda Escolar es una aplicación web progresiva (PWA) desarrollada para facilitar la organización de actividades académicas. Permite gestionar materias, tareas y fechas de entrega, ayudando a los estudiantes a mantener un mejor control de sus responsabilidades escolares.

Este proyecto es una continuación del sistema desarrollado durante el primer parcial. En esta etapa se incorporarán herramientas y prácticas DevOps para mejorar su implementación, automatización y distribución mediante contenedores Docker.

## Objetivo

Implementar herramientas y procesos DevOps en la aplicación Agenda Escolar mediante la creación de contenedores, la integración de servicios y la automatización de procesos de construcción y verificación del software.

## Tecnologías utilizadas

- React y TypeScript para el desarrollo de la interfaz.
- Vite para el entorno de desarrollo y compilación.
- Firebase Authentication y Firestore para autenticación y almacenamiento.
- Progressive Web App (PWA) para instalación y funcionalidades web progresivas.
- Git y GitHub para control de versiones.
- Docker y Docker Compose para contenerización y ejecución de servicios.
- GitHub Actions para integración continua.
- Node.js y Redis para los servicios de la práctica.

**Nota:** La integración de Docker, Redis y el flujo de integración continua forma parte de las siguientes etapas de desarrollo.

## Requisitos

Para ejecutar el proyecto en un entorno local se necesita:

- Node.js y npm compatibles con las dependencias del proyecto.
- Visual Studio Code o un editor de código.
- Git.
- Un navegador web actualizado.
- Configuración válida del cliente Firebase.

Para las etapas de contenerización también se utilizarán Docker Desktop y Docker Compose.

## Instalación y ejecución local

Clonar el repositorio:

```bash
git clone https://github.com/Dxluis2/agendaEscolar-devops.git
```

Ingresar a la carpeta:

```bash
cd agendaEscolar-devops
```

Instalar las dependencias:

```bash
npm install
```

Configurar las variables de entorno de Firebase en un archivo `.env.local`, utilizando los valores correspondientes al proyecto. No se deben publicar credenciales privadas.

Iniciar la aplicación:

```bash
npm run dev
```

Abrir en el navegador la dirección local que indique Vite, normalmente:

http://localhost:5173/

## Compilación

Para generar la versión de producción:

```bash
npm run build
```

Para previsualizar la compilación:

```bash
npm run preview
```

Para ejecutar el análisis estático:

```bash
npm run lint
```

En Windows PowerShell puede utilizarse `npm.cmd` en lugar de `npm` si existe una restricción de ejecución de scripts.

## Estructura del proyecto

```text
agendaEscolar-devops/
├── public/
├── scripts/
├── src/
│   ├── assets/
│   ├── pages/
│   ├── App.tsx
│   ├── firebase.ts
│   ├── main.tsx
│   └── sw.ts
├── .github/
│   └── workflows/
├── package.json
├── package-lock.json
├── README.md
└── vite.config.ts
```

Durante la práctica se agregarán los archivos necesarios para Docker, Docker Compose, pruebas automatizadas y CI.

## Integrantes del equipo

- Navarrete Sanchez Luis Angel
- Perez Lozano Erick David
- Ramirez Arellano Jose Luis
- Vargas Gonzalez Luis Gabriel

## Repositorio

https://github.com/Dxluis2/agendaEscolar-devops

## Estado del proyecto

La aplicación web se encuentra implementada y su compilación de producción ha sido verificada. La configuración de contenedores, los servicios complementarios y la integración continua se desarrollarán durante la práctica integradora de DevOps.