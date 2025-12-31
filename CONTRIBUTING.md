# Contributing to NeuroVision

Thank you for your interest in contributing to NeuroVision! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Patient safety is our top priority

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Use the bug report template
3. Include:
   - Python version
   - OpenCV version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior

### Suggesting Features

1. Check existing feature requests
2. Describe the use case
3. Explain why it benefits neurosurgical applications

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Add tests if applicable
5. Run linting: `flake8 src/`
6. Run tests: `pytest tests/`
7. Commit: `git commit -m "Add your feature"`
8. Push: `git push origin feature/your-feature`
9. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/NeuroVision.git
cd NeuroVision

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dev dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install
```

## Code Style

- Follow PEP 8
- Use type hints
- Document functions with docstrings
- Maximum line length: 100 characters

```python
def example_function(
    param1: str,
    param2: int = 10
) -> Dict[str, Any]:
    """
    Brief description.
    
    Args:
        param1: Description of param1
        param2: Description of param2
        
    Returns:
        Description of return value
        
    Raises:
        ValueError: When param1 is empty
    """
    pass
```

## Testing

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=neurovision tests/

# Run specific test
pytest tests/test_segmentation.py -v
```

## Documentation

- Update docstrings for API changes
- Update README if adding features
- Add examples for new functionality

## Medical Safety Guidelines

When contributing medical/surgical features:

1. **Do not** make clinical recommendations
2. **Always** include safety warnings
3. **Never** bypass safety checks
4. **Document** limitations clearly
5. **Test** edge cases thoroughly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
