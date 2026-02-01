"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { toast } from "sonner";

// Fallback image for broken or missing images
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&auto=format&fit=crop";

// Types
interface Destination {
  id: string;
  name: string;
  image: string;
  price: number;
  days: number;
  hotels: number;
  hasDiscount: boolean;
  region: "asia" | "europe" | "usa" | "africa";
}

interface TourPackage {
  id: string;
  title: string;
  price: number;
  days: number;
  rating: number;
  availability: string;
  description: string;
  images: string[];
}

interface FeaturedTour {
  id: string;
  title: string;
  location: string;
  image: string;
  originalPrice: number;
  price: number;
  duration: string;
  capacity: string;
  description: string;
  friendsCount: number;
  friendAvatars: string[];
}

// Sample Data
const destinations: Destination[] = [
  {
    id: "1",
    name: "Spain",
    image: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=400&auto=format&fit=crop",
    price: 1399,
    days: 4,
    hotels: 14,
    hasDiscount: true,
    region: "europe",
  },
  {
    id: "2",
    name: "Japan",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=400&auto=format&fit=crop",
    price: 1650,
    days: 7,
    hotels: 27,
    hasDiscount: true,
    region: "asia",
  },
  {
    id: "3",
    name: "Italy",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=400&auto=format&fit=crop",
    price: 1969,
    days: 6,
    hotels: 12,
    hasDiscount: true,
    region: "europe",
  },
  {
    id: "4",
    name: "Switzerland",
    image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=400&auto=format&fit=crop",
    price: 2000,
    days: 10,
    hotels: 22,
    hasDiscount: true,
    region: "europe",
  },
  {
    id: "5",
    name: "Thailand",
    image: "https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=400&auto=format&fit=crop",
    price: 1200,
    days: 5,
    hotels: 18,
    hasDiscount: false,
    region: "asia",
  },
  {
    id: "6",
    name: "Morocco",
    image: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=400&auto=format&fit=crop",
    price: 1450,
    days: 6,
    hotels: 15,
    hasDiscount: true,
    region: "africa",
  },
];

const tourPackages: TourPackage[] = [
  {
    id: "1",
    title: "Paradise in Bali",
    price: 1250,
    days: 6,
    rating: 4.9,
    availability: "All year-round",
    description: "Boutique villa accommodation, airport transfers, daily yoga classes, tra...",
    images: [
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?q=80&w=200&auto=format&fit=crop",
    ],
  },
  {
    id: "2",
    title: "Journey to Japan",
    price: 1659,
    days: 8,
    rating: 4.8,
    availability: "All year-round",
    description: "Culture lovers and foodies eager to explore Japan's heritage and cuisine...",
    images: [
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?q=80&w=200&auto=format&fit=crop",
    ],
  },
  {
    id: "3",
    title: "Greek Island Hopping",
    price: 1899,
    days: 10,
    rating: 4.7,
    availability: "May - October",
    description: "Explore the stunning Cyclades islands, from Santorini to Mykonos...",
    images: [
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?q=80&w=200&auto=format&fit=crop",
    ],
  },
];

const featuredTour: FeaturedTour = {
  id: "1",
  title: "Safari & Wildlife Adventure in Kenya",
  location: "Maasai Mara National Reserve, Kenya",
  image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=600&auto=format&fit=crop",
  originalPrice: 1959,
  price: 1659,
  duration: "7 days, 6 nights",
  capacity: "2 persons",
  description: "Embark on a once-in-a-lifetime safari adventure in the heart of Kenya's iconic Maasai Mara. Witness breath...",
  friendsCount: 6,
  friendAvatars: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=100&auto=format&fit=crop",
  ],
};

const regionFilters = [
  { id: "all", label: "All tours" },
  { id: "asia", label: "Asia" },
  { id: "europe", label: "Europe" },
  { id: "usa", label: "USA" },
  { id: "africa", label: "Africa" },
];

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 15,
    },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 15,
    },
  },
};

// Components
function DestinationCard({ destination, index }: { destination: Destination; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;

      gsap.to(card, {
        rotateX: rotateX,
        rotateY: rotateY,
        duration: 0.3,
        ease: "power2.out",
        transformPerspective: 1000,
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.5)",
      });
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleCardClick = () => {
    toast.info("🚀 We're finalizing this amazing trip! Stay tuned—we'll keep you posted on launch.", {
      duration: 4000,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      variants={itemVariants}
      whileHover={{ y: -8 }}
      onClick={handleCardClick}
      className="relative rounded-2xl overflow-hidden group cursor-pointer"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Image */}
      <div className="aspect-[4/5] relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={destination.image}
          alt={destination.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Partner Discount Badge */}
        {destination.hasDiscount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 + 0.5 }}
            className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs text-white/90"
          >
            <span>Partner discount</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        )}
        
        {/* Blue accent bar */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 origin-top"
        />
      </div>
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 + 0.4 }}
          className="text-xl font-semibold text-white mb-1"
        >
          {destination.name}
        </motion.h3>
        <p className="text-sm text-zinc-300">
          From <span className="text-white font-semibold">${destination.price}</span> / {destination.days} days
        </p>
        <p className="text-xs text-zinc-400 mt-1">{destination.hotels} recommended hotels</p>
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent" />
      </div>
    </motion.div>
  );
}

function TourPackageCard({ tour, index }: { tour: TourPackage; index: number }) {
  const handleCardClick = () => {
    toast.info("🚀 We're finalizing this amazing tour! Stay tuned—we'll keep you posted on launch.", {
      duration: 4000,
    });
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={handleCardClick}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="rounded-2xl bg-[#1a1a1d] border border-white/5 p-5 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{tour.title}</h3>
        <div className="text-right">
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.15 + 0.3, type: "spring" }}
            className="text-xl font-bold text-white"
          >
            ${tour.price}
          </motion.p>
          <p className="text-xs text-zinc-500">/{tour.days} days</p>
        </div>
      </div>
      
      {/* Rating & Availability */}
      <div className="flex items-center gap-3 mb-3">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-sm"
        >
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-white font-medium">{tour.rating}</span>
        </motion.div>
        <span className="px-2 py-1 rounded-md bg-white/5 text-sm text-zinc-400">{tour.availability}</span>
      </div>
      
      {/* Description */}
      <p className="text-sm text-zinc-400 mb-4">
        {tour.description}
        <button type="button" className="text-blue-400 hover:text-blue-300 ml-1 transition-colors">Read more</button>
      </p>
      
      {/* Images */}
      <div className="flex gap-2">
        {tour.images.map((img, idx) => (
          <motion.div
            key={img}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 + idx * 0.1 + 0.5 }}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            className="flex-1 aspect-[4/3] rounded-lg overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="w-full h-full object-cover" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function FeaturedTourCard({ tour }: { tour: FeaturedTour }) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleCardClick = () => {
    toast.info("🚀 We're finalizing this featured adventure! Stay tuned—we'll keep you posted on launch.", {
      duration: 4000,
    });
  };
  
  return (
    <motion.div
      variants={slideInRight}
      whileHover={{ y: -8 }}
      onClick={handleCardClick}
      className="rounded-3xl bg-[#1a1a1d] border border-white/5 overflow-hidden hover:border-blue-500/20 transition-all duration-500 cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tour.image} alt={tour.title} className="w-full h-full object-cover" />
        </motion.div>
        
        {/* Favorite Button */}
        <motion.button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={isFavorite ? { scale: [1, 1.3, 1] } : {}}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <svg className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </motion.button>

        {/* Discount Badge */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-green-500/90 backdrop-blur-sm text-xs font-medium text-white"
        >
          15% OFF
        </motion.div>
      </div>
      
      {/* Content */}
      <div className="p-5">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-white mb-2"
        >
          {tour.title}
        </motion.h3>
        
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{tour.location}</span>
        </div>
        
        {/* Friends */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex -space-x-2">
            {tour.friendAvatars.map((avatar, idx) => (
              <motion.div
                key={avatar}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1, type: "spring" }}
                whileHover={{ scale: 1.2, zIndex: 10 }}
                className="w-8 h-8 rounded-full border-2 border-[#1a1a1d] overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
              className="w-8 h-8 rounded-full border-2 border-[#1a1a1d] bg-blue-500 flex items-center justify-center text-xs font-medium text-white"
            >
              +2
            </motion.div>
          </div>
          <span className="text-sm text-zinc-400">{tour.friendsCount} friends been there</span>
        </div>
        
        {/* Description */}
        <p className="text-sm text-zinc-400 mb-4">
          {tour.description}
          <button type="button" className="text-blue-400 hover:text-blue-300 ml-1 transition-colors">Read more</button>
        </p>
        
        {/* Duration & Capacity */}
        <div className="flex gap-3 mb-5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 text-sm text-zinc-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{tour.duration}</span>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 text-sm text-zinc-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{tour.capacity}</span>
          </motion.div>
        </div>
        
        {/* Price */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-zinc-500 line-through">${tour.originalPrice}</span>
          <div>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-2xl font-bold text-white"
            >
              ${tour.price}
            </motion.span>
            <span className="text-sm text-zinc-500"> /person</span>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 rounded-xl border-2 border-blue-500 text-blue-500 font-semibold hover:bg-blue-500/10 transition-colors"
          >
            Learn more
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
          >
            Check dates
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function AIChatCard({ onExpand, onQuickAction }: { onExpand: () => void; onQuickAction: (action: string) => void }) {
  const [chatInput, setChatInput] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    // Floating animation for the card
    gsap.to(card, {
      y: -5,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  const quickActions = [
    { icon: "✈️", label: "Check flight status" },
    { icon: "🏨", label: "Recommend hotels" },
    { icon: "📅", label: "Build itinerary" },
    { icon: "💱", label: "Currency info" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onQuickAction(chatInput);
      setChatInput("");
    }
  };

  return (
    <motion.div
      ref={cardRef}
      variants={scaleVariants}
      className="relative rounded-3xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.4) 0%, rgba(196, 181, 253, 0.4) 50%, rgba(251, 207, 232, 0.4) 100%)' }}
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-40 h-40 bg-blue-300/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-300/30 rounded-full blur-3xl"
        />
      </div>

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/20" />
      
      <div className="relative p-6">
        {/* Top Icons */}
        <div className="flex justify-between items-start mb-6">
          <motion.div
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center shadow-lg"
          >
            <motion.svg
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-6 h-6 text-blue-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
            </motion.svg>
          </motion.div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onExpand}
            className="w-9 h-9 rounded-lg bg-white/30 flex items-center justify-center text-zinc-600 hover:bg-white/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </motion.button>
        </div>
        
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-5"
        >
          <h3 className="text-2xl font-semibold text-zinc-800">
            Hi I'm <motion.span
              animate={{ color: ["#2563eb", "#7c3aed", "#2563eb"] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-blue-600"
            >
              TravelAI
            </motion.span>,
          </h3>
          <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
            Your personal travel assistant — available 24/7 for any trip need, with instant smart suggestions.
          </p>
        </motion.div>
        
        {/* Quick Actions */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-wrap gap-2 mb-5"
        >
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              type="button"
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onQuickAction(action.label)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/70 text-sm text-zinc-700 hover:bg-white/90 hover:shadow-md transition-all"
            >
              <span>{action.icon}</span> {action.label}
            </motion.button>
          ))}
        </motion.div>
        
        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/80 border border-white/50 shadow-sm"
        >
          <motion.button
            type="button"
            whileHover={{ rotate: 90, scale: 1.2 }}
            onClick={onExpand}
            className="text-zinc-400 cursor-pointer hover:text-blue-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </motion.button>
          <input
            type="text"
            placeholder="Ask me anything.."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-zinc-500 hover:text-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}

export function TripPlanner() {
  const router = useRouter();
  const [activeRegion, setActiveRegion] = useState("all");
  const headerRef = useRef<HTMLDivElement>(null);

  const filteredDestinations = destinations.filter(
    (d) => activeRegion === "all" || d.region === activeRegion
  );

  const handleExpandChat = () => {
    router.push("/itinerary/chat");
  };

  const handleQuickAction = (action: string) => {
    // Store the message in sessionStorage so the chat page can pick it up
    sessionStorage.setItem("pendingChatMessage", action);
    router.push("/itinerary/chat");
  };

  useEffect(() => {
    // GSAP text animation for header
    if (headerRef.current) {
      const letters = headerRef.current.querySelectorAll('.animate-letter');
      gsap.fromTo(
        letters,
        { opacity: 0, y: 50, rotateX: -90 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          stagger: 0.05,
          duration: 0.8,
          ease: "back.out(1.7)",
        }
      );
    }
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Title */}
          <div ref={headerRef} className="flex items-start gap-4">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="w-2 h-28 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full origin-top"
            />
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white tracking-tight overflow-hidden">
                {"PLAN YOUR".split("").map((letter) => (
                  <span key={`plan-${letter}-${Math.random()}`} className="animate-letter inline-block" style={{ display: letter === " " ? "inline" : "inline-block" }}>
                    {letter === " " ? "\u00A0" : letter}
                  </span>
                ))}
              </h1>
              <h1 className="text-5xl lg:text-6xl font-bold text-white tracking-tight overflow-hidden">
                {"NEXT TRIP".split("").map((letter) => (
                  <span key={`next-${letter}-${Math.random()}`} className="animate-letter inline-block" style={{ display: letter === " " ? "inline" : "inline-block" }}>
                    {letter === " " ? "\u00A0" : letter}
                  </span>
                ))}
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-zinc-400 mt-4 text-lg"
              >
                Discover amazing destinations and create unforgettable memories
              </motion.p>
            </div>
          </div>
          
          {/* AI Chat Card */}
          <AIChatCard 
            onExpand={handleExpandChat} 
            onQuickAction={handleQuickAction} 
          />
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Destinations */}
        <motion.div variants={slideInLeft} className="lg:col-span-4">
          <div className="mb-6">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-semibold text-white mb-2"
            >
              Recommended
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-zinc-500"
            >
              Discover our handpicked selection of tours,<br />
              carefully chosen for your perfect getaway.
            </motion.p>
          </div>
          
          {/* Region Filters */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-wrap gap-2 mb-6"
          >
            {regionFilters.map((filter) => (
              <motion.button
                key={filter.id}
                type="button"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveRegion(filter.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeRegion === filter.id
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {filter.label}
              </motion.button>
            ))}
          </motion.div>
          
          {/* Destination Cards Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRegion}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={containerVariants}
              className="grid grid-cols-2 gap-4"
            >
              {filteredDestinations.slice(0, 4).map((destination, index) => (
                <DestinationCard key={destination.id} destination={destination} index={index} />
              ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Middle Column - Tour Packages */}
        <motion.div
          variants={containerVariants}
          className="lg:col-span-4 space-y-4"
        >
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-semibold text-white mb-4"
          >
            Popular Tours
          </motion.h2>
          {tourPackages.map((tour, index) => (
            <TourPackageCard key={tour.id} tour={tour} index={index} />
          ))}
        </motion.div>

        {/* Right Column - Featured Tour */}
        <div className="lg:col-span-4">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-2xl font-semibold text-white mb-4"
          >
            Featured Adventure
          </motion.h2>
          <FeaturedTourCard tour={featuredTour} />
        </div>
      </div>

      {/* My Itineraries Section */}
      <MyItineraries />
    </motion.div>
  );
}

// My Itineraries Section Component
function MyItineraries() {
  const router = useRouter();
  const [itineraries, setItineraries] = useState<Array<{
    id: string;
    slug: string;
    title: string;
    duration: string;
    dates: string;
    image: string;
    country: string;
    countryFlag: string;
    activities: number;
    status: "upcoming" | "planning" | "completed";
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's itineraries from the API
  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/itinerary/documents");
        
        if (!response.ok) {
          throw new Error("Failed to fetch itineraries");
        }
        
        const data = await response.json();
        
        // Transform API data to component format
        const transformedItineraries = (data.documents || []).map((doc: {
          id: string;
          slug: string;
          title: string;
          duration?: string;
          dates?: string;
          cover_image?: string;
          country?: string;
          country_flag?: string;
          destination?: string;
          days?: Array<{ activities?: unknown[] }>;
          status?: string;
        }) => {
          // Count total activities
          const totalActivities = doc.days?.reduce((sum: number, day: { activities?: unknown[] }) => 
            sum + (day.activities?.length || 0), 0) || 0;
          
          // Determine status based on dates or default to planning
          let status: "upcoming" | "planning" | "completed" = "planning";
          if (doc.status === "completed") {
            status = "completed";
          } else if (doc.dates && doc.dates !== "Flexible") {
            // If has specific dates, mark as upcoming
            status = "upcoming";
          }
          
          return {
            id: doc.id,
            slug: doc.slug || doc.id,
            title: doc.title,
            duration: doc.duration || `${doc.days?.length || 0} Days`,
            dates: doc.dates || "Flexible",
            image: doc.cover_image || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&auto=format&fit=crop`,
            country: doc.country || doc.destination?.split(",").pop()?.trim() || "Worldwide",
            countryFlag: doc.country_flag || "🌍",
            activities: totalActivities,
            status,
          };
        });
        
        setItineraries(transformedItineraries);
      } catch (err) {
        console.error("Error fetching itineraries:", err);
        setError("Failed to load itineraries");
      } finally {
        setIsLoading(false);
      }
    };

    fetchItineraries();
  }, []);

  const getStatusBadge = (status: "upcoming" | "planning" | "completed") => {
    const styles = {
      upcoming: "bg-green-500/20 text-green-400 border-green-500/30",
      planning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      completed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    };
    const labels = {
      upcoming: "Upcoming",
      planning: "Planning",
      completed: "Completed",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="mt-12"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">My Itineraries</h2>
          <p className="text-sm text-zinc-500">Your planned trips and adventures</p>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            // Scroll to top where the trip planner input is
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New
        </motion.button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden animate-pulse">
              <div className="h-40 bg-zinc-800" />
              <div className="p-4">
                <div className="h-6 bg-zinc-800 rounded w-3/4 mb-3" />
                <div className="h-4 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && itineraries.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No itineraries yet</h3>
          <p className="text-zinc-400 mb-4">Start planning your first adventure!</p>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            Plan a Trip
          </motion.button>
        </div>
      )}

      {/* Itineraries Grid */}
      {!isLoading && !error && itineraries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {itineraries.map((itinerary, index) => (
            <motion.div
              key={itinerary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => router.push(`/itinerary/${itinerary.slug}`)}
              className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden cursor-pointer hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
            >
              {/* Image */}
              <div className="relative h-40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={itinerary.image}
                  alt={itinerary.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== FALLBACK_IMAGE) {
                      target.src = FALLBACK_IMAGE;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  {getStatusBadge(itinerary.status)}
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
                  <span>{itinerary.countryFlag}</span>
                  <span>{itinerary.country}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">{itinerary.title}</h3>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{itinerary.dates}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{itinerary.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>{itinerary.activities} activities</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
