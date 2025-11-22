# API Gateway REST API
resource "aws_api_gateway_rest_api" "countdown_api" {
  name        = "countdown-bot-api"
  description = "API for countdown bot registration"
}

# /register リソース
resource "aws_api_gateway_resource" "register" {
  rest_api_id = aws_api_gateway_rest_api.countdown_api.id
  parent_id   = aws_api_gateway_rest_api.countdown_api.root_resource_id
  path_part   = "register"
}

# POST メソッド
resource "aws_api_gateway_method" "register_post" {
  rest_api_id   = aws_api_gateway_rest_api.countdown_api.id
  resource_id   = aws_api_gateway_resource.register.id
  http_method   = "POST"
  authorization = "NONE"
}

# OPTIONS メソッド (CORS)
resource "aws_api_gateway_method" "register_options" {
  rest_api_id   = aws_api_gateway_rest_api.countdown_api.id
  resource_id   = aws_api_gateway_resource.register.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Lambda統合 (POST)
resource "aws_api_gateway_integration" "register_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.countdown_api.id
  resource_id             = aws_api_gateway_resource.register.id
  http_method             = aws_api_gateway_method.register_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.register_bot.invoke_arn
}

# Lambda統合 (OPTIONS)
resource "aws_api_gateway_integration" "register_options" {
  rest_api_id = aws_api_gateway_rest_api.countdown_api.id
  resource_id = aws_api_gateway_resource.register.id
  http_method = aws_api_gateway_method.register_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# OPTIONS レスポンス
resource "aws_api_gateway_method_response" "register_options" {
  rest_api_id = aws_api_gateway_rest_api.countdown_api.id
  resource_id = aws_api_gateway_resource.register.id
  http_method = aws_api_gateway_method.register_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "register_options" {
  rest_api_id = aws_api_gateway_rest_api.countdown_api.id
  resource_id = aws_api_gateway_resource.register.id
  http_method = aws_api_gateway_method.register_options.http_method
  status_code = aws_api_gateway_method_response.register_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# デプロイ
resource "aws_api_gateway_deployment" "countdown_api" {
  rest_api_id = aws_api_gateway_rest_api.countdown_api.id
  stage_name  = "prod"

  depends_on = [
    aws_api_gateway_integration.register_lambda,
    aws_api_gateway_integration.register_options
  ]
}

# Register Lambda関数
resource "aws_lambda_function" "register_bot" {
  filename         = "../lambda/register-bot.zip"
  function_name    = "countdown-bot-register"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 10

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.exam_countdown.name
      LAMBDA_ARN     = aws_lambda_function.countdown_bot.arn
    }
  }

  depends_on = [aws_lambda_function.countdown_bot]
}

# Lambda Function URL
resource "aws_lambda_function_url" "register_url" {
  function_name      = aws_lambda_function.register_bot.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
  }
}

# 出力
output "function_url" {
  value = aws_lambda_function_url.register_url.function_url
}
