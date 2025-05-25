# Tanque Cheio - Fuel Price Collection System

A robust backend system for collecting, processing, and managing fuel prices from Brazil's ANP (National Petroleum Agency) database. The system automatically downloads weekly Excel reports, processes data for Northeast region, and stores structured information about gas stations and fuel prices.

Built using **NestJS**, **TypeORM**, **PostgreSQL**, and **Excel processing** capabilities, following **CLEAN Architecture** principles.

---

## Features

### Automated Data Collection
- Weekly automated download of ANP Excel reports
- Scheduled processing every Monday at 6 AM
- Manual processing capabilities for specific files
- Smart URL generation based on current date patterns

### Data Processing
- Excel file parsing and validation
- Northeast region filtering (9 states: CE, PE, BA, RN, PB, SE, AL, MA, PI)
- Batch processing for optimal performance
- Duplicate detection and prevention

### Gas Station Management
- Automatic gas station registration from ANP data
- CNPJ-based station identification
- Address normalization and geocoding preparation
- Brand and location tracking

### Fuel Price Tracking
- Multiple fuel types support (Gasoline, Ethanol, Diesel, CNG)
- Historical price tracking
- Survey date management
- Price validation and normalization

### Background Jobs
- Automated weekly data collection using cron jobs
- Asynchronous geocoding for station coordinates
- Error handling and logging system

---

## Architecture

This project follows **CLEAN Architecture**:

```

src/
├── domain/               # Core business logic (e.g. ranking service)
├── application/          # Use-cases (create/update/query logic)
├── infrastructure/       # DB entities and TypeORM implementations

```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- pnpm (recommended) or npm

### Install dependencies

```bash
pnpm install
```

