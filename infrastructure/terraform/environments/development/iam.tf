
data "aws_iam_policy_document" "development_ec2_assume_role" {
  statement {
    sid     = "AllowEC2AssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "development_ec2" {
  name               = "nextsitrep-development-ec2-role"
  description        = "IAM role for the NextSITREP Development EC2 instance"
  assume_role_policy = data.aws_iam_policy_document.development_ec2_assume_role.json

  tags = {
    Name = "nextsitrep-development-ec2-role"
  }
}

resource "aws_iam_role_policy_attachment" "development_ssm" {
  role       = aws_iam_role.development_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "development_ec2" {
  name = "nextsitrep-development-ec2-profile"
  role = aws_iam_role.development_ec2.name

  tags = {
    Name = "nextsitrep-development-ec2-profile"
  }
}


# Allow the Development EC2 instance to retrieve
# only its Cloudflare Tunnel authentication token.

data "aws_iam_policy_document" "cloudflare_tunnel_token" {
  statement {
    sid    = "ReadCloudflareTunnelToken"
    effect = "Allow"

    actions = [
      "ssm:GetParameter"
    ]

    resources = [
      "arn:aws:ssm:us-east-2:920394550130:parameter/nextsitrep/development/cloudflare/tunnel-token"
    ]
  }
}

resource "aws_iam_role_policy" "cloudflare_tunnel_token" {
  name   = "nextsitrep-development-cloudflare-token-read"
  role   = aws_iam_role.development_ec2.id
  policy = data.aws_iam_policy_document.cloudflare_tunnel_token.json
}
