terraform {
  backend "s3" {
    bucket       = "nextsitrep-dev-terraform-state-920394550130"
    key          = "development/terraform.tfstate"
    region       = "us-east-2"
    profile      = "nextsitrep-dev"
    use_lockfile = true
    encrypt      = true
  }
}
