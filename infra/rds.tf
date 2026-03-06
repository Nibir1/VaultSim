# Purpose: Persistent state management (PostgreSQL)
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06

resource "aws_db_instance" "postgres" {
  identifier           = "${var.project_name}-db"
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.micro"
  username             = "vaultadmin"
  password             = var.db_password
  parameter_group_name = "default.postgres15"
  skip_final_snapshot  = true
  publicly_accessible  = false
}