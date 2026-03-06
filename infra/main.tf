# Purpose: Core AWS Provider configuration and VPC scaffolding
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Simplified Default VPC for demonstration (In production, use private/public subnets)
resource "aws_default_vpc" "default" {}

resource "aws_default_subnet" "default_az1" {
  availability_zone = "${var.aws_region}a"
}

resource "aws_default_subnet" "default_az2" {
  availability_zone = "${var.aws_region}b"
}