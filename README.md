# VaultUI - Component Playground & Library Manager

A modern, full-stack component playground and library management system built with Next.js, TypeScript, and tRPC. Create, edit, preview, and manage reusable UI components with live preview, version control, and integrated terminal support.

## 🚀 Tech Stack

### Core Framework
- **Next.js 16.1.4** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript 5** - Type-safe development

### Backend & API
- **tRPC 11.0.0** - End-to-end typesafe APIs
- **Prisma 5.22.0** - Next-generation ORM
- **PostgreSQL** - Relational database
- **SuperJSON** - Enhanced JSON serialization

### UI & Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Framer Motion** - Animation library
- **next-themes** - Dark/light mode support

### Development Tools
- **Monaco Editor** - VS Code editor in the browser
- **WebContainer API** - Browser-based Node.js runtime
- **Babel Standalone** - JSX/TSX transpilation in browser
- **TanStack React Query** - Data fetching and caching
- **Zod** - Schema validation

## ✨ Features

### Component Management
- **Create & Edit Components** - Support for React, Next.js, Vue, HTML, CSS, and JavaScript
- **Multi-file Support** - Manage multiple files per component (HTML, CSS, JS, TSX, JSX)
- **Framework Auto-detection** - Automatically detects framework and language from code
- **Component Collections** - Organize components into hierarchical collections
- **Status Management** - Mark components as "experiment" or "ready"

### Code Editor
- **Monaco Editor Integration** - Full-featured code editor with syntax highlighting
- **TypeScript Support** - Auto-completion and type checking
- **Dynamic Type Definitions** - Automatically recognizes packages installed via terminal
- **Multi-tab Interface** - Switch between multiple files seamlessly
- **Auto-save Detection** - Tracks unsaved changes intelligently

### Live Preview
- **Real-time Preview** - See changes instantly as you type
- **Framework Support** - Preview React, Next.js, Vue, HTML components
- **Console Logging** - View console output from preview
- **Error Display** - Clear error messages for debugging
- **Responsive Preview** - Test components at different sizes

### Version Control
- **Version History** - Track all versions of your components
- **Version Comparison** - Switch between versions easily
- **Smart Saving** - Choose to replace current version or create new version
- **Version Renumbering** - Automatic renumbering when versions are deleted
- **Version Deletion** - Remove old versions with automatic cleanup

### Terminal Integration
- **WebContainer Terminal** - Full Node.js terminal in the browser
- **Package Installation** - Install npm packages directly in the playground
- **Auto-sync with Editor** - Installed packages automatically recognized by Monaco Editor
- **Command History** - Track terminal commands and output
- **Spinner Animation** - Proper handling of loading indicators

### Static Previews
- **Thumbnail Generation** - Automatic preview thumbnails for components
- **Dashboard View** - Grid and list views of all components
- **Hover Previews** - Quick preview on hover
- **Collection Filtering** - Filter by collection, framework, or status

### Advanced Features
- **Resizable Panels** - Drag to resize editor and preview panels
- **Keyboard Shortcuts** - Quick actions via keyboard
- **Search & Filter** - Find components quickly
- **Dark/Light Mode** - Theme support
- **Responsive Design** - Works on all screen sizes

## 📁 Project Structure

```
VaultUI/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/trpc/          # tRPC API routes
│   │   ├── component/[id]/    # Component editor pages
│   │   └── page.tsx           # Main dashboard
│   ├── components/
│   │   ├── editor/            # Code editor components
│   │   ├── preview/           # Preview components
│   │   ├── grid/              # Component grid/cards
│   │   ├── layout/           # Layout components
│   │   └── ui/               # Reusable UI components
│   ├── lib/                   # Utility libraries
│   │   ├── detect-framework.ts
│   │   ├── monaco-types.ts
│   │   ├── preview-runtime-generator.ts
│   │   └── use-webcontainer.ts
│   ├── server/
│   │   ├── api/              # tRPC routers
│   │   │   ├── routers/
│   │   │   │   ├── component.ts
│   │   │   │   ├── collection.ts
│   │   │   │   └── version.ts
│   │   │   └── trpc.ts
│   │   └── db.ts             # Prisma client
│   └── providers/            # React context providers
├── prisma/
│   └── schema.prisma         # Database schema
└── public/                    # Static assets
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm, yarn, pnpm, or bun"

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VaultUI
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/vaultui"
   DIRECT_URL="postgresql://user:password@localhost:5432/vaultui"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Usage

 Creating a Component

1. Click the "Add Component" button on the dashboard
2. Enter a title and description
3. Add files using the file tabs (HTML, CSS, JS, TSX, JSX)
4. Write your component code
5. Save to create version 1

### Editing Components

1. Click on any component card to open the playground
2. Edit code in the Monaco editor
3. See live preview update in real-time
4. Use the terminal to install packages
5. Save changes (creates new version or replaces current)

### Managing Versions

- **View Versions**: Use the version dropdown in the header
- **Switch Versions**: Select any version to view its code
- **Delete Versions**: Click the trash icon next to any version
- **Save Options**: When modifying the latest version, choose to:
  - Create New Version: Keeps current version, creates new one
  - Replace Current Version: Updates the existing version

### Using the Terminal

1. Open the terminal tab at the bottom of the preview panel
2. Install packages: `npm i package-name`
3. Packages are automatically recognized by the editor
4. Run any Node.js commands as needed

### Organizing with Collections

1. Create collections from the sidebar
2. Add components to collections
3. Filter by collection on the dashboard
4. Organize components hierarchically

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Management

- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma generate` - Generate Prisma Client

## 🏗️ Architecture

This project follows the **T3 Stack** pattern:
- **Next.js** for full-stack React framework
- **tRPC** for type-safe API layer
- **Prisma** for database ORM
- **TypeScript** for type safety

### Key Design Decisions

- **Monorepo Structure**: Frontend and backend in single Next.js app
- **Type Safety**: End-to-end TypeScript with tRPC
- **Component-Based**: Modular, reusable component architecture
- **Real-time Preview**: Instant feedback for developers
- **Version Control**: Built-in versioning system for components

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

The app can be deployed to any platform supporting Next.js:
- **Netlify**
- **Railway**
- **Render**
- **AWS Amplify**
- **Self-hosted** (Docker, etc.)

### Environment Variables

Make sure to set these in your deployment platform:
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (for migrations)

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [WebContainer API](https://webcontainers.io)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using the T3 Stack
