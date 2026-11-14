
# Find the latest Amazon Linux 2023 x86_64 AMI.


resource "aws_instance" "development" {
  ami                    = "ami-0e7b31515708b7972"
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.development_public.id
  vpc_security_group_ids = [aws_security_group.development_ec2.id]

  iam_instance_profile = aws_iam_instance_profile.development_ec2.name

  depends_on = [
    aws_iam_role_policy_attachment.development_ssm
  ]

  associate_public_ip_address = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 40
    encrypted             = true
    delete_on_termination = true
  }

  monitoring = false

  tags = {
    Name = "nextsitrep-development-ec2"
  }
}

resource "aws_eip" "development" {
  domain = "vpc"

  tags = {
    Name = "nextsitrep-development-eip"
  }
}

resource "aws_eip_association" "development" {
  instance_id   = aws_instance.development.id
  allocation_id = aws_eip.development.id
}

