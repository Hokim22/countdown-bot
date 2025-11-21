terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

# DynamoDB テーブル
resource "aws_dynamodb_table" "exam_countdown" {
  name           = "exam-countdown"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "examId"

  attribute {
    name = "examId"
    type = "S"
  }

  tags = {
    Name = "ExamCountdownBot"
  }
}

# Lambda実行ロール
resource "aws_iam_role" "lambda_role" {
  name = "countdown-bot-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda基本実行ポリシー
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# DynamoDBアクセスポリシー
resource "aws_iam_role_policy" "dynamodb_policy" {
  name = "countdown-bot-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Scan",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.exam_countdown.arn
      }
    ]
  })
}

# Lambda関数
resource "aws_lambda_function" "countdown_bot" {
  filename         = "../lambda/countdown-bot.zip"
  function_name    = "countdown-bot"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.exam_countdown.name
      GEMINI_API_KEY = var.gemini_api_key
      GEMINI_MODEL   = "gemini-2.5-flash"
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic]
}

# EventBridge ルール（毎日9時実行）
resource "aws_cloudwatch_event_rule" "daily_countdown" {
  name                = "daily-countdown"
  description         = "Daily countdown notification"
  schedule_expression = "cron(0 0 * * ? *)"  # UTC 0時 = JST 9時
}

# EventBridge ターゲット
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_countdown.name
  target_id = "CountdownBotTarget"
  arn       = aws_lambda_function.countdown_bot.arn
}

# Lambda実行権限
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.countdown_bot.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_countdown.arn
}

# 出力
output "dynamodb_table_name" {
  value = aws_dynamodb_table.exam_countdown.name
}

output "lambda_function_name" {
  value = aws_lambda_function.countdown_bot.function_name
}

# Gemini API Key変数
variable "gemini_api_key" {
  description = "Google Gemini API Key"
  type        = string
  sensitive   = true
}
