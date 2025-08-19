'use client';

import React from 'react';
import UnifiedCard, { CardData } from '@/components/ui/UnifiedCard';
import { MarketplaceListing } from '@/lib/types/marketplace';

interface ProductCardProps {
	product: MarketplaceListing;
	variant?: 'default' | 'compact' | 'featured';
	onAddToCart?: (product: MarketplaceListing) => void;
	onAddToWishlist?: (product: MarketplaceListing) => void;
	className?: string;
}

export default function ProductCard({ 
	product, 
	variant = 'default',
	onAddToCart,
	onAddToWishlist,
	className = ''
}: ProductCardProps) {
	// Convert MarketplaceListing to CardData format
	const cardData: CardData = {
		id: product.id,
		name: product.title || product.name || '',
		description: product.description,
		images: product.images,
		thumbnail: product.thumbnail,
		price: product.price,
		currency: product.currency,
		location: product.city ? `${product.city}${product.region ? `, ${product.region}` : ''}` : undefined,
		...product // Include any additional properties
	};

	// Create wrapper functions to convert CardData back to MarketplaceListing
	const handleAddToCart = onAddToCart ? (data: CardData) => onAddToCart(product) : undefined;
	const handleAddToWishlist = onAddToWishlist ? (data: CardData) => onAddToWishlist(product) : undefined;

	return (
		<UnifiedCard
			data={cardData}
			variant={variant}
			type="product"
			onAddToCart={handleAddToCart}
			onAddToWishlist={handleAddToWishlist}
			className={`product-card ${className}`}
			defaultImage="/images/default-product.webp"
			routePrefix="/marketplace/product"
		/>
	);
}
