
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

