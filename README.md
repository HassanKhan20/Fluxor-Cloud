# Fluxor Cloud

**AI-Powered Operations Management for Small Convenience Stores**

Fluxor Cloud is a modern web application that helps convenience store owners manage their inventory, track sales, process invoices, and get AI-powered insights — all from one beautiful dashboard.

![Fluxor Cloud](https://via.placeholder.com/800x400?text=Fluxor+Cloud+Dashboard)

## 🚀 Features

- **Smart Inventory Management** - Real-time stock tracking with automatic low-stock alerts
- **Sales Analytics** - Beautiful charts and actionable insights
- **Invoice OCR** - Upload supplier invoices and extract data automatically
- **AI Assistant** - Ask questions in plain English about your store
- **Demand Forecasting** - AI-powered predictions to optimize stock levels

## 🛠 Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** - Lightning fast build tool
- **Tailwind CSS 4** - Utility-first styling
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icons
- **Recharts** - Data visualization

### Backend
- **Node.js** + **Express**
- **TypeScript**
- **Prisma ORM** - Database toolkit
- **SQLite** (dev) / **PostgreSQL** (prod)
- **JWT** - Authentication

## 📁 Project Structure

```
fluxor-cloud/
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── FeatureCard.tsx
│   │   │   └── Footer.tsx
│   │   ├── pages/          # Route pages
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Products.tsx
│   │   │   ├── Sales.tsx
│   │   │   └── Invoices.tsx
│   │   ├── lib/            # Utilities
│   │   ├── types/          # TypeScript types
│   │   └── index.css       # Global styles & design system
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── lib/            # Shared utilities
│   │   └── types/          # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
└── README.md
```

## 🎨 Design System

### Colors
- **Primary:** `#005CFF` (Electric Blue)
- **Dark:** `#0B0B0B` (Almost Black)
- **Light:** `#F9FAFB` (Light Grey)
- **Accent Gold:** `#FECF33`
- **Accent Gray:** `#6B7280`

### Typography
- **Font:** Inter (via system fonts)
- **Headings:** Bold, modern, large
- **Body:** Readable, neutral

### Components
All components are designed with:
- Smooth transitions and hover effects
- Focus states for accessibility
- Mobile-first responsive design
- Consistent spacing rhythm

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HassanKhan20/Fluxor-Cloud.git
   cd Fluxor-Cloud
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend (.env)
   DATABASE_URL="file:./dev.db"
   PORT=3001
   JWT_SECRET="your-secret-key"

   # Frontend (.env)
   VITE_API_URL="http://localhost:3001/api"
   ```

4. **Initialize the database**
   ```bash
   cd backend
   npx prisma db push
   npx prisma generate
   ```

5. **Start the development servers**

   Terminal 1 (Backend):
   ```bash
   cd backend
   npm run dev
   ```

   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📋 Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Backend
- `npm run dev` - Start development server
- `npm run start` - Start production server

## 🔐 Authentication

The app uses JWT-based authentication:
1. **Sign Up** - Create account + store in one flow
2. **Login** - Email/password authentication
3. **Protected Routes** - Dashboard pages require valid token

## 📱 Responsive Design

All pages are fully responsive:
- Mobile-first approach
- Breakpoints: 480px, 768px, 1024px, 1280px
- Hamburger navigation on mobile
- Touch-friendly spacing

## 🎯 Future Roadmap

- [ ] Dark mode toggle
- [ ] Multi-language support (i18n)
- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Advanced AI forecasting

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ for small business owners
