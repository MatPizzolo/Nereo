package tenant

import (
	"time"

	"github.com/google/uuid"
)

type Tenant struct {
	ID                 uuid.UUID `json:"id"`
	Name               string    `json:"name"`
	Slug               string    `json:"slug"`
	OwnerEmail         string    `json:"owner_email"`
	Plan               string    `json:"plan"`
	Timezone           string    `json:"timezone"`
	Settings           Settings  `json:"settings"`
	BufferBetweenSlots int       `json:"buffer_between_slots"`
	Active             bool      `json:"active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type Settings struct {
	OpenTime  string `json:"open_time,omitempty"`  // "08:00"
	CloseTime string `json:"close_time,omitempty"` // "20:00"
}

type CreateTenantRequest struct {
	Name       string `json:"name" binding:"required,min=2,max=255"`
	Slug       string `json:"slug" binding:"required,min=2,max=100"`
	OwnerName  string `json:"owner_name" binding:"required,min=2,max=255"`
	OwnerEmail string `json:"owner_email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=8"`
}

type CreateTenantResponse struct {
	Tenant Tenant `json:"tenant"`
	UserID uuid.UUID `json:"user_id"`
}

type UpdateSettingsRequest struct {
	BufferBetweenSlots *int      `json:"buffer_between_slots,omitempty" binding:"omitempty,min=0,max=30"`
	Settings           *Settings `json:"settings,omitempty"`
}
