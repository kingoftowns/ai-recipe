package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func Logger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		logLevel := getLogLevel(param.StatusCode)
		
		entry := logrus.WithFields(logrus.Fields{
			"status":        param.StatusCode,
			"method":        param.Method,
			"path":          param.Path,
			"ip":            param.ClientIP,
			"latency":       param.Latency,
			"latency_human": param.Latency.String(),
			"user_agent":    param.Request.UserAgent(),
			"timestamp":     param.TimeStamp.Format(time.RFC3339),
		})

		switch logLevel {
		case logrus.ErrorLevel:
			entry.Error("Request processed with error")
		case logrus.WarnLevel:
			entry.Warn("Request processed with warning")
		default:
			entry.Info("Request processed")
		}
		
		return ""
	})
}

func getLogLevel(statusCode int) logrus.Level {
	switch {
	case statusCode >= 500:
		return logrus.ErrorLevel
	case statusCode >= 400:
		return logrus.WarnLevel
	default:
		return logrus.InfoLevel
	}
}

func InitializeLogger(environment string) {
	if environment == "production" {
		logrus.SetFormatter(&logrus.JSONFormatter{})
		logrus.SetLevel(logrus.InfoLevel)
	} else {
		logrus.SetFormatter(&logrus.TextFormatter{
			FullTimestamp: true,
		})
		logrus.SetLevel(logrus.DebugLevel)
	}
}