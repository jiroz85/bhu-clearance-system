# Contributing to BHU Clearance System

Thank you for your interest in contributing to the Bule Hora University Student Clearance System!

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- PostgreSQL 16+
- Docker & Docker Compose (optional)

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-username/bhu-clearance-system.git
cd bhu-clearance-system
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run db:migrate
npm run db:seed
npm run start:dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

4. **Docker Setup (Alternative)**
```bash
docker-compose up -d
```

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages

### Branch Naming
- `feature/your-feature-name` - New features
- `bugfix/your-bug-fix` - Bug fixes
- `hotfix/urgent-fix` - Critical fixes
- `docs/your-docs` - Documentation updates

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(auth): add JWT token refresh mechanism`
- `fix(dashboard): resolve layout issue on mobile`
- `docs(api): update authentication endpoints`

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm run test          # Run all tests
npm run test:coverage # Coverage report
```

### Before Submitting
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] No TypeScript errors
- [ ] Documentation updated if needed
- [ ] Docker build works

## 🏗️ Architecture

### Backend (NestJS)
- **Controllers**: Handle HTTP requests
- **Services**: Business logic
- **Repositories**: Data access
- **DTOs**: Data transfer objects
- **Guards**: Authentication/authorization

### Frontend (React)
- **Components**: Reusable UI components
- **Pages**: Route-level components
- **Hooks**: Custom React hooks
- **Services**: API calls
- **Types**: TypeScript definitions

### Database (PostgreSQL)
- **Migrations**: Schema changes
- **Seeds**: Initial data
- **Models**: Prisma models

## 📝 Documentation

### API Documentation
- API endpoints are documented using Swagger/OpenAPI
- Access at `http://localhost:3000/api/docs` in development

### Code Documentation
- Use JSDoc comments for complex functions
- Document public APIs and interfaces
- Keep README files up to date

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

## 💡 Feature Requests

- Use GitHub Issues for feature requests
- Provide clear use case and requirements
- Consider impact on existing functionality
- Discuss implementation approach

## 🔒 Security

- Never commit sensitive data (API keys, passwords)
- Use environment variables for configuration
- Follow OWASP security guidelines
- Report security issues privately

## 📦 Deployment

### Staging
```bash
# Deploy to staging environment
npm run deploy:staging
```

### Production
```bash
# Deploy to production
npm run deploy:production
```

## 🤝 Code Review Process

1. Create pull request
2. Request review from team members
3. Address feedback
4. Ensure CI/CD passes
5. Merge to main branch

## 📞 Getting Help

- Check existing documentation
- Search existing issues
- Join our Discord/Slack channel
- Contact maintainers

## 🙏 Acknowledgments

Thank you for contributing to making Bule Hora University's clearance system better!
