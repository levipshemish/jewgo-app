'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { MarketplaceProduct } from '@/lib/types/marketplace';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { titleCase } from '@/lib/utils/stringUtils';
import Image from 'next/image';

interface ProductCardProps {
	product: MarketplaceProduct;
	variant?: 'default' | 'compact' | 'featured';
	onAddToCart?: (product: MarketplaceProduct) => void;
	onAddToWishlist?: (product: MarketplaceProduct) => void;
	className?: string;
}

export default function ProductCard({ 
	product, 
	variant = 'default',
	onAddToCart, // kept for API compatibility (unused in marketplace style)
	onAddToWishlist, // kept for API compatibility (unused in marketplace style)
	className = ''
}: ProductCardProps) {
	const router = useRouter();
	const [imageError, setImageError] = useState(false);
	const [imageLoading, setImageLoading] = useState(true);
	const { handleImmediateTouch, isMobile } = useMobileTouch();
	
	const isMobileDevice = isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);

	const handleProductClick = handleImmediateTouch(() => {
		router.push(`/marketplace/product/${product.id}`);
	});

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: product.currency,
		}).format(price);
	};

	const getHeroImage = () => {
		const imageUrl = product.images?.[0] || product.thumbnail || (product as any)?.productImage;
		if (!imageUrl || imageError) {
			return '/images/default-product.webp';
		}
		return imageUrl;
	};

	const handleImageLoad = () => setImageLoading(false);
	const handleImageError = () => {
		setImageError(true);
		setImageLoading(false);
	};

	// Use regular divs on mobile to avoid framer-motion conflicts
	const CardContainer = isMobileDevice ? 'div' : motion.div;
	const heroSrc = getHeroImage();

	// Shared image block (OfferUp/Facebook style)
	const ImageBlock = (
		<div className="relative aspect-[5/4] overflow-hidden rounded-3xl">
			{imageLoading && (
				<div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
					<div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
				</div>
			)}
			<Image
				src={heroSrc}
				alt={product.name}
				fill
				className={`object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
				onLoad={handleImageLoad}
				onError={handleImageError}
				sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
				unoptimized={heroSrc.includes('cloudinary.com')}
			/>

			{/* Price overlay (bottom-left) */}
			<div className="absolute bottom-2 left-2 bg-black/75 text-white px-2 py-1 rounded-md text-sm font-semibold">
				{formatPrice(product.price)}
			</div>

			{/* Discount badge (top-right) */}
			{product.isOnSale && product.discountPercentage ? (
				<div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-sm">
					-{product.discountPercentage}%
				</div>
			) : null}
		</div>
	);

	// Default and featured share the same marketplace style with slight padding differences
	if (variant === 'default' || variant === 'featured') {
		return (
			<CardContainer
				onClick={handleProductClick}
				className={`w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation product-card ${className}`}
				data-clickable="true"
				{...(isMobileDevice ? {} : {
					initial: { opacity: 0, scale: 0.95 },
					animate: { opacity: 1, scale: 1 },
					transition: { duration: 0.3, ease: 'easeOut' },
					whileHover: { scale: 1.02, transition: { duration: 0.2 } },
					whileTap: { scale: 0.98, transition: { duration: 0.1 } }
				})}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleProductClick(e as any);
					}
				}}
				aria-label={`View details for ${product.name}`}
				style={{
					WebkitTapHighlightColor: 'transparent',
					WebkitTouchCallout: 'none',
					WebkitUserSelect: 'none',
					userSelect: 'none',
					touchAction: 'manipulation',
					position: 'relative',
					zIndex: 1,
					...(isMobileDevice && { opacity: 1, transform: 'scale(1)' })
				}}
			>
				{ImageBlock}

				{/* Text content: title and location */}
				<div className={variant === 'featured' ? 'p-3' : 'p-2'}>
					<h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
						{titleCase(product.name)}
					</h3>
					<div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
						<MapPin className="w-3 h-3" />
						<span>
							{product.vendor?.city || ''}{product.vendor?.city && product.vendor?.state ? ', ' : ''}{product.vendor?.state || ''}
						</span>
					</div>
				</div>
			</CardContainer>
		);
	}

	// Compact variant: smaller padding and text
	if (variant === 'compact') {
		return (
			<div 
				onClick={handleProductClick}
				className={`bg-white rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
				role="button"
				tabIndex={0}
			>
				{ImageBlock}
				<div className="p-2">
					<h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
						{titleCase(product.name)}
					</h3>
					<div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
						<MapPin className="w-3 h-3" />
						<span>
							{product.vendor?.city || ''}{product.vendor?.city && product.vendor?.state ? ', ' : ''}{product.vendor?.state || ''}
						</span>
					</div>
				</div>
			</div>
		);
	}

	return null;
}
