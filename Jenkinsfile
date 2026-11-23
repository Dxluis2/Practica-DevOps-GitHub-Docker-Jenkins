
pipeline {
    agent {
        label 'windows-docker'
    }

    options {
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    stages {
        stage('Obtener codigo de GitHub') {
            steps {
                checkout scm
            }
        }

        stage('Instalar dependencias') {
            steps {
                bat 'npm.cmd ci'
            }
        }

        stage('Ejecutar pruebas') {
            steps {
                bat 'npm.cmd test'
            }
        }

        stage('Construir imagen Docker') {
            steps {
                bat 'docker build -t control-visitas-jenkins:ci .'
            }
        }

        stage('Ejecutar contenedor') {
            steps {
                bat 'docker run -d --name jenkins-ci-prueba -p 127.0.0.1:3002:3000 control-visitas-jenkins:ci'
            }
        }

        stage('Verificar aplicacion') {
            steps {
                powershell '''
                    $correcto = $false

                    for ($i = 0; $i -lt 10; $i++) {
                        try {
                            $respuesta = Invoke-RestMethod http://localhost:3002/health

                            if ($respuesta.estado -eq "ok") {
                                $correcto = $true
                                break
                            }
                        }
                        catch {
                            Start-Sleep -Seconds 2
                        }
                    }

                    if (-not $correcto) {
                        throw "La aplicacion no respondio correctamente"
                    }

                    Write-Host "Aplicacion funcionando correctamente"
                '''
            }
        }
    }

    post {
        always {
            bat 'docker rm -f jenkins-ci-prueba 2>NUL || exit /b 0'
        }
        success {
            echo 'PIPELINE COMPLETADO CORRECTAMENTE'
        }
        failure {
            echo 'ERROR EN EL PIPELINE'
        }
    }
}
