# Purpose: Serverless Container execution orchestration (ECS Fargate)
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

# AI Service Task Definition
resource "aws_ecs_task_definition" "ai_service" {
  family                   = "${var.project_name}-ai"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "ai-service"
      image     = "your-ecr-repo-url/ai-service:latest" # Replaced by CI/CD
      essential = true
      portMappings = [
        { containerPort = 50051 },
        { containerPort = 8000 }
      ]
    }
  ])
}

# Go Gateway Task Definition
resource "aws_ecs_task_definition" "gateway" {
  family                   = "${var.project_name}-gateway"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name      = "gateway"
      image     = "your-ecr-repo-url/gateway:latest" # Replaced by CI/CD
      essential = true
      portMappings = [
        { containerPort = 8080 }
      ]
    }
  ])
}