pipeline {
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
