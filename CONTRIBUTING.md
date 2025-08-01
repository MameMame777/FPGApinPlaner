# Contributing to FPGA Pin Planner

🎉 Thank you for your interest in contributing to FPGA Pin Planner!

## 🚀 Quick Start

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/FPGApinPlaner.git
   cd FPGApinPlaner
   npm install
   ```

2. **Development**
   ```bash
   npm run dev
   ```

3. **Testing**
   ```bash
   npm run test
   npm run type-check
   ```

## 📋 Development Workflow

### Branch Strategy
- `master` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development
- `hotfix/*` - Critical bug fixes

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add voltage dropdown selection
fix: resolve I/O standard compatibility issue
docs: update README with new features
style: format code with prettier
refactor: reorganize pin validation logic
test: add unit tests for batch operations
chore: update dependencies
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Test Thoroughly**
   ```bash
   npm run test
   npm run type-check
   npm run build
   ```

4. **Submit PR**
   - Use descriptive title and description
   - Link related issues
   - Request review from maintainers

## 🧪 Testing Guidelines

### Unit Tests
- Test individual components and functions
- Use React Testing Library for components
- Aim for >80% coverage

### Integration Tests
- Test component interactions
- Test data flow between components
- Test user workflows

### Example Test Structure
```typescript
describe('PinListTabs', () => {
  it('should filter pins by search query', () => {
    // Arrange
    const pins = mockPins;
    
    // Act
    render(<PinListTabs pins={pins} />);
    fireEvent.change(screen.getByPlaceholderText('Search...'), {
      target: { value: 'A1' }
    });
    
    // Assert
    expect(screen.getByText('A1')).toBeInTheDocument();
  });
});
```

## 📖 Code Style

### TypeScript
- Use strict TypeScript configuration
- Define proper interfaces and types
- Avoid `any` type when possible

### React Components
- Use functional components with hooks
- Implement proper prop types
- Follow component composition patterns

### File Organization
```
src/
├── components/           # React components
│   ├── common/          # Reusable components
│   └── pages/           # Page-specific components
├── services/            # Business logic
├── stores/              # State management
├── types/               # TypeScript definitions
├── utils/               # Helper functions
└── constants/           # Application constants
```

## 🐛 Bug Reports

### Before Submitting
1. Check existing issues
2. Reproduce the bug
3. Test with latest version

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 91]
- Version: [e.g. v1.0.0]
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots about the feature.
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18.x or 20.x
- npm 9.x+

### Environment Variables
Create `.env.local` for local development:
```env
VITE_APP_VERSION=1.0.0
VITE_BUILD_TIME=2025-01-01T00:00:00Z
```

### Editor Configuration
We recommend VS Code with these extensions:
- TypeScript Importer
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint

## 📚 Documentation

### Code Documentation
- Use JSDoc for functions and classes
- Document complex algorithms
- Explain non-obvious code decisions

### README Updates
- Keep feature list current
- Update installation instructions
- Maintain troubleshooting section

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

## 📞 Getting Help

- 💬 **Discussions**: GitHub Discussions
- 🐛 **Issues**: GitHub Issues
- 📧 **Email**: fpga-pin-planner@example.com

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Happy coding! 🚀**
