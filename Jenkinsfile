
pipeline {

    agent any

    environment {
        PYTHONUNBUFFERED = '1'
        COMPOSE_PROJECT_NAME = 'groupteamprofile'
    }

    stages {

        // =====================================
        // STAGE 1: CHECKOUT CODE
        // =====================================

        stage('1. Checkout Code') {
            steps {
                echo 'Checking out source code from GitHub'

                checkout scm
            }
        }


        // =====================================
        // STAGE 2: CODE SYNTAX VERIFICATION
        // =====================================

        stage('2. Code Syntax Verification') {
            steps {
                echo 'Checking Python backend syntax'

                sh '''
                    docker run --rm -i python:3.11-slim \
                    python -c "import sys; compile(sys.stdin.read(), 'backend/app.py', 'exec')" \
                    < backend/app.py
                '''

                echo 'Python syntax verification successful'
            }
        }


        // =====================================
        // STAGE 3: BUILD DOCKER IMAGE
        // =====================================

        stage('3. Build Docker Image') {
            steps {
                echo 'Building Docker images'

                sh 'docker compose build'
            }
        }


        // =====================================
        // STAGE 4: AUTOMATED DEPLOYMENT
        // =====================================

        stage('4. Automated Deployment') {
            steps {
                echo 'Deploying Group Team Profile Application'

                sh '''
                    docker compose up -d --remove-orphans
                '''
            }
        }


        // =====================================
        // STAGE 5: HEALTH CHECK
        // =====================================

        stage('5. Health Check') {
            steps {
                echo 'Checking application health'

                sh '''
                    set -eu

                    echo "Waiting for backend..."

                    i=1

                    while [ "$i" -le 30 ]; do

                        STATUS=$(docker inspect \
                        --format='{{.State.Health.Status}}' \
                        group-team-profile-backend 2>/dev/null || true)

                        if [ "$STATUS" = "healthy" ]; then
                            break
                        fi

                        sleep 2
                        i=$((i + 1))
                    done

                    STATUS=$(docker inspect \
                    --format='{{.State.Health.Status}}' \
                    group-team-profile-backend)

                    if [ "$STATUS" != "healthy" ]; then
                        docker logs --tail 50 group-team-profile-backend
                        exit 1
                    fi

                    echo "Backend is healthy!"

                    echo "Checking frontend API..."

                    curl -fsS \
                    http://host.docker.internal:8081/api/health

                    echo ""

                    echo "Container status:"

                    docker compose ps
                '''
            }
        }

    }

    post {

        success {
            echo 'GROUPSPACE CI/CD Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Please inspect Console Output.'
        }

    }
}
