# Insurance Claims Portal

A full-stack Insurance Claim application built with Next.js 15 (React) frontend and Java Spring Boot backend with MongoDB.

## Features

- **Claims Management**: Submit, view, update, and delete insurance claims
- **Dashboard**: Overview with statistics and recent claims
- **Google OAuth Authentication**: Secure login with Google
- **Admin Module**: Configure UI labels and static content
- **Edit Feature**: Inline editing of UI labels and content for all pages
- **Claim Types**: Auto, Health, Property, and Life insurance claims
- **Status Tracking**: Pending, Under Review, Approved, Rejected

## Tech Stack

### Frontend
- Next.js 15 with TypeScript
- React 19
- Tailwind CSS
- Lucide React Icons

### Backend
- Java 17
- Spring Boot 3.2
- Spring Security with OAuth2
- Spring Data MongoDB
- Lombok

### Database
- MongoDB

## Project Structure

```
insurance-claim-app/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   │   ├── dashboard/   # Dashboard page
│   │   │   ├── claims/      # Claims list and details
│   │   │   ├── admin/       # Admin settings
│   │   │   └── login/       # Login page
│   │   ├── components/      # Reusable components
│   │   ├── lib/             # API client
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── backend/                  # Spring Boot backend
│   ├── src/main/java/com/insurance/claims/
│   │   ├── config/          # Security and CORS config
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Data transfer objects
│   │   ├── model/           # MongoDB documents
│   │   ├── repository/      # MongoDB repositories
│   │   └── service/         # Business logic
│   └── pom.xml
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17+
- Maven 3.8+
- MongoDB 6.0+
- Google OAuth credentials

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and Google OAuth credentials
   ```

3. Update `application.yml` with your configuration:
   ```yaml
   spring:
     data:
       mongodb:
         uri: mongodb://localhost:27017/insurance_claims
     security:
       oauth2:
         client:
           registration:
             google:
               client-id: your-google-client-id
               client-secret: your-google-client-secret
   ```

4. Build and run:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

The backend will start on `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

The frontend will start on `http://localhost:3000`

## API Endpoints

### Claims
- `GET /api/claims` - List all claims
- `GET /api/claims/{id}` - Get claim by ID
- `POST /api/claims` - Create new claim
- `PUT /api/claims/{id}` - Update claim
- `PATCH /api/claims/{id}/status` - Update claim status
- `DELETE /api/claims/{id}` - Delete claim
- `GET /api/claims/stats` - Get dashboard statistics

### UI Configuration
- `GET /api/config` - List all configurations
- `GET /api/config/{pageId}` - Get configuration by page ID
- `PUT /api/config` - Update configuration

### Authentication
- `GET /api/auth/user` - Get authenticated user
- `GET /oauth2/authorization/google` - Initiate Google OAuth

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth Client ID
5. Configure OAuth consent screen
6. Add authorized redirect URI: `http://localhost:8080/login/oauth2/code/google`
7. Copy Client ID and Client Secret to your configuration

## Admin Features

The Admin module allows administrators to:
- Edit UI labels for all pages
- Modify static content (welcome messages, instructions, etc.)
- Add new labels and content dynamically
- Changes are stored in MongoDB and applied immediately

## Edit Feature

All pages support inline editing:
1. Click "Edit Page" button on any page
2. Hover over editable labels to see edit icon
3. Click to edit, then save or cancel
4. Changes persist to database

## License

MIT
