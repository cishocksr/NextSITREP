
resource "aws_security_group" "development_ec2" {
  name        = "nextsitrep-development-ec2-sg"
  description = "Security group for NextSITREP Development EC2"
  vpc_id      = aws_vpc.development.id

  tags = {
    Name = "nextsitrep-development-ec2-sg"
  }
}

resource "aws_vpc_security_group_egress_rule" "development_https" {
  security_group_id = aws_security_group.development_ec2.id
  description       = "Allow outbound HTTPS for AWS services and updates"

  ip_protocol = "tcp"
  from_port   = 443
  to_port     = 443
  cidr_ipv4   = "0.0.0.0/0"
}
