import React from 'react'

// Sample components for testing
const Button = ({ children, variant = 'primary', size = 'md', ...props }: any) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  )
}

const Card = ({ title, children, ...props }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" {...props}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      {children}
    </div>
  )
}

const Input = ({ label, error, ...props }: any) => {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

const Badge = ({ children, variant = 'default', ...props }: any) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  }
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
      {...props}
    >
      {children}
    </span>
  )
}

const Alert = ({ children, type = 'info', ...props }: any) => {
  const types = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200'
  }
  
  return (
    <div
      className={`border rounded-lg p-4 ${types[type]}`}
      {...props}
    >
      {children}
    </div>
  )
}

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export const componentExamples = [
  {
    name: 'Primary Button',
    description: 'Standard primary button with hover and focus states',
    category: 'buttons',
    code: `<Button variant="primary">Click me</Button>`,
    scope: { Button }
  },
  {
    name: 'Button Variants',
    description: 'Different button styles for various use cases',
    category: 'buttons',
    code: `<div className="space-x-2">
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="danger">Danger</Button>
  <Button variant="success">Success</Button>
</div>`,
    scope: { Button }
  },
  {
    name: 'Button Sizes',
    description: 'Buttons in different sizes',
    category: 'buttons',
    code: `<div className="space-x-2">
  <Button size="sm">Small</Button>
  <Button size="md">Medium</Button>
  <Button size="lg">Large</Button>
</div>`,
    scope: { Button }
  },
  {
    name: 'Form Input',
    description: 'Text input with label and error handling',
    category: 'forms',
    code: `<div className="space-y-4">
  <Input label="Email" placeholder="Enter your email" />
  <Input label="Password" type="password" placeholder="Enter your password" />
  <Input label="Username" error="Username is required" />
</div>`,
    scope: { Input }
  },
  {
    name: 'Card Component',
    description: 'Reusable card component with title and content',
    category: 'cards',
    code: `<Card title="Sample Card">
  <p className="text-gray-600 mb-4">This is a sample card component with some content.</p>
  <Button variant="primary">Action</Button>
</Card>`,
    scope: { Card, Button }
  },
  {
    name: 'Badge Collection',
    description: 'Various badge styles for status indicators',
    category: 'cards',
    code: `<div className="space-x-2">
  <Badge variant="default">Default</Badge>
  <Badge variant="primary">Primary</Badge>
  <Badge variant="success">Success</Badge>
  <Badge variant="warning">Warning</Badge>
  <Badge variant="danger">Danger</Badge>
</div>`,
    scope: { Badge }
  },
  {
    name: 'Alert Messages',
    description: 'Alert components for different message types',
    category: 'cards',
    code: `<div className="space-y-3">
  <Alert type="info">This is an informational message.</Alert>
  <Alert type="success">Operation completed successfully!</Alert>
  <Alert type="warning">Please review your input before proceeding.</Alert>
  <Alert type="error">An error occurred. Please try again.</Alert>
</div>`,
    scope: { Alert }
  },
  {
    name: 'Modal Dialog',
    description: 'Modal component with backdrop and close functionality',
    category: 'modals',
    code: `function ModalExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Sample Modal">
        <p className="text-gray-600 mb-4">This is a sample modal dialog.</p>
        <div className="flex space-x-2">
          <Button variant="primary" onClick={() => setIsOpen(false)}>Confirm</Button>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}

render(<ModalExample />)`,
    scope: { Modal, Button, React }
  },
  {
    name: 'Navigation Bar',
    description: 'Simple navigation bar with logo and menu items',
    category: 'navigation',
    code: `<nav className="bg-white shadow-sm border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between h-16">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900">JewGo</h1>
        </div>
        <div className="hidden md:ml-6 md:flex md:space-x-8">
          <a href="#" className="text-gray-900 hover:text-gray-500 px-3 py-2 text-sm font-medium">Home</a>
          <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">Restaurants</a>
          <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">About</a>
          <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">Contact</a>
        </div>
      </div>
      <div className="flex items-center">
        <Button variant="primary">Sign In</Button>
      </div>
    </div>
  </div>
</nav>`,
    scope: { Button }
  },
  {
    name: 'Layout Grid',
    description: 'Responsive grid layout with cards',
    category: 'layout',
    code: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card title="Card 1">
    <p className="text-gray-600">This is the first card in the grid.</p>
  </Card>
  <Card title="Card 2">
    <p className="text-gray-600">This is the second card in the grid.</p>
  </Card>
  <Card title="Card 3">
    <p className="text-gray-600">This is the third card in the grid.</p>
  </Card>
</div>`,
    scope: { Card }
  }
]
