package payment

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

// VerifyWebhookSignature validates the HMAC signature from Mercado Pago.
// MP sends: x-signature: ts=<ts>,v1=<hash>
// The signed content is: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
func VerifyWebhookSignature(xSignature, xRequestID, dataID, secret string) error {
	if secret == "" {
		return nil // skip verification if no secret configured (dev mode)
	}

	parts := parseSignatureHeader(xSignature)
	ts, ok := parts["ts"]
	if !ok {
		return fmt.Errorf("missing ts in x-signature")
	}
	v1, ok := parts["v1"]
	if !ok {
		return fmt.Errorf("missing v1 in x-signature")
	}

	// Build the manifest string as per MP docs
	manifest := fmt.Sprintf("id:%s;request-id:%s;ts:%s;", dataID, xRequestID, ts)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(manifest))
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expected), []byte(v1)) {
		return fmt.Errorf("invalid webhook signature")
	}

	return nil
}

func parseSignatureHeader(header string) map[string]string {
	result := make(map[string]string)
	for _, part := range strings.Split(header, ",") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) == 2 {
			result[kv[0]] = kv[1]
		}
	}
	return result
}
