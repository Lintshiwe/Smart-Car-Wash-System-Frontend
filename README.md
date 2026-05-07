<p align="center">
  <img src="./app/public/images/logo.png" alt="INT216D Logo" width="120" />
</p>

# INT216D Smart Car Wash System — Frontend

A premium automotive care booking platform. Users can sign up, book bay or mobile washes, subscribe to membership plans, manage their profile, and track payments — all through a modern, animated dark/light theme interface.

## Features

- **User Authentication** — Register, login, email OTP verification, forgot password with Gmail
- **Profile Management** — Edit personal details, saved addresses, payment history
- **Bookings** — Bay wash & mobile wash with service options (bring car/collection), pricing tiers
- **Membership** — Subscribe to plans (Basic → VIP), auto-renew, credits, expiry reminders
- **Checkout** — Card payment form with animated receipt printing, demo gateway
- **Admin Dashboard** — Membership analytics, plan management, status breakdowns
- **Guest Booking** — Book without an account
- **Real Emails** — Gmail SMTP for OTP, password reset, booking confirmation, membership, expiry reminders
- **Responsive** — Works on mobile and desktop

## Tech Stack

- HTML5, CSS3, JavaScript (ES6 modules)
- Three.js for 3D hero background
- GSAP for scroll animations
- Connected to Spring Boot microservices backend via API Gateway (port 8080)

## Quick Start

```bash
cd app
python3 -m http.server 3000
# Open http://localhost:3000
```

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Landing page with hero, services, membership, booking sections |
| `login.html` | Login / Register / Forgot Password |
| `profile.html` | User profile, membership status, payment history, addresses |
| `membership.html` | Plans, pricing, subscribe via checkout |
| `checkout.html` | Card payment form + animated receipt |
| `book-bay-wash.html` | Bay wash booking form |
| `book-mobile-wash.html` | Mobile wash booking form |
| `services.html` | All services catalogue |
| `pricing.html` | Package pricing |
| `about.html` | About the company |
| `contact.html` | Contact form |
| `faq.html` | Frequently asked questions |
| `admin.html` | Admin dashboard |
