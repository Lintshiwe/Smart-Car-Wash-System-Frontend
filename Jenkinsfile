pipeline {
    agent any

    environment {
        REPO = 'https://github.com/Lintshiwe/Smart-Car-Wash-System-Frontend.git'
        BRANCH = 'gh-pages'
    }

    stages {

        stage('Checkout') {
            steps {
                git url: "${REPO}", branch: 'main'
            }
        }

        stage('Validate') {
            steps {
                script {
                    if (!fileExists('index.html')) {
                        error('index.html not found!')
                    }
                }
            }
        }

        stage('Deploy to GitHub Pages') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-token', usernameVariable: 'USER', passwordVariable: 'TOKEN')]) {
                    sh '''
                        git config --global user.email "jenkins@local"
                        git config --global user.name "Jenkins"

                        # Create gh-pages branch
                        git checkout --orphan gh-pages

                        # Remove old files
                        git rm -rf .

                        # Copy only site files
                        cp -r ../* .

                        # Add & commit
                        git add .
                        git commit -m "Deploy to GitHub Pages"

                        # Push
                        git push https://$USER:$TOKEN@github.com/Lintshiwe/Smart-Car-Wash-System-Frontend.git gh-pages --force
                    '''
                }
            }
        }
    }
}
