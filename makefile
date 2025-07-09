# ----------------- Config -----------------

NAMESPACE = v9k4x4s3
REPOSITORY = lambda/scraper
IMAGE_NAME = optionintraday-scraper
IMAGE_TAG = latest
LAMBDA_FUNCTION = scraper
LAMBDA_REGION = ap-south-1
ECR_PUBLIC_REGION = us-east-1
ECR_URI = public.ecr.aws/$(NAMESPACE)/$(REPOSITORY):$(IMAGE_TAG)

# ----------------- Targets -----------------

.PHONY: all login build tag push deploy clean

all: login build tag push deploy

# Step 1: Login to Amazon ECR Public (always us-east-1)
login:
	@echo "🔐 Logging in to ECR Public (us-east-1)..."
	aws ecr-public get-login-password --region $(ECR_PUBLIC_REGION) | \
	docker login --username AWS --password-stdin public.ecr.aws

# Step 2: Build Docker image locally
build:
	@echo "🐳 Building Docker image..."
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

# Step 3: Tag image with public ECR URI
tag:
	@echo "🏷️  Tagging image for Public ECR..."
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(ECR_URI)

# Step 4: Push to ECR Public (repository must already exist)
push:
	@echo "📤 Pushing to Public ECR..."
	docker push $(ECR_URI)

# Step 5: Update Lambda function with new image
deploy:
	@echo "🚀 Updating Lambda function in region $(LAMBDA_REGION)..."
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION) \
		--region $(LAMBDA_REGION) \
		--image-uri $(ECR_URI)

# Step 6: Clean up local Docker images
clean:
	@echo "🧹 Cleaning local Docker images..."
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) || true
	docker rmi $(ECR_URI) || true
