'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react';

interface Product {
  name: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair';
  images: string[];
}

interface StoreSetupData {
  products: Product[];
  [key: string]: any;
}

interface ProductsStepProps {
  storeData: StoreSetupData;
  updateStoreData: (updates: Partial<StoreSetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  currentStep: number;
  totalSteps: number;
}

const PRODUCT_CONDITIONS = [
  { value: 'new', label: 'New', description: 'Brand new, never used' },
  { value: 'like_new', label: 'Like New', description: 'Used once or twice, excellent condition' },
  { value: 'good', label: 'Good', description: 'Used but in good condition' },
  { value: 'fair', label: 'Fair', description: 'Used with some wear, still functional' }
];

const PRODUCT_CATEGORIES = [
  'Judaica', 'Books', 'Clothing', 'Food', 'Home & Garden', 
  'Electronics', 'Toys & Games', 'Health & Beauty', 'Sports', 'Other'
];

export default function ProductsStep({
  storeData,
  updateStoreData,
  onNext,
  onPrev,
  isSubmitting,
  onSubmit,
  currentStep,
  totalSteps
}: ProductsStepProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    condition: 'good',
    images: []
  });

  const handleAddProduct = () => {
    if (currentProduct.name && currentProduct.description && currentProduct.price > 0) {
      const newProducts = [...storeData.products, currentProduct as Product];
      updateStoreData({ products: newProducts });
      setCurrentProduct({
        name: '',
        description: '',
        price: 0,
        category: '',
        condition: 'good',
        images: []
      });
      setShowAddForm(false);
    }
  };

  const handleEditProduct = (index: number) => {
    setEditingIndex(index);
    setCurrentProduct(storeData.products[index]);
    setShowAddForm(true);
  };

  const handleUpdateProduct = () => {
    if (editingIndex !== null && currentProduct.name && currentProduct.description && currentProduct.price > 0) {
      const newProducts = [...storeData.products];
      newProducts[editingIndex] = currentProduct as Product;
      updateStoreData({ products: newProducts });
      setCurrentProduct({
        name: '',
        description: '',
        price: 0,
        category: '',
        condition: 'good',
        images: []
      });
      setEditingIndex(null);
      setShowAddForm(false);
    }
  };

  const handleDeleteProduct = (index: number) => {
    const newProducts = storeData.products.filter((_, i) => i !== index);
    updateStoreData({ products: newProducts });
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingIndex(null);
    setCurrentProduct({
      name: '',
      description: '',
      price: 0,
      category: '',
      condition: 'good',
      images: []
    });
  };

  const canProceed = storeData.products.length >= 3;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">📦</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Add Your Products
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          List at least 3 products or services to help customers understand what you offer.
        </p>
      </div>

      {/* Product List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Your Products ({storeData.products.length})
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>

        {storeData.products.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-gray-600">No products added yet</p>
            <p className="text-sm text-gray-500">Add your first product to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storeData.products.map((product, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{product.name}</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditProduct(index)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-green-600">${product.price}</span>
                  <span className="text-gray-500 capitalize">{product.condition.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Product Form */}
      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingIndex !== null ? 'Edit Product' : 'Add New Product'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={currentProduct.name}
                onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Silver Mezuzah Case"
              />
            </div>

            {/* Product Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={currentProduct.description}
                onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Describe your product..."
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price ($) *
              </label>
              <input
                type="number"
                value={currentProduct.price}
                onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={currentProduct.category}
                onChange={(e) => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PRODUCT_CONDITIONS.map((condition) => (
                  <button
                    key={condition.value}
                    onClick={() => setCurrentProduct({ ...currentProduct, condition: condition.value as any })}
                    className={`p-3 border-2 rounded-lg text-left transition-all duration-200 ${
                      currentProduct.condition === condition.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{condition.label}</div>
                    <div className="text-xs text-gray-600">{condition.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={editingIndex !== null ? handleUpdateProduct : handleAddProduct}
              disabled={!currentProduct.name || !currentProduct.description || currentProduct.price <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingIndex !== null ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-blue-900">Product Progress</span>
          <span className="text-sm text-blue-700">
            {storeData.products.length}/3 minimum
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((storeData.products.length / 3) * 100, 100)}%` }}
          />
        </div>
        {storeData.products.length >= 3 && (
          <div className="flex items-center mt-2 text-green-600">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span className="text-sm">Minimum products requirement met!</span>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-2">💡 Product Tips</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Add at least 3 products to meet the minimum requirement</li>
          <li>• Use clear, descriptive product names</li>
          <li>• Include relevant details about kosher certification if applicable</li>
          <li>• Set competitive prices to attract customers</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Previous
        </button>
        
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>Next Step</span>
          <span className="text-sm">+300 points</span>
        </button>
      </div>
    </div>
  );
}
