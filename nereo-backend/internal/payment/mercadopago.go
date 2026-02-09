package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/nereo-ar/backend/internal/config"
)

type MercadoPagoClient struct {
	httpClient *http.Client
	baseURL    string
	token      string
	backURLs   BackURLs
	maxRetries int
}

type BackURLs struct {
	Success string
	Failure string
	Pending string
}

func NewMercadoPagoClient(cfg config.MercadoPagoConfig) *MercadoPagoClient {
	return &MercadoPagoClient{
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		baseURL: cfg.BaseURL,
		token:   cfg.AccessToken,
		backURLs: BackURLs{
			Success: cfg.BackURLSuccess,
			Failure: cfg.BackURLFailure,
			Pending: cfg.BackURLPending,
		},
		maxRetries: 3,
	}
}

// ============================================================
// Checkout Pro — Preferences
// ============================================================

type PreferenceRequest struct {
	Items               []PreferenceItem    `json:"items"`
	Payer               *PreferencePayer    `json:"payer,omitempty"`
	BackURLs            *PreferenceBackURLs `json:"back_urls,omitempty"`
	NotificationURL     string              `json:"notification_url,omitempty"`
	ExternalReference   string              `json:"external_reference,omitempty"`
	StatementDescriptor string              `json:"statement_descriptor,omitempty"`
	Metadata            map[string]string   `json:"metadata,omitempty"`
}

type PreferencePayer struct {
	Email   string `json:"email,omitempty"`
	Name    string `json:"name,omitempty"`
	Surname string `json:"surname,omitempty"`
	Phone   *PreferencePhone `json:"phone,omitempty"`
}

type PreferencePhone struct {
	AreaCode string `json:"area_code,omitempty"`
	Number   string `json:"number,omitempty"`
}

type PreferenceItem struct {
	Title      string  `json:"title"`
	Quantity   int     `json:"quantity"`
	UnitPrice  float64 `json:"unit_price"`
	CurrencyID string  `json:"currency_id"`
	CategoryID string  `json:"category_id,omitempty"`
}

type PreferenceBackURLs struct {
	Success string `json:"success"`
	Failure string `json:"failure"`
	Pending string `json:"pending"`
}

type PreferenceResponse struct {
	ID        string `json:"id"`
	InitPoint string `json:"init_point"`
	SandboxInitPoint string `json:"sandbox_init_point"`
}

func (c *MercadoPagoClient) CreatePreference(ctx context.Context, req *PreferenceRequest) (*PreferenceResponse, error) {
	if req.BackURLs == nil && c.backURLs.Success != "" {
		req.BackURLs = &PreferenceBackURLs{
			Success: c.backURLs.Success,
			Failure: c.backURLs.Failure,
			Pending: c.backURLs.Pending,
		}
	}

	var resp PreferenceResponse
	err := c.doRequest(ctx, http.MethodPost, "/checkout/preferences", req, &resp)
	if err != nil {
		return nil, fmt.Errorf("create preference: %w", err)
	}

	return &resp, nil
}

// ============================================================
// Preapproval — Recurring Subscriptions
// ============================================================

type PreapprovalRequest struct {
	Reason            string         `json:"reason"`
	AutoRecurring     AutoRecurring  `json:"auto_recurring"`
	BackURL           string         `json:"back_url"`
	PayerEmail        string         `json:"payer_email"`
	ExternalReference string         `json:"external_reference,omitempty"`
}

type AutoRecurring struct {
	Frequency         int     `json:"frequency"`
	FrequencyType     string  `json:"frequency_type"`
	TransactionAmount float64 `json:"transaction_amount"`
	CurrencyID        string  `json:"currency_id"`
}

type PreapprovalResponse struct {
	ID        string `json:"id"`
	InitPoint string `json:"init_point"`
	Status    string `json:"status"`
	SandboxInitPoint string `json:"sandbox_init_point"`
}

func (c *MercadoPagoClient) CreatePreapproval(ctx context.Context, req *PreapprovalRequest) (*PreapprovalResponse, error) {
	if req.BackURL == "" && c.backURLs.Success != "" {
		req.BackURL = c.backURLs.Success
	}

	var resp PreapprovalResponse
	err := c.doRequest(ctx, http.MethodPost, "/preapproval", req, &resp)
	if err != nil {
		return nil, fmt.Errorf("create preapproval: %w", err)
	}

	return &resp, nil
}

// ============================================================
// Payment Queries
// ============================================================

type PaymentInfo struct {
	ID                int     `json:"id"`
	Status            string  `json:"status"`
	StatusDetail      string  `json:"status_detail"`
	TransactionAmount float64 `json:"transaction_amount"`
	CurrencyID        string  `json:"currency_id"`
	ExternalReference string  `json:"external_reference"`
	PayerEmail        string  `json:"payer_email,omitempty"`
	Metadata          map[string]interface{} `json:"metadata"`
}

func (c *MercadoPagoClient) GetPayment(ctx context.Context, paymentID string) (*PaymentInfo, error) {
	var resp PaymentInfo
	err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/v1/payments/%s", paymentID), nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("get payment: %w", err)
	}
	return &resp, nil
}

// ============================================================
// Preapproval Queries
// ============================================================

type PreapprovalInfo struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Reason string `json:"reason"`
}

func (c *MercadoPagoClient) GetPreapproval(ctx context.Context, preapprovalID string) (*PreapprovalInfo, error) {
	var resp PreapprovalInfo
	err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("/preapproval/%s", preapprovalID), nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("get preapproval: %w", err)
	}
	return &resp, nil
}

// ============================================================
// HTTP with retries + exponential backoff
// ============================================================

type mpErrorResponse struct {
	Message string `json:"message"`
	Error   string `json:"error"`
	Status  int    `json:"status"`
}

func (c *MercadoPagoClient) doRequest(ctx context.Context, method, path string, body interface{}, result interface{}) error {
	var lastErr error

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(math.Pow(2, float64(attempt-1))) * 500 * time.Millisecond
			slog.Warn("retrying MP request", "attempt", attempt, "backoff", backoff, "path", path)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
		}

		var bodyReader io.Reader
		if body != nil {
			jsonBody, err := json.Marshal(body)
			if err != nil {
				return fmt.Errorf("marshal request body: %w", err)
			}
			bodyReader = bytes.NewReader(jsonBody)
		}

		req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
		if err != nil {
			return fmt.Errorf("create request: %w", err)
		}

		req.Header.Set("Authorization", "Bearer "+c.token)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Idempotency-Key", fmt.Sprintf("%s-%s-%d", method, path, time.Now().UnixNano()))

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("http request: %w", err)
			continue
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("read response: %w", err)
			continue
		}

		if resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("MP server error %d: %s", resp.StatusCode, string(respBody))
			continue
		}

		if resp.StatusCode >= 400 {
			var mpErr mpErrorResponse
			json.Unmarshal(respBody, &mpErr)
			return fmt.Errorf("MP error %d: %s - %s", resp.StatusCode, mpErr.Error, mpErr.Message)
		}

		if result != nil {
			if err := json.Unmarshal(respBody, result); err != nil {
				return fmt.Errorf("unmarshal response: %w", err)
			}
		}

		return nil
	}

	return fmt.Errorf("max retries exceeded: %w", lastErr)
}
