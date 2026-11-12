provider "aws" {
  region  = "us-east-2"
  profile = "nextsitrep-dev"

  allowed_account_ids = ["920394550130"]

  default_tags {
    tags = {
      Project     = "NextSITREP"
      Environment = "Development"
      ManagedBy   = "Terraform"
    }
  }
}
