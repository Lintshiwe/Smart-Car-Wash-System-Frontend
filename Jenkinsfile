pipeline {
    agent any

    tools {
        maven 'Maven'
    }

    parameters {
        choice(
            name: 'ACTION',
            choices: ['deploy', 'rollback', 'setup', 'status'],
            description: 'Select action'
        )
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: 'Run tests?'
        )
        booleanParam(
            name: 'BUILD_DOCKER',
            defaultValue: false,
            description: 'Build Docker images? (optional)'
        )
    }

    environment {
        PROJECT = 'carwash-frontend'
        TEAM = 'lintshiwe'
        STACK = 'nodejs'
        APP_DIR = '/opt/carwash-frontend'
        FRAMEWORK_DIR = '/home/lintshiwe/devops-framework'
        PROJECT_DIR = '/home/lintshiwe/devops-framework/projects/carwash-frontend'
        JAVA_HOME = "${sh(script: 'dirname $(dirname $(readlink -f $(which java)))', returnStdout: true).trim()}"
        PATH = "${JAVA_HOME}/bin:${env.PATH}"
        ANSIBLE_HOST_KEY_CHECKING = 'False'
    }

    stages {

        stage('Checkout') {
            steps {
                echo "📥 [${PROJECT}] Pulling code..."
                git credentialsId: 'github-token',
                    url: 'https://github.com/Lintshiwe/Smart-Car-Wash-System-Frontend.git',
                    branch: 'main'
            }
        }

        stage('Build') {
            when {
                expression { params.ACTION == 'deploy' }
            }
            steps {
                echo "🔨 [${PROJECT}] Building..."
                sh 'mvn clean package -DskipTests'
            }
        }

        stage('Test') {
            when {
                allOf {
                    expression { params.ACTION == 'deploy' }
                    expression { params.RUN_TESTS == true }
                }
            }
            steps {
                echo "🧪 [${PROJECT}] Testing..."
                sh 'mvn test'
            }
        }

        stage('Setup Infrastructure') {
            when {
                expression { params.ACTION == 'setup' }
            }
            steps {
                echo "🏗️ [${PROJECT}] Setting up infrastructure..."
                sh """
                    ansible-playbook ${FRAMEWORK_DIR}/ansible/playbooks/setup.yml \
                        -i ${PROJECT_DIR}/inventory.ini \
                        -e @${PROJECT_DIR}/config.yml \
                        -v
                """
            }
        }

        stage('Deploy') {
            when {
                expression { params.ACTION == 'deploy' }
            }
            steps {
                echo "🚀 [${PROJECT}] Deploying..."
                sh """
                    ansible-playbook ${FRAMEWORK_DIR}/ansible/playbooks/deploy.yml \
                        -i ${PROJECT_DIR}/inventory.ini \
                        -e @${PROJECT_DIR}/config.yml \
                        -v
                """
            }
        }

        stage('Rollback') {
            when {
                expression { params.ACTION == 'rollback' }
            }
            steps {
                echo "⏪ [${PROJECT}] Rolling back..."
                sh """
                    ansible-playbook ${FRAMEWORK_DIR}/ansible/playbooks/rollback.yml \
                        -i ${PROJECT_DIR}/inventory.ini \
                        -e @${PROJECT_DIR}/config.yml \
                        -v
                """
            }
        }

        stage('Status') {
            when {
                expression { params.ACTION == 'status' }
            }
            steps {
                echo "📊 [${PROJECT}] Checking status..."
                sh """
                    ansible-playbook ${FRAMEWORK_DIR}/ansible/playbooks/status.yml \
                        -i ${PROJECT_DIR}/inventory.ini \
                        -e @${PROJECT_DIR}/config.yml \
                        -v
                """
            }
        }

        stage('Docker (Optional)') {
            when {
                expression { params.BUILD_DOCKER == true }
            }
            steps {
                echo "🐳 [${PROJECT}] Building Docker images..."
                sh """
                    ${FRAMEWORK_DIR}/scripts/docker-build.sh carwash-frontend
                """
            }
        }

        stage('Health Check') {
            when {
                expression { params.ACTION == 'deploy' }
            }
            steps {
                echo "💓 [${PROJECT}] Health check..."
                sh """
                    sleep 15
                    ansible-playbook ${FRAMEWORK_DIR}/ansible/playbooks/status.yml \
                        -i ${PROJECT_DIR}/inventory.ini \
                        -e @${PROJECT_DIR}/config.yml
                """
            }
        }
    }

    post {
        success {
            echo "✅ [${PROJECT}] Pipeline completed!"
        }
        failure {
            echo "❌ [${PROJECT}] Pipeline failed! Logs: /opt/carwash-frontend/logs/"
        }
        always {
            cleanWs()
        }
    }
  agent any

  parameters {
    booleanParam(name: 'DEPLOY_PRODUCTION', defaultValue: false, description: 'Deploy this build to production')
    string(name: 'PROD_DEPLOY_CMD', defaultValue: '', description: 'Shell command used to deploy frontend to production target')
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Validate') {
      steps {
        echo 'Validating static frontend structure...'
        sh 'test -f app/index.html'
        sh 'test -f app/styles.css'
        sh 'test -f app/script.js'
      }
    }

    stage('Package') {
      steps {
        echo 'Packaging static frontend artifact...'
        sh 'rm -rf dist && mkdir -p dist && cp -r app/* dist/'
        sh 'tar -czf carwash-frontend-static.tar.gz -C dist .'
      }
    }

    stage('Approve Production') {
      when {
        expression {
          return params.DEPLOY_PRODUCTION && (env.BRANCH_NAME == null || env.BRANCH_NAME == 'main')
        }
      }
      steps {
        input message: 'Deploy frontend build to PRODUCTION?', ok: 'Deploy'
      }
    }

    stage('Deploy Production') {
      when {
        expression {
          return params.DEPLOY_PRODUCTION && (env.BRANCH_NAME == null || env.BRANCH_NAME == 'main')
        }
      }
      steps {
        script {
          if (!params.PROD_DEPLOY_CMD?.trim()) {
            error 'DEPLOY_PRODUCTION=true but PROD_DEPLOY_CMD is empty. Provide deployment command.'
          }
        }
        echo 'Deploying frontend to production...'
        sh '''#!/usr/bin/env bash
set -euo pipefail
eval "$PROD_DEPLOY_CMD"
'''
      }
    }
  }

  post {
    success {
      echo 'Frontend pipeline completed successfully (no Maven required).'
    }
    failure {
      echo 'Frontend pipeline failed.'
    }
  }
}
