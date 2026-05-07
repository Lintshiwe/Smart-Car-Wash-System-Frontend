<p align="center">
  <img src="./Smart-Car-Wash-System-Frontend/app/public/images/logo.png" alt="INT216D Logo" width="120" />
</p>

# INT216D Smart Car Wash System

A full-stack car wash booking platform — Spring Boot microservices backend + vanilla HTML/CSS/JS frontend.

---

## Quick Start

### Prerequisites
- **Java 21** (`java -version`)
- **Maven 3** (`mvn -version`)
- **Podman** or **Docker** (for database, Redis, Kafka)
- **Python 3** (to serve frontend)
- **Gmail App Password** (for email — see [Email Setup](#email-setup))

---

## 1. Start Infrastructure (Docker/Podman)

```bash
cd Smart-Car-Wash-System-Backend

# Pull and start PostgreSQL, Redis, MailHog, Kafka
podman pull docker.io/library/postgres:16-alpine
podman pull docker.io/library/redis:7-alpine
podman pull docker.io/confluentinc/cp-kafka:7.6.0
podman pull docker.io/mailhog/mailhog:latest

podman-compose up -d postgres redis mailhog kafka
```

Verify containers:
```bash
podman ps --filter "name=int216d"
# Should show: postgres (healthy), redis (healthy), kafka, mailhog
```

---

## 2. Configure Environment

Create `.env` in `Smart-Car-Wash-System-Backend/`:

```env
DB_URL=jdbc:postgresql://localhost:5432/int216d_carwash
DB_USER=dev
DB_PASSWORD=dev
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_MIN_32_BYTES
JWT_ACCESS_EXPIRY_MS=28800000
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_ADDRESS=your_email@gmail.com
MAIL_FROM_NAME=INT216D Smart Car Wash
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS=true
```

---

## 3. Build & Run Backend

```bash
cd Smart-Car-Wash-System-Backend

# Build all modules
mvn clean install -DskipTests

# Start each service (in separate terminals):

# Auth Service (port 8085) — uses PostgreSQL
export $(cat .env | xargs)
mvn -pl auth-service spring-boot:run -Dspring-boot.run.profiles=local

# Client Service (port 8082)
mvn -pl client-service spring-boot:run

# Booking Service (port 8083)
mvn -pl booking-service spring-boot:run

# API Gateway (port 8080)
mvn -pl api-gateway spring-boot:run
```

**Verify:** `curl http://localhost:8080/actuator/health` should return `{"status":"UP"}`

---

## 4. Serve Frontend

```bash
cd Smart-Car-Wash-System-Frontend/app
python3 -m http.server 3000
```

Open **http://localhost:3000**

---

## 5. Create Admin User

Register via the login page, then promote to ADMIN:

```bash
# Register admin account
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@int216d.com","password":"Admin@123"}'

# Promote to ADMIN role (via PostgreSQL)
PGPASSWORD=dev psql -h localhost -U dev -d int216d_carwash \
  -c "UPDATE auth_schema.users SET role = 'ADMIN' WHERE email ILIKE '%admin%';"
```

Then visit **http://localhost:3000/admin.html**

---

## Email Setup

This project sends real emails via **Gmail SMTP**. To configure:

1. Go to https://myaccount.google.com/apppasswords
2. Generate an App Password for "Mail"
3. Set `MAIL_USERNAME` and `MAIL_PASSWORD` in `.env`
4. Emails are sent **asynchronously** — APIs respond instantly, emails deliver in background

Emails sent for:
- OTP verification codes
- Password reset codes
- Booking confirmations
- Membership subscription / renewal / upgrade
- Expiry warnings (1, 3, 7 days before)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend :3000                     │
│  index.html → login.html → profile.html               │
│  membership.html → checkout.html → admin.html         │
│  book-bay-wash.html → book-mobile-wash.html           │
└──────────────────┬──────────────────────────────────┘
                   │ REST API
                   ▼
┌─────────────────────────────────────────────────────┐
│               API Gateway :8080                       │
│  Routes /api/v1/auth/*     → auth-service :8085       │
│  Routes /api/v1/clients/*  → client-service :8082     │
│  Routes /api/v1/bookings/* → booking-service :8083    │
│  Routes /api/v1/membership/* → booking-service :8083  │
│  Routes /api/v1/admin/*    → booking-service :8083    │
│  Routes /api/v1/catalogue/* → booking-service :8083   │
└──────────────────┬──────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│ Auth    │  │ Client   │  │ Booking  │
│ Service │  │ Service  │  │ Service  │
│ :8085   │  │ :8082    │  │ :8083    │
│ (PG)    │  │ (H2)     │  │ (H2)     │
└────┬────┘  └──────────┘  └────┬─────┘
     │                          │
     ▼                          ▼
┌─────────┐              ┌──────────┐
│PostgreSQL│             │   Kafka   │
│  :5432   │             │  :9092    │
└─────────┘              └──────────┘
     │
     ▼
┌─────────┐  ┌──────────┐
│  Redis  │  │ MailHog  │
│  :6379  │  │ :1025    │
└─────────┘  └──────────┘
```

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/index.html` | Landing page with hero, services, membership |
| Login | `/login.html` | Sign in, register, forgot password |
| Profile | `/profile.html` | User details, membership, payments, addresses |
| Membership | `/membership.html` | Plans, pricing, join via checkout |
| Checkout | `/checkout.html` | Card payment form + animated receipt |
| Book Bay | `/book-bay-wash.html` | Bay wash booking form |
| Book Mobile | `/book-mobile-wash.html` | Mobile wash booking form |
| Services | `/services.html` | All services catalogue |
| Pricing | `/pricing.html` | Package pricing |
| About | `/about.html` | Company info |
| Contact | `/contact.html` | Contact form |
| FAQ | `/faq.html` | Frequently asked questions |
| Admin | `/admin.html` | Admin dashboard (ADMIN only) |

---

## Scheduled Tasks

| Time | Task |
|------|------|
| 8:00 AM | Send expiry warning emails (1/3/7 days before) |
| 12:30 AM | Mark expired memberships |
| 3:00 AM | Auto-renew eligible memberships |

---

## Troubleshooting

**"Port already in use"**
```bash
sudo kill $(ss -tlnp | grep <PORT> | grep -oP 'pid=\K\d+')
```

**"Authentication required" on payments**
- Log out and log in fresh — tokens become invalid after service restart
- Until booking-service uses PostgreSQL, its H2 database resets on restart

**"Unknown service code"**
- Booking forms now use proper catalogue codes: `BASIC_WASH`, `DELUXE_WASH`, etc.

**Email not sending**
- Check Gmail App Password is correct
- Check `.env` has `MAIL_SMTP_AUTH=true` and `MAIL_SMTP_STARTTLS=true`
- Emails are async — API responds before email sends
