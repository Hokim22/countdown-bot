# Manage Lambda関数
resource "aws_lambda_function" "manage_bot" {
  filename         = "../lambda/manage-bot.zip"
  function_name    = "countdown-manage-bot"
  role            = aws_iam_role.lambda_role.arn
  handler         = "manage.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.exam_countdown.name
      ADMIN_KEY      = var.admin_key
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic]
}

# Lambda Function URL
resource "aws_lambda_function_url" "manage_url" {
  function_name      = aws_lambda_function.manage_bot.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["GET", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type"]
    max_age       = 86400
  }
}

# DynamoDB削除権限を追加
resource "aws_iam_role_policy" "manage_dynamodb_policy" {
  name = "countdown-manage-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.exam_countdown.arn
      }
    ]
  })
}

# EventBridge削除権限を追加
resource "aws_iam_role_policy" "manage_eventbridge_policy" {
  name = "countdown-manage-eventbridge-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:RemoveTargets",
          "events:DeleteRule"
        ]
        Resource = "arn:aws:events:ap-northeast-1:*:rule/countdown-*"
      }
    ]
  })
}

# 管理者キー変数
variable "admin_key" {
  description = "Admin Key for accessing all data"
  type        = string
  sensitive   = true
}

# 出力
output "manage_function_url" {
  value = aws_lambda_function_url.manage_url.function_url
}
