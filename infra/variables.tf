# Purpose: Terraform variable definitions for AWS Infrastructure
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "vaultsim"
}

variable "db_password" {
  type      = string
  sensitive = true
}