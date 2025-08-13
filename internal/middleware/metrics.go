package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

type MetricsMiddleware struct {
	httpRequestsTotal prometheus.CounterVec
	httpDuration      prometheus.HistogramVec
}

func NewMetricsMiddleware() *MetricsMiddleware {
	httpRequestsTotal := prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "recipe_ai_http_requests_total",
		Help: "Total number of HTTP requests",
	}, []string{"method", "endpoint", "status"})

	httpDuration := prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name: "recipe_ai_http_duration_seconds",
		Help: "HTTP request duration in seconds",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "endpoint"})

	prometheus.MustRegister(httpRequestsTotal)
	prometheus.MustRegister(httpDuration)

	return &MetricsMiddleware{
		httpRequestsTotal: *httpRequestsTotal,
		httpDuration:      *httpDuration,
	}
}

func (m *MetricsMiddleware) Handler() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		c.Next()

		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())
		method := c.Request.Method

		m.httpRequestsTotal.WithLabelValues(method, path, status).Inc()
		m.httpDuration.WithLabelValues(method, path).Observe(duration)
	})
}