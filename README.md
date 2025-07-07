# NextNonce Backend

Welcome to the backend repository for the NextNonce Crypto Portfolio Tracker application.

For more detailed documentation, including API specifications and architectural deep-dives, please visit official documentation site: **[NextNonce Docs](https://docs.nextnonce.com/developer/backend/)**

## ✨ Features

* **Multi-Chain Support**: Tracks assets across 15 of the most popular EVM blockchains:
    * Arbitrum, Avalanche, Base, BNB, Ethereum, Fantom, Flare, Gnosis, Linea, Mantle, Metis, Optimism, Polygon, Scroll, and ZkSync.
* **Comprehensive Wallet Support**: Fetches balances for both **Simple**(EOA) and **Smart** wallets.
* **Unified Token View**: A standout feature that consolidates popular tokens (like ETH, USDC, USDT) from across all supported networks. It presents an aggregated total balance for each unified token, while also allowing users to see the specific balance on each individual chain.
* **Robust Authentication**: All API endpoints are secured. Requests must include a valid JWT issued for the [NextNonce mobile application](https://github.com/NextNonce/Mobile).
* **Provider-Based Architecture**: Core functionalities like authentication, database interaction, balance fetching, and caching are abstracted behind interfaces, making the system modular and easy to extend with new providers.
* **Advanced Caching**: Implements sophisticated caching strategies using Redis to ensure high performance and low latency for frequently accessed data.
* **Rate Limiting**: Protects the application and its underlying data providers from abuse and ensures service stability.
* **Detailed Logging & Tracing**: Integrated with New Relic for performance monitoring and structured logging for easier debugging.


## 🛠️ Tech Stack

The backend is built with a modern, robust, and scalable technology stack:

* **Framework**: [NestJS](https://nestjs.com/) (v11)
* **Language**: [TypeScript](https://www.typescriptlang.org/) (v5)
* **Database**: [PostgreSQL](https://www.postgresql.org/) managed via [Supabase](https://supabase.com/)
* **ORM**: [Prisma](https://www.prisma.io/)
* **Authentication**: [Supabase Auth](https://supabase.com/auth), with JWTs handled by `passport-jwt`.
* **Caching**: [Redis](https://redis.io/) via `ioredis`.
* **API Specification**: [OpenAPI (Swagger)](https://swagger.io/)
* **Testing**: [Jest](https://jestjs.io/) for both unit and end-to-end (e2e) tests.
* **Containerization**: [Docker](https://www.docker.com/) & Docker Compose.
* **Key Libraries**:
    * `axios` for HTTP requests to external data providers (e.g., OKX DEX).
    * `class-validator` & `class-transformer` for robust DTO validation.
    * `rate-limiter-flexible` for implementing rate-limiting strategies.
    * `newrelic` for application performance monitoring.


## 🏗️ Architecture Overview

The backend is designed as a modular, service-oriented application following the principles of clean architecture.

* **Modularity**: The application is divided into feature-specific modules (e.g., `User`, `Portfolio`, `Wallet`, `Balance`, `Token`). Each module encapsulates its own logic, controllers, services, and DTOs. This separation of concerns makes the codebase easier to maintain, test, and scale.
* **Provider Abstraction**: A core architectural pattern is the use of provider interfaces. For instance:
    * `AuthProvider` (`/src/auth/interfaces/auth-provider.interface.ts`) abstracts the authentication logic, with `SupabaseAuthProvider` being the concrete implementation.
    * `BalanceProvider` (`/src/balance/interfaces/balance-provider.interface.ts`) defines the contract for fetching wallet balances, currently implemented by `OkxDexBalanceProvider`.
    * `CacheProvider` (`/src/cache/interfaces/cache-provider.interface.ts`) abstracts caching operations, with `RedisCacheProvider` providing the implementation.
      This design allows for swapping out providers (e.g., moving from Supabase to another auth service, or adding a new balance data source) with minimal changes to the core application logic.
* **Database & ORM**: Prisma serves as the interface to the PostgreSQL database. The schema is defined in `prisma/schema.prisma`, and migrations are managed by the Prisma CLI.
* **Configuration & Environment**: The `@nestjs/config` module is used for managing environment variables, allowing for different configurations across development, testing, and production environments.
* **Request Lifecycle**:
    1.  An incoming request first hits the global middleware and guards.
    2.  The `JwtAuthGuard` validates the JWT token.
    3.  A custom `UserInterceptor` retrieves user details from the database based on the token and attaches it to the request object.
    4.  The request is routed to the appropriate controller and handler.
    5.  Services are called to execute business logic, interacting with the database, cache, and external providers as needed.
    6.  A global `AllExceptionsFilter` catches any unhandled errors and formats them into a standardized response.


## 🚀 Getting Started

Follow these instructions to get the backend running locally for development and testing.

### Prerequisites

* [Node.js](https://nodejs.org/en/) (v22 or higher recommended)
* [Yarn](https://yarnpkg.com/)
* [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose
* Access to a Supabase project
* A Redis instance

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/NextNonce/Backend.git
    cd backend
    ```

2.  **Install dependencies:**

    ```bash
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file by copying the example file.

    ```bash
    cp .env.example .env
    ```

    Populate the `.env` file with your credentials for Supabase, Redis, and any other required services.

4.  **Set up the database:**
    Apply the Prisma migrations to your database.

    ```bash
    npx prisma migrate dev
    ```

### Running the Application

* **Development mode with auto-reloading:**

  ```bash
  yarn start:dev
  ```

* **Production build & run:**

  ```bash
  yarn build
  yarn start:prod
  ```

* **Using Docker Compose:**
  The `docker-compose.yml` is configured to run the application along with its dependencies like Redis.

  ```bash
  docker compose up --build -d
  ```


## 🧪 Testing

The application includes both unit tests and end-to-end (e2e) tests.

* **Run all tests:**
  ```bash
  yarn test
  ```
* **Run unit tests with coverage report:**
  ```bash
  yarn test:cov
  ```
* **Run e2e tests:**
  *Ensure the testing database and other services are running before executing e2e tests.*
  ```bash
  yarn test:e2e
  ```


## 📖 API

All API endpoints require authentication via a JWT Bearer token in the `Authorization` header.

The complete API contract is documented using the OpenAPI standard.

* **Swagger UI**: When the application is running in development mode, you can access the interactive Swagger UI at `http://localhost:3000/v1/docs` or you can visit documentation [NextNonce API](https://docs.nextnonce.com/developer/backend/reference/).
* **Static Specification**: A generated `openapi.json` file is available in the `/static` directory for tooling and integration purposes.

## 📂 Project Structure

A brief overview of the key directories in this project:

```
.
├── src/                    # Main application source code
│   ├── auth/               # Authentication logic, guard, strategies
│   ├── balance/            # Balance fetching and aggregation logic
│   ├── cache/              # Caching service and provider
│   ├── chain/              # Chain-related service and mapper
│   ├── portfolio/          # Portfolio management
│   ├── portfolio-wallet/   # Logic for wallets within portfolios
│   ├── price/              # Price service
│   ├── token/              # Token and unified token
│   ├── user/               # User management
│   ├── wallet/             # Wallet management and utilities
│   ├── main.ts             # Application entry point
│   └── app.module.ts       # Root application module
├── prisma/                 # Prisma schema and migration files
├── test/                   # End-to-end (e2e) tests and mocks
├── Dockerfile              # Docker build instructions
├── docker-compose.yml      # Docker Compose setup
└── package.json            # Project dependencies and scripts
```

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for more details.