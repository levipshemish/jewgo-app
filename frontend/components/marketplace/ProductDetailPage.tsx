'use client';

import { ArrowLeft, Star, ShoppingCart, Heart, Share2, Truck, Shield, Clock, MapPin, Phone, Globe } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Header } from '@/components/layout';
import { BottomNavigation } from '@/components/navigation/ui';
import { MarketplaceAPI } from '@/lib/api/marketplace';
import { MarketplaceListing } from '@/lib/types/marketplace';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  
  const [product, setProduct] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isInWishlist, setIsInWishlist] = useState(false);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const productData = await MarketplaceAPI.getProduct(productId);
      setProduct(productData);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    // Add to cart logic
    // eslint-disable-next-line no-console
    console.log('Added to cart:', product, 'Quantity:', quantity);
  };

  const handleAddToWishlist = () => {
    setIsInWishlist(!isInWishlist);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: product?.currency || 'USD',
    }).format(price);
  };

  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Product not found</h3>
            <p className="text-gray-600 mb-4">The product you&apos;re looking for doesn&apos;t exist.</p>
            <button
              onClick={() => router.push('/marketplace')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <Header />
      
      {/* Back Button */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      {/* Product Images */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-lg">
                <img
                                  src={product.images?.[selectedImage] || product.thumbnail || ''}
                alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Category and Vendor */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{product.category_name || 'General'}</span>
                <span>•</span>
                <span>{product.seller_name || 'Seller'}</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>

              {/* Price */}
              <div className="flex items-center gap-3">
                {product.isOnSale && product.originalPrice && product.originalPrice > (product.price || 0) && (
                  <span className="text-xl text-gray-500 line-through">
                    ${product.originalPrice}
                  </span>
                )}
                <span className="text-3xl font-bold text-gray-900">
                  ${product.price || product.price_cents / 100}
                </span>
                {product.isOnSale && product.originalPrice && product.originalPrice > (product.price || 0) && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                    -{Math.round(((product.originalPrice - (product.price || 0)) / product.originalPrice) * 100)}%
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">
                    {product.status === 'active' ? 'Available' : product.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>

              {/* Kosher Certification - Commented out as property doesn't exist in MarketplaceListing type */}
              {/* {product.kosherCertification && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">
                      {product.kosherCertification.agency} Certified
                    </div>
                    <div className="text-sm text-green-600">
                      {product.kosherCertification.level.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              )} */}

              {/* Dietary Info - Commented out as property doesn't exist in MarketplaceListing type */}
              {/* {product.dietaryInfo && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Dietary Information</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.dietaryInfo.isGlutenFree && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Gluten Free</span>
                    )}
                    {product.dietaryInfo.isDairyFree && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Dairy Free</span>
                    )}
                    {product.dietaryInfo.isVegan && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Vegan</span>
                    )}
                    {product.dietaryInfo.isVegetarian && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Vegetarian</span>
                    )}
                  </div>
                </div>
              )} */}

              {/* Quantity and Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="font-medium text-gray-900">Quantity:</label>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={product.status !== 'active'}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>
                  
                  <button
                    onClick={handleAddToWishlist}
                    className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Information - Commented out as vendor object doesn't exist in MarketplaceListing type */}
      {/* <div className="bg-white border-t border-gray-100 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vendor Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <img
                src={product.vendor.logo}
                alt={product.vendor.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{product.vendor.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{product.vendor.description}</p>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{product.vendor.rating}</span>
                  <span>({product.vendor.reviewCount} reviews)</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{product.vendor.address}, {product.vendor.city}, {product.vendor.state}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{product.vendor.phone}</span>
              </div>
              {product.vendor.website && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" />
                  <a href={product.vendor.website} className="text-blue-600 hover:underline">
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div> */}

      <BottomNavigation />
    </div>
  );
}
