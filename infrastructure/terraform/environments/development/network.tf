
resource "aws_vpc" "development" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "nextsitrep-development-vpc"
  }
}

resource "aws_subnet" "development_public" {
  vpc_id                  = aws_vpc.development.id
  cidr_block              = "10.20.1.0/24"
  availability_zone       = "us-east-2a"
  map_public_ip_on_launch = false

  tags = {
    Name = "nextsitrep-development-public-subnet"
  }
}

resource "aws_internet_gateway" "development" {
  vpc_id = aws_vpc.development.id

  tags = {
    Name = "nextsitrep-development-igw"
  }
}

resource "aws_route_table" "development_public" {
  vpc_id = aws_vpc.development.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.development.id
  }

  tags = {
    Name = "nextsitrep-development-public-rt"
  }
}

resource "aws_route_table_association" "development_public" {
  subnet_id      = aws_subnet.development_public.id
  route_table_id = aws_route_table.development_public.id
}

